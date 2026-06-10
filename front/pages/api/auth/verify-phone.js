import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const session = await getServerSession(req, res, authOptions);
  if (!session?.jwt) return res.status(401).json({ error: 'Не авторизован' });

  const { token, code } = req.body;
  const SECRET = process.env.NEXTAUTH_SECRET;

  try {
    const payload = jwt.verify(token, SECRET);
    const expectedHash = crypto.createHmac('sha256', SECRET).update(String(code)).digest('hex');
    if (expectedHash !== payload.codeHash) {
      return res.status(400).json({ error: 'Неверный код' });
    }

    const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/me/set-phone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.jwt}` },
      body: JSON.stringify({ phone: payload.phone }),
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      return res.status(500).json({ error: err?.error?.message || 'Ошибка сохранения телефона' });
    }
    return res.json({ ok: true });
  } catch {
    return res.status(400).json({ error: 'Недействительный или просроченный код' });
  }
}
