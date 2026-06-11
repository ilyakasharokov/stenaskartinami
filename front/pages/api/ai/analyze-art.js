import https from 'https';
import * as Sentry from '@sentry/nextjs';
import { getSession } from '@/lib/getSession';

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };

const AI_ERROR = 'Ошибка ИИ — заполните поля самостоятельно';
const DAILY_LIMIT = 5;

const rateLimits = new Map();
function today() { return new Date().toISOString().slice(0, 10); }
function getRemaining(userId) {
  const rec = rateLimits.get(String(userId));
  if (!rec || rec.date !== today()) return DAILY_LIMIT;
  return Math.max(0, DAILY_LIMIT - rec.count);
}
function consumeOne(userId) {
  const key = String(userId);
  const rec = rateLimits.get(key);
  if (!rec || rec.date !== today()) {
    rateLimits.set(key, { date: today(), count: 1 });
    return DAILY_LIMIT - 1;
  }
  rec.count++;
  return Math.max(0, DAILY_LIMIT - rec.count);
}

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
      method: 'POST',
      headers: {
        'Authorization': `Basic ${process.env.GIGACHAT_API_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'RqUID': crypto.randomUUID(),
      },
    },
    'scope=GIGACHAT_API_PERS'
  );
  if (r.status !== 200) throw new Error(`GigaChat auth: ${r.status} ${r.text.slice(0, 200)}`);
  return r.json().access_token;
}

async function uploadImageToGigaChat(token, imageBuffer) {
  const boundary = `----FormBoundary${Date.now()}`;
  const header = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="image.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`
  );
  const middle = Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="purpose"\r\n\r\ngeneral`);
  const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
  const body = Buffer.concat([header, imageBuffer, middle, footer]);

  const r = await httpsRequest(
    'https://gigachat.devices.sberbank.ru/api/v1/files',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
    },
    body
  );
  if (r.status !== 200) throw new Error(`GigaChat upload: ${r.status} ${r.text.slice(0, 200)}`);
  return r.json().id;
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const session = await getSession(req, res);
    if (!session?.jwt) return res.status(401).json({ error: 'Не авторизован' });
    return res.status(200).json({ remaining: getRemaining(session.id) });
  }

  if (req.method !== 'POST') return res.status(405).end();

  const session = await getSession(req, res);
  if (!session?.jwt) return res.status(401).json({ error: 'Не авторизован' });

  const remaining = getRemaining(session.id);
  if (remaining <= 0) return res.status(200).json({ _limitExceeded: true, remaining: 0 });

  const { imageDataUrl, availableStyles = [], availableSubjects = [], availableMediums = [] } = req.body;
  if (!imageDataUrl) return res.status(400).json({ error: 'imageDataUrl required' });

  const match = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return res.status(400).json({ error: 'Invalid image format' });
  const base64Data = match[2];

  try {
    const token = await getGigaChatToken();
    const imageBuffer = Buffer.from(base64Data, 'base64');
    const fileId = await uploadImageToGigaChat(token, imageBuffer);

    const prompt = `Проанализируй прикреплённую картину и верни ТОЛЬКО JSON (без пояснений и markdown) в формате:
{
  "style_names": ["выбери подходящие из списка: ${availableStyles.join(', ')}"],
  "subject_names": ["выбери подходящие из списка: ${availableSubjects.join(', ')}"],
  "medium_names": ["выбери подходящие из списка: ${availableMediums.join(', ')}"],
  "materials": "строка с материалами (например: холст, масло)",
  "description": "краткое описание работы (2-3 предложения на русском)"
}`;

    const chatBody = JSON.stringify({
      model: 'GigaChat-Pro',
      messages: [{ role: 'user', content: prompt, attachments: [fileId] }],
    });

    const r = await httpsRequest(
      'https://gigachat.devices.sberbank.ru/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
      chatBody
    );

    if (r.status !== 200) {
      const err = new Error(`GigaChat chat: ${r.status} ${r.text.slice(0, 200)}`);
      console.error('analyze-art error:', err.message);
      Sentry.captureException(err);
      return res.status(200).json({ _error: AI_ERROR, remaining });
    }

    const data = r.json();
    const raw = data.choices?.[0]?.message?.content || '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      const msg = `GigaChat returned no JSON. Raw: ${raw.slice(0, 300)}`;
      console.error('analyze-art:', msg);
      Sentry.captureMessage(msg);
      return res.status(200).json({ _error: AI_ERROR, remaining });
    }

    const newRemaining = consumeOne(session.id);
    return res.status(200).json({ ...JSON.parse(jsonMatch[0]), _remaining: newRemaining });
  } catch (err) {
    console.error('analyze-art exception:', err.message);
    Sentry.captureException(err);
    return res.status(200).json({ _error: AI_ERROR, remaining });
  }
}
