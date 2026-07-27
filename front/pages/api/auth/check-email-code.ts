import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const SECRET = process.env.NEXTAUTH_SECRET;

// Just validates OTP token + code, returns { email } on success.
// Does NOT log in or register — used to verify before saving email to existing account.
export default function handler(req, res) {
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

  return res.json({ ok: true, email: payload.email });
}
