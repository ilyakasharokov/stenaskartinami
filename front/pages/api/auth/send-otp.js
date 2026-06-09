import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const SECRET = process.env.NEXTAUTH_SECRET;
const SMSRU_API_KEY = process.env.SMSRU_API_KEY;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

function cleanPhone(phone) {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('8') && digits.length === 11) return '7' + digits.slice(1);
  return digits;
}

async function hasTelegram(phone) {
  if (!TELEGRAM_BOT_TOKEN) return false;
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      { method: 'GET' }
    );
    // We can't look up user by phone via Telegram Bot API — always use SMS
    return false;
  } catch {
    return false;
  }
}

async function sendSms(phone, code) {
  if (!SMSRU_API_KEY) throw new Error('SMS.ru API key not configured');
  const msg = encodeURIComponent(`Ваш код подтверждения: ${code}`);
  const url = `https://sms.ru/sms/send?api_id=${SMSRU_API_KEY}&to=${phone}&msg=${msg}&json=1`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status !== 'OK') throw new Error(data.status_text || 'SMS error');
  return data;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Укажите номер телефона' });

  const cleanedPhone = cleanPhone(phone);
  if (cleanedPhone.length < 10) {
    return res.status(400).json({ error: 'Неверный формат номера' });
  }

  const code = Math.floor(1000 + Math.random() * 9000).toString();
  const codeHash = crypto.createHmac('sha256', SECRET).update(code).digest('hex');

  try {
    await sendSms(cleanedPhone, code);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  // Signed token contains phone + hashed code, valid 10 min
  const token = jwt.sign({ phone: cleanedPhone, codeHash }, SECRET, { expiresIn: '10m' });
  return res.json({ token, phone: cleanedPhone });
}
