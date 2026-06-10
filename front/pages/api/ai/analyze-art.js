import https from 'https';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };

function httpsPost(url, headers, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
    const req = https.request(
      {
        hostname: u.hostname,
        port: u.port || 443,
        path: u.pathname + u.search,
        method: 'POST',
        headers: { ...headers, 'Content-Length': Buffer.byteLength(bodyStr) },
        rejectUnauthorized: false,
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString();
          resolve({ status: res.statusCode, text, json: () => JSON.parse(text) });
        });
      }
    );
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

async function getGigaChatToken() {
  const r = await httpsPost(
    'https://ngw.devices.sberbank.ru:9443/api/v2/oauth',
    {
      'Authorization': `Basic ${process.env.GIGACHAT_API_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'RqUID': crypto.randomUUID(),
    },
    'scope=GIGACHAT_API_PERS'
  );
  if (r.status !== 200) throw new Error(`GigaChat auth failed: ${r.status} ${r.text}`);
  return r.json().access_token;
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

    const r = await httpsPost(
      'https://gigachat.devices.sberbank.ru/api/v1/chat/completions',
      {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      {
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
      }
    );

    if (r.status !== 200) throw new Error(`GigaChat error: ${r.status} ${r.text}`);

    const data = r.json();
    const text = data.choices?.[0]?.message?.content || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(200).json({});

    return res.status(200).json(JSON.parse(jsonMatch[0]));
  } catch (err) {
    console.error('AI analyze error:', err?.message);
    return res.status(500).json({ error: err?.message || 'Ошибка анализа изображения' });
  }
}
