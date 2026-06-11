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

async function callYandexArt(prompt) {
  const YC_API_KEY = process.env.YC_API_KEY;
  const YC_FOLDER_ID = process.env.YC_FOLDER_ID;
  if (!YC_API_KEY || !YC_FOLDER_ID) throw new Error('YC_API_KEY / YC_FOLDER_ID not configured');

  // Step 1: start async generation
  const startRes = await fetch(
    'https://llm.api.cloud.yandex.net/foundationModels/v1/imageGenerationAsync',
    {
      method: 'POST',
      headers: {
        'Authorization': `Api-Key ${YC_API_KEY}`,
        'x-folder-id': YC_FOLDER_ID,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        modelUri: `art://${YC_FOLDER_ID}/yandex-art/latest`,
        generationOptions: {
          seed: String(Math.floor(Math.random() * 1e9)),
          aspectRatio: { widthRatio: '16', heightRatio: '9' },
        },
        messages: [{ weight: '1', text: prompt }],
      }),
    }
  );
  if (!startRes.ok) {
    const t = await startRes.text();
    throw new Error(`YandexART start: ${startRes.status} ${t.slice(0, 200)}`);
  }
  const { id: operationId } = await startRes.json();

  // Step 2: poll until done (max ~60 sec)
  for (let attempt = 0; attempt < 30; attempt++) {
    await new Promise(r => setTimeout(r, 2000));
    const pollRes = await fetch(
      `https://llm.api.cloud.yandex.net/operations/${operationId}`,
      { headers: { 'Authorization': `Api-Key ${YC_API_KEY}` } }
    );
    if (!pollRes.ok) continue;
    const op = await pollRes.json();
    if (op.done) {
      const b64 = op.response?.image;
      if (!b64) throw new Error('YandexART returned no image');
      return b64; // base64 string
    }
  }
  throw new Error('YandexART timed out');
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
    const imageBase64 = await callYandexArt(prompt);
    const newRemaining = consumeOne(session.id);
    return res.status(200).json({ image: imageBase64, remaining: newRemaining });
  } catch (err) {
    console.error('generate-interior error:', err.message);
    return res.status(200).json({ _error: 'Ошибка генерации — попробуйте ещё раз', remaining });
  }
}
