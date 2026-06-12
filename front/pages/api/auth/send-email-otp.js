import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';

const SECRET = process.env.NEXTAUTH_SECRET;

function createTransport() {
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { email } = req.body;
  if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
    return res.status(400).json({ error: 'Укажите корректный email' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const code = Math.floor(1000 + Math.random() * 9000).toString();
  const codeHash = crypto.createHmac('sha256', SECRET).update(code).digest('hex');
  const token = jwt.sign({ email: normalizedEmail, codeHash }, SECRET, { expiresIn: '10m' });

  const transport = createTransport();

  if (transport) {
    try {
      await transport.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: normalizedEmail,
        subject: 'Код подтверждения — Стена с картинами',
        text: `Ваш код подтверждения: ${code}\n\nКод действителен 10 минут.`,
        html: `
          <div style="font-family:sans-serif;max-width:420px;margin:0 auto">
            <h2 style="color:#dc3a0f;margin-bottom:8px">Стена с картинами</h2>
            <p style="color:#555;margin-bottom:24px">Код для входа:</p>
            <div style="font-size:36px;font-weight:700;letter-spacing:12px;color:#111;padding:20px;background:#f5f5f3;border-radius:10px;text-align:center">${code}</div>
            <p style="color:#999;font-size:13px;margin-top:20px">Код действителен 10 минут. Если вы не запрашивали код — просто проигнорируйте это письмо.</p>
          </div>
        `,
      });
    } catch (err) {
      console.error('Email send error:', err.message);
      return res.status(500).json({ error: 'Не удалось отправить письмо. Проверьте адрес почты.' });
    }
  } else {
    // Dev mode: log code to console
    console.log(`[DEV] Email OTP for ${normalizedEmail}: ${code}`);
  }

  return res.json({ token });
}
