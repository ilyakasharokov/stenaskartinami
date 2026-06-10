import * as Sentry from '@sentry/nextjs';
import { getSession } from '@/lib/getSession';

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };

const AI_ERROR = 'Ошибка ИИ — заполните поля самостоятельно';
const DAILY_LIMIT = 5;

// In-memory rate limiter: userId -> { date: 'YYYY-MM-DD', count }
const rateLimits = new Map();

function today() {
  return new Date().toISOString().slice(0, 10);
}

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
  if (remaining <= 0) {
    return res.status(200).json({ _limitExceeded: true, remaining: 0 });
  }

  const { imageDataUrl } = req.body;
  if (!imageDataUrl) return res.status(400).json({ error: 'imageDataUrl required' });

  const match = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return res.status(400).json({ error: 'Invalid image format' });
  const base64Data = match[2];

  try {
    const response = await fetch(
      'https://ai.api.cloud.yandex.net/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Api-Key ${process.env.YC_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: `gpt://${process.env.YC_FOLDER_ID}/qwen3.6-35b-a3b`,
          temperature: 0.6,
          max_tokens: 3000,
          messages: [
            {
              role: 'system',
              content: '/nothink',
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Проанализируй прикреплённую картину и верни ТОЛЬКО JSON (без пояснений и markdown) в формате:
{
  "title": "возможное название работы (кратко, 2-5 слов)",
  "style_names": ["один или несколько стилей из списка: Реализм, Абстракционизм, Наивное искусство, Концептуализм, Иллюстрация, Pop Art, Импрессионизм, Экспрессионизм, Сюрреализм, Минимализм"],
  "subject_names": ["тематики из списка: Абстракция, Животные, Город, Люди, Пейзаж, Портрет, Натюрморт, Интерьер, Любовь, История, Мистика"],
  "medium_names": ["техники из списка: Акрил, Акварель, Масло, Гуашь, Карандаш, Пастель, Маркер, Коллаж, Аэрозоль"],
  "materials": "строка с материалами (например: холст, масло)",
  "description": "краткое описание работы (2-3 предложения на русском)"
}`,
                },
                { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Data}` } },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      const err = new Error(`Yandex AI ${response.status}: ${errText}`);
      Sentry.captureException(err);
      return res.status(200).json({ _error: AI_ERROR, remaining });
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || '';
    const text = raw.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      Sentry.captureMessage(`AI returned no JSON. Raw: ${text.slice(0, 500)}`);
      return res.status(200).json({ _error: AI_ERROR, remaining });
    }

    const newRemaining = consumeOne(session.id);
    return res.status(200).json({ ...JSON.parse(jsonMatch[0]), _remaining: newRemaining });
  } catch (err) {
    Sentry.captureException(err);
    return res.status(200).json({ _error: AI_ERROR, remaining });
  }
}
