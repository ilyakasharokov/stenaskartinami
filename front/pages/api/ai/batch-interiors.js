import { getSession } from '@/lib/getSession'
import { createHmac } from 'crypto'

export const config = { api: { bodyParser: false, responseLimit: false } }

const STRAPI_URL = process.env.STRAPI_SERVER_URL?.replace('/api', '') || 'http://api-v5:1337'
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const JWT_SECRET = process.env.JWT_SECRET
const DB_CONFIG = {
  host: process.env.DATABASE_HOST || 'postgres',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  database: process.env.DATABASE_NAME || 'stenaskartinami',
  user: process.env.DATABASE_USERNAME || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres',
}

function buildStrapiJWT(userId) {
  const enc = s => Buffer.from(JSON.stringify(s)).toString('base64url')
  const h = enc({ alg: 'HS256', typ: 'JWT' })
  const b = enc({ id: userId, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 })
  const sig = createHmac('sha256', JWT_SECRET).update(`${h}.${b}`).digest('base64url')
  return `${h}.${b}.${sig}`
}

function buildPrompt(art) {
  const parts = ['картина']
  if (art.title) parts.push(`"${art.title}"`)
  if (art.styles?.length) parts.push(`в стиле ${art.styles.filter(Boolean).join(', ')}`)
  if (art.materials) parts.push(`выполненная в технике ${art.materials}`)
  return `Профессиональная интерьерная фотография. Современная гостиная со светлыми стенами, стильной мебелью и растениями. В центре на стене висит ${parts.join(' ')}. Тёплый мягкий свет. Реалистичная фотосъёмка, высокое качество, без текста и водяных знаков.`
}

async function generateImage(prompt) {
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-image-1', prompt, n: 1, size: '1536x1024', quality: 'medium' }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `OpenAI ${res.status}`)
  }
  const json = await res.json()
  const b64 = json.data?.[0]?.b64_json
  if (!b64) throw new Error('No image in OpenAI response')
  return b64
}

async function uploadAndLink(b64, artId, artTitle, strapiJWT, pg) {
  const { default: FormData } = await import('form-data')
  const buf = Buffer.from(b64, 'base64')
  const form = new FormData()
  form.append('files', buf, { filename: `interior_${artId}_${Date.now()}.png`, contentType: 'image/png' })
  form.append('fileInfo', JSON.stringify({ alternativeText: `Интерьер: ${artTitle}` }))

  const upRes = await fetch(`${STRAPI_URL}/api/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${strapiJWT}`, ...form.getHeaders() },
    body: form,
  })
  if (!upRes.ok) throw new Error(`Upload failed: ${upRes.status}`)
  const [file] = await upRes.json()

  await pg.query(
    `DELETE FROM files_related_mph WHERE related_id=$1 AND related_type='api::art.art' AND field='interior_photo'`,
    [artId]
  )
  await pg.query(
    `INSERT INTO files_related_mph (file_id, related_id, related_type, field, "order") VALUES ($1,$2,'api::art.art','interior_photo',1)`,
    [file.id, artId]
  )
  return file
}

function send(res, data) {
  res.write(`data: ${JSON.stringify(data)}\n\n`)
}

export default async function handler(req, res) {
  const session = await getSession(req, res)
  if (!session?.jwt) return res.status(401).json({ error: 'Не авторизован' })
  if (!session.info?.isModerator) return res.status(403).json({ error: 'Доступ запрещён' })
  if (!OPENAI_API_KEY) return res.status(500).json({ error: 'OPENAI_API_KEY не настроен' })
  if (req.method !== 'POST') return res.status(405).end()

  const url = new URL(req.url, 'http://localhost')
  const limit = parseInt(url.searchParams.get('limit') || '0') || Infinity
  const artId = url.searchParams.get('artId') ? parseInt(url.searchParams.get('artId')) : null

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  const { default: pg } = await import('pg')
  const client = new pg.Client(DB_CONFIG)
  await client.connect()

  try {
    let artsQuery
    if (artId) {
      artsQuery = await client.query(`
        SELECT a.id, a.title, a.materials,
          array_agg(DISTINCT s.title) FILTER (WHERE s.title IS NOT NULL AND s.published_at IS NOT NULL) as styles
        FROM arts a
        LEFT JOIN arts_styles_lnk asl ON asl.art_id = a.id
        LEFT JOIN styles s ON s.id = asl.style_id
        WHERE a.id = $1 AND a.published_at IS NOT NULL
        GROUP BY a.id, a.title, a.materials
      `, [artId])
    } else {
      artsQuery = await client.query(`
        SELECT a.id, a.title, a.materials,
          array_agg(DISTINCT s.title) FILTER (WHERE s.title IS NOT NULL AND s.published_at IS NOT NULL) as styles
        FROM arts a
        LEFT JOIN arts_styles_lnk asl ON asl.art_id = a.id
        LEFT JOIN styles s ON s.id = asl.style_id
        WHERE a.published_at IS NOT NULL AND a.title IS NOT NULL AND a.title != ''
          AND EXISTS (SELECT 1 FROM arts_wall_lnk awl WHERE awl.art_id = a.id)
          AND NOT EXISTS (
            SELECT 1 FROM files_related_mph frm
            WHERE frm.related_id = a.id AND frm.related_type = 'api::art.art' AND frm.field = 'interior_photo'
          )
        GROUP BY a.id, a.title, a.materials
        ORDER BY a.id ASC
      `)
    }

    const arts = limit < Infinity ? artsQuery.rows.slice(0, limit) : artsQuery.rows
    send(res, { type: 'start', total: arts.length })

    if (arts.length === 0) {
      send(res, { type: 'done', ok: 0, failed: 0 })
      res.end(); return
    }

    const strapiJWT = buildStrapiJWT(session.info?.strapiUserId || 946)
    let ok = 0, failed = 0

    for (let i = 0; i < arts.length; i++) {
      const art = arts[i]
      send(res, { type: 'progress', index: i + 1, total: arts.length, artId: art.id, title: art.title })

      try {
        const prompt = buildPrompt(art)
        const b64 = await generateImage(prompt)
        const file = await uploadAndLink(b64, art.id, art.title, strapiJWT, client)
        send(res, { type: 'ok', artId: art.id, title: art.title, fileUrl: file.url, index: i + 1 })
        ok++
      } catch (e) {
        send(res, { type: 'error', artId: art.id, title: art.title, message: e.message, index: i + 1 })
        failed++
        if (e.message.includes('billing') || e.message.includes('rate_limit')) {
          send(res, { type: 'abort', reason: e.message })
          break
        }
      }

      if (i < arts.length - 1) await new Promise(r => setTimeout(r, 1500))
    }

    send(res, { type: 'done', ok, failed })
  } finally {
    await client.end()
    res.end()
  }
}
