import https from 'https';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };

function httpsRequest(url, options, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request(
      {
        hostname: u.hostname,
        port: u.port || 443,
        path: u.pathname + u.search,
        method: options.method || 'POST',
        headers: { ...options.headers, 'Content-Length': Buffer.byteLength(body) },
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
    req.write(body);
    req.end();
  });
}

async function getGigaChatToken() {
  const r = await httpsRequest(
    'https://ngw.devices.sberbank.ru:9443/api/v2/oauth',
    {
      headers: {
        'Authorization': `Basic ${process.env.GIGACHAT_API_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'RqUID': crypto.randomUUID(),
      },
    },
    'scope=GIGACHAT_API_PERS'
  );
  if (r.status !== 200) throw new Error(`GigaChat auth failed: ${r.status} ${r.text}`);
  return r.json().access_token;
}

async function uploadImage(token, imageBuffer) {
  const boundary = `----FormBoundary${Date.now()}`;
  const header = Buffer.from(
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="file"; filename="image.jpg"\r\n` +
    `Content-Type: image/jpeg\r\n\r\n`
  );
  const middle = Buffer.from(
    `\r\n--${boundary}\r\n` +
    `Content-Disposition: form-data; name="purpose"\r\n\r\n` +
    `general`
  );
  const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
  const body = Buffer.concat([header, imageBuffer, middle, footer]);

  const r = await httpsRequest(
    'https://gigachat.devices.sberbank.ru/api/v1/files',
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
    },
    body
  );
  if (r.status !== 200) throw new Error(`GigaChat upload failed: ${r.status} ${r.text}`);
  return r.json().id;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const session = await getServerSession(req, res, authOptions);
  if (!session?.jwt) return res.status(401).json({ error: 'Не авторизован' });

  const { imageDataUrl } = req.body;
  if (!imageDataUrl) return res.status(400).json({ error: 'imageDataUrl required' });

  const match = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return res.status(400).json({ error: 'Invalid image format' });
  const base64Data = match[2];

  try {
    const token = await getGigaChatToken();

    const imageBuffer = Buffer.from(base64Data, 'base64');
    const fileId = await uploadImage(token, imageBuffer);

    const chatBody = JSON.stringify({
      model: 'GigaChat-Pro',
      messages: [
        {
          role: 'user',
          content: `Проанализируй прикреплённую картину и верни ТОЛЬКО JSON (без пояснений и markdown) в формате:
{
  "title": "возможное название работы (кратко, 2-5 слов)",
  "style": "художественный стиль (например: импрессионизм, реализм, абстракция)",
  "subject": "тематика (например: пейзаж, портрет, натюрморт)",
  "materials": "возможные материалы (например: масло, холст или акварель, бумага)",
  "description": "краткое описание работы (2-3 предложения на русском)"
}`,
          attachments: [fileId],
        },
      ],
    });

    const r = await httpsRequest(
      'https://gigachat.devices.sberbank.ru/api/v1/chat/completions',
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
      chatBody
    );

    if (r.status !== 200) throw new Error(`GigaChat chat failed: ${r.status} ${r.text}`);

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
