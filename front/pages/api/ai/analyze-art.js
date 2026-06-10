import Anthropic from '@anthropic-ai/sdk';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const session = await getServerSession(req, res, authOptions);
  if (!session?.jwt) return res.status(401).json({ error: 'Не авторизован' });

  const { imageDataUrl } = req.body;
  if (!imageDataUrl) return res.status(400).json({ error: 'imageDataUrl required' });

  const match = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return res.status(400).json({ error: 'Invalid image format' });

  const [, mediaType, base64Data] = match;

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64Data },
            },
            {
              type: 'text',
              text: `Проанализируй эту картину и верни JSON (только JSON, без пояснений) в формате:
{
  "title": "возможное название работы (кратко, 2-5 слов)",
  "style": "художественный стиль (например: импрессионизм, реализм, абстракция, портрет)",
  "subject": "тематика (например: пейзаж, портрет, натюрморт, городской пейзаж)",
  "materials": "возможные материалы (например: масло, холст или акварель, бумага)",
  "description": "краткое описание работы (2-3 предложения на русском)"
}`,
            },
          ],
        },
      ],
    });

    const text = response.content[0]?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(200).json({});

    const suggestions = JSON.parse(jsonMatch[0]);
    return res.status(200).json(suggestions);
  } catch (err) {
    console.error('AI analyze error:', err);
    return res.status(500).json({ error: 'Ошибка анализа изображения' });
  }
}
