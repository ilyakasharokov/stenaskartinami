import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { otpEmailHtml } from '@/utils/email-template';

const SECRET = process.env.NEXTAUTH_SECRET;

// Singleton — one persistent connection pool for the lifetime of the process
let _transport = null;
function getTransport() {
  if (_transport) return _transport;
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  _transport = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    pool: true,       // keep connections alive, reuse them
    maxConnections: 3,
    socketTimeout: 10000,
  });
  return _transport;
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

  const transport = getTransport();

  if (transport) {
    // Respond immediately — send email in background so client doesn't wait
    res.json({ token });

    transport.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: normalizedEmail,
      subject: 'Код подтверждения — Стена с картинами',
      text: `Ваш код подтверждения: ${code}\n\nКод действителен 10 минут.`,
      html: otpEmailHtml(code),
    }).catch(err => {
      console.error('[email-otp] send error:', err.message);
    });
  } else {
    console.log(`[DEV] Email OTP for ${normalizedEmail}: ${code}`);
    res.json({ token });
  }
}
