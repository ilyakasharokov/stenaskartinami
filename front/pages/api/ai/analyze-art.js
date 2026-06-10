import https from 'https';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };

// GigaChat uses a self-signed CA — disable verification only for their endpoints
const agent = new https.Agent({ rejectUnauthorized: false });

async function getGigaChatToken() {
  const res = await fetch('https://ngw.devices.sberbank.ru:9443/api/v2/oauth', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${process.env.GIGACHAT_API_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'RqUID': crypto.randomUUID(),
    },
    body: 'scope=GIGACHAT_API_PERS',
    // @ts-ignore
    agent,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GigaChat auth failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  return data.access_token;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const session = await getServerSession(req, res, authOptions);
  if (!session?.jwt) return res.status(401).json({ error: 'Не авторизован' });

  const { imageDataUrl } = req.body;
  if (!imageDataUrl) return res.status(400).json({ error: 'imageDataUrl required' });

  const match = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return res.status(400).json({ error: 'Invalid image format' });
  const [, , base64Data] = match;

  try {
    const token = await getGigaChatToken();

    const chatRes = await fetch('https://gigachat.devices.sberbank.ru/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'GigaChat-Pro',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: `data:image/jpeg;base64,${base64Data}` },
              },
              {
                type: 'text',
                text: `Проанализируй эту картину и верни ТОЛЬКО JSON (без пояснений и markdown) в формате:
{
  "title": "возможное название работы (кратко, 2-5 слов)",
  "style": "художественный стиль (например: импрессионизм, реализм, абстракция)",
  "subject": "тематика (например: пейзаж, портрет, натюрморт)",
  "materials": "возможные материалы (например: масло, холст или акварель, бумага)",
  "description": "краткое описание работы (2-3 предложения на русском)"
}`,
              },
            ],
          },
        ],
      }),
      // @ts-ignore
      agent,
    });

    if (!chatRes.ok) {
      const text = await chatRes.text();
      throw new Error(`GigaChat chat failed: ${chatRes.status} ${text}`);
    }

    const data = await chatRes.json();
    const text = data.choices?.[0]?.message?.content || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(200).json({});

    const suggestions = JSON.parse(jsonMatch[0]);
    return res.status(200).json(suggestions);
  } catch (err) {
    console.error('AI analyze error:', err?.message);
    return res.status(500).json({ error: err?.message || 'Ошибка анализа изображения' });
  }
}
