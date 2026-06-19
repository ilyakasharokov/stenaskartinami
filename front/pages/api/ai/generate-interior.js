import { getSession } from '@/lib/getSession';

export const config = { api: { bodyParser: true } };

const DAILY_LIMIT = 5;
const rateLimits = new Map();

function today() { return new Date().toISOString().slice(0, 10) }

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

function buildPrompt({ title, styles, materials, description }) {
  let parts = ['картина']
  if (title) parts.push(`"${title}"`)
  if (styles) parts.push(`в стиле ${styles}`)
  if (materials) parts.push(`выполненная в технике ${materials}`)
  const painting = parts.join(' ')

  return `Профессиональная интерьерная фотография. Светлая современная гостиная с белыми стенами, мягкой мебелью и живыми растениями. В центре на стене висит ${painting}. ${description ? 'На картине: ' + description.slice(0, 120) + '.' : ''} Тёплый естественный свет из окна. Реалистичная фотосъёмка интерьера, высокое качество, без текста и водяных знаков.`
}

async function callDallE(prompt) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-image-1',
      prompt,
      n: 1,
      size: '1536x1024',
      quality: 'medium',
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`gpt-image-1: ${res.status} ${t.slice(0, 200)}`);
  }
  const json = await res.json();
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) throw new Error('gpt-image-1 returned no image');
  return b64;
}

export default async function handler(req, res) {
  const session = await getSession(req, res);
  if (!session?.jwt) return res.status(401).json({ error: 'Не авторизован' });
  if (!session.info?.isModerator) return res.status(403).json({ error: 'Доступ запрещён' });

  if (req.method === 'GET') {
    return res.status(200).json({ remaining: getRemaining(session.id) });
  }
  if (req.method !== 'POST') return res.status(405).end();

  const remaining = getRemaining(session.id);
  if (remaining <= 0) return res.status(200).json({ _limitExceeded: true, remaining: 0 });

  const { title = '', styles = '', materials = '', description = '' } = req.body;

  try {
    const prompt = buildPrompt({ title, styles, materials, description });
    const imageBase64 = await callDallE(prompt);
    const newRemaining = consumeOne(session.id);
    return res.status(200).json({ image: imageBase64, remaining: newRemaining });
  } catch (err) {
    console.error('generate-interior error:', err.message);
    return res.status(200).json({ _error: 'Ошибка генерации — попробуйте ещё раз', remaining });
  }
}
