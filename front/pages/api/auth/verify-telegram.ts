import crypto from 'crypto';

const SECRET = process.env.NEXTAUTH_SECRET;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const STRAPI = process.env.NEXT_PUBLIC_API_URL;

function verifyTelegramHash(data) {
  const { hash, ...rest } = data;
  const dataCheckString = Object.entries(rest)
    .filter(([, v]) => v !== undefined && v !== null)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  const secretKey = crypto.createHash('sha256').update(BOT_TOKEN).digest();
  const hmac = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  return hmac === hash;
}

function tgEmail(id) {
  return `tg_${id}@tg.stenaskartinami.com`;
}

function tgPassword(id) {
  return crypto.createHmac('sha256', SECRET).update('telegram:' + id).digest('hex');
}

async function strapiRegisterOrLogin(tgData) {
  const email = tgEmail(tgData.id);
  const password = tgPassword(tgData.id);
  const username = tgData.username || tgData.first_name || `tg_${tgData.id}`;

  const regRes = await fetch(`${STRAPI}/auth/local/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  });
  const regData = await regRes.json();
  if (regData.jwt) return regData;

  const loginRes = await fetch(`${STRAPI}/auth/local`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: email, password }),
  });
  const loginData = await loginRes.json();
  if (loginData.jwt) return loginData;

  throw new Error(loginData?.error?.message || 'Ошибка входа через Telegram');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const tgData = req.body;
  if (!tgData?.hash) return res.status(400).json({ error: 'Нет данных Telegram' });

  if (!BOT_TOKEN) return res.status(500).json({ error: 'Telegram bot не настроен' });

  // Check auth_date freshness (5 min)
  const age = Math.floor(Date.now() / 1000) - parseInt(tgData.auth_date);
  if (age > 300) return res.status(400).json({ error: 'Данные Telegram устарели' });

  if (!verifyTelegramHash(tgData)) {
    return res.status(400).json({ error: 'Подпись Telegram не прошла проверку' });
  }

  try {
    const data = await strapiRegisterOrLogin(tgData);
    return res.json({ jwt: data.jwt, user: data.user });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
