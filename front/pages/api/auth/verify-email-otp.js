import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const SECRET = process.env.NEXTAUTH_SECRET;
const STRAPI = process.env.STRAPI_SERVER_URL || process.env.NEXT_PUBLIC_API_URL;

function emailPassword(email) {
  return crypto.createHmac('sha256', SECRET).update('email-otp:' + email).digest('hex');
}

function emailUsername(email) {
  return email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 20);
}

async function strapiRegisterOrLogin(email, password) {
  const username = emailUsername(email);

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

  throw new Error(loginData?.error?.message || 'Ошибка входа');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { token, code } = req.body;
  if (!token || !code) return res.status(400).json({ error: 'Неверный запрос' });

  let payload;
  try {
    payload = jwt.verify(token, SECRET);
  } catch {
    return res.status(400).json({ error: 'Код истёк. Запросите новый.' });
  }

  const codeHash = crypto.createHmac('sha256', SECRET).update(code.trim()).digest('hex');
  if (codeHash !== payload.codeHash) {
    return res.status(400).json({ error: 'Неверный код' });
  }

  try {
    const password = emailPassword(payload.email);
    const data = await strapiRegisterOrLogin(payload.email, password);
    return res.json({ jwt: data.jwt, user: data.user });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
