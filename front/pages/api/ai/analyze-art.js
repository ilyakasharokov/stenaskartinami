import * as Sentry from '@sentry/nextjs';
import { getSession } from '@/lib/getSession';

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };

const AI_ERROR = 'Ошибка ИИ — заполните поля самостоятельно';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const session = await getSession(req, res);
  if (!session?.jwt) return res.status(401).json({ error: 'Не авторизован' });

  const { imageDataUrl } = req.body;
  if (!imageDataUrl) return res.status(400).json({ error: 'imageDataUrl required' });

  const match = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return res.status(400).json({ error: 'Invalid image format' });
  const base64Data = match[2];

  try {
    const response = await fetch(
      'https://ai.api.cloud.yandex.net/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Api-Key ${process.env.YC_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: `gpt://${process.env.YC_FOLDER_ID}/qwen3.6-35b-a3b`,
          temperature: 0.6,
          max_tokens: 3000,
          messages: [
            {
              role: 'system',
              content: '/nothink',
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Проанализируй прикреплённую картину и верни ТОЛЬКО JSON (без пояснений и markdown) в формате:
{
  "title": "возможное название работы (кратко, 2-5 слов)",
  "style_names": ["один или несколько стилей из списка: Реализм, Абстракционизм, Наивное искусство, Концептуализм, Иллюстрация, Pop Art, Импрессионизм, Экспрессионизм, Сюрреализм, Минимализм"],
  "subject_names": ["тематики из списка: Абстракция, Животные, Город, Люди, Пейзаж, Портрет, Натюрморт, Интерьер, Любовь, История, Мистика"],
  "medium_names": ["техники из списка: Акрил, Акварель, Масло, Гуашь, Карандаш, Пастель, Маркер, Коллаж, Аэрозоль"],
  "materials": "строка с материалами (например: холст, масло)",
  "description": "краткое описание работы (2-3 предложения на русском)"
}`,
                },
                { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Data}` } },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      const err = new Error(`Yandex AI ${response.status}: ${errText}`);
      Sentry.captureException(err);
      return res.status(200).json({ _error: AI_ERROR });
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || '';
    const text = raw.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      Sentry.captureMessage(`AI returned no JSON. Raw: ${text.slice(0, 500)}`);
      return res.status(200).json({ _error: AI_ERROR });
    }

    return res.status(200).json(JSON.parse(jsonMatch[0]));
  } catch (err) {
    Sentry.captureException(err);
    return res.status(200).json({ _error: AI_ERROR });
  }
}
