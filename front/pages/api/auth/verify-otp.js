import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const SECRET = process.env.NEXTAUTH_SECRET;
const STRAPI = process.env.NEXT_PUBLIC_API_URL;

function phoneEmail(phone) {
  return `${phone}@phone.stenaskartinami.com`;
}

function phonePassword(phone) {
  return crypto.createHmac('sha256', SECRET).update('phone:' + phone).digest('hex');
}

async function strapiRegisterOrLogin(phone, username) {
  const email = phoneEmail(phone);
  const password = phonePassword(phone);

  // Try register first
  const regRes = await fetch(`${STRAPI}/auth/local/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: username || phone, email, password }),
  });
  const regData = await regRes.json();
  if (regData.jwt) return regData;

  // User exists — login
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

  const { token, code, username } = req.body;
  if (!token || !code) return res.status(400).json({ error: 'Неверный запрос' });

  let payload;
  try {
    payload = jwt.verify(token, SECRET);
  } catch {
    return res.status(400).json({ error: 'Код истёк. Запросите новый.' });
  }

  const codeHash = crypto.createHmac('sha256', SECRET).update(code).digest('hex');
  if (codeHash !== payload.codeHash) {
    return res.status(400).json({ error: 'Неверный код' });
  }

  try {
    const data = await strapiRegisterOrLogin(payload.phone, username);
    return res.json({ jwt: data.jwt, user: data.user });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
