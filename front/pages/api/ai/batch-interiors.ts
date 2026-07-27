import { getSession } from '@/lib/getSession'
import { createHmac } from 'crypto'

export const config = { api: { bodyParser: false, responseLimit: false } }

const STRAPI_URL = process.env.STRAPI_SERVER_URL?.replace(/\/api$/, '') || 'http://api-v5:1337'
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
  const dims = art.width && art.height ? ` The painting is ${art.width}×${art.height} cm.` : ''
  return `Place this painting naturally on the wall of a real residential interior.${dims} Neutral walls, realistic lighting. The painting should be proportional and look genuinely hung. Realistic interior photography, high quality, no text or watermarks.`
}

async function fetchImageAsPng(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status} ${url}`)
  const buf = Buffer.from(await res.arrayBuffer())
  const { default: sharp } = await import('sharp')
  return await sharp(buf).png().toBuffer()
}

async function generateInteriorWithImage(artImageUrl, prompt) {
  const imgBuf = await fetchImageAsPng(artImageUrl)
  const imgBlob = new Blob([imgBuf as any], { type: 'image/png' })

  const form = new FormData()
  form.append('model', 'gpt-image-1')
  form.append('prompt', prompt)
  form.append('n', '1')
  form.append('size', '1536x1024')
  form.append('quality', 'medium')
  form.append('image[]', imgBlob, 'painting.png')

  const res = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: form,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `OpenAI edits ${res.status}`)
  }
  const json = await res.json()
  const b64 = json.data?.[0]?.b64_json
  if (!b64) throw new Error('No image in OpenAI response')
  return b64
}

async function uploadAndLink(b64, artId, artTitle, strapiJWT, pg) {
  const buf = Buffer.from(b64, 'base64')
  const blob = new Blob([buf], { type: 'image/png' })
  const form = new FormData()
  form.append('files', blob, `interior_${artId}_${Date.now()}.png`)
  form.append('fileInfo', JSON.stringify({ alternativeText: `Интерьер: ${artTitle}` }))

  const upRes = await fetch(`${STRAPI_URL}/api/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${strapiJWT}` },
    body: form,
  })
  if (!upRes.ok) {
    const t = await upRes.text().catch(() => '')
    throw new Error(`Upload failed: ${upRes.status} ${t.slice(0, 100)}`)
  }
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

  const { Client } = await import('pg')
  const client = new Client(DB_CONFIG)
  await client.connect()

  try {
    // Query also fetches the primary picture URL for each art
    const artSelect = `
      SELECT a.id, a.title, a.materials, a.width, a.height,
        array_agg(DISTINCT s.title) FILTER (WHERE s.title IS NOT NULL AND s.published_at IS NOT NULL) as styles,
        (
          SELECT f.url FROM files_related_mph frm2
          JOIN files f ON f.id = frm2.file_id
          WHERE frm2.related_id = a.id AND frm2.related_type = 'api::art.art' AND frm2.field = 'Pictures'
          ORDER BY frm2.order ASC LIMIT 1
        ) as picture_url
      FROM arts a
      LEFT JOIN arts_styles_lnk asl ON asl.art_id = a.id
      LEFT JOIN styles s ON s.id = asl.style_id
    `

    let artsQuery
    if (artId) {
      artsQuery = await client.query(
        artSelect + ` WHERE a.id = $1 AND a.published_at IS NOT NULL GROUP BY a.id, a.title, a.materials, a.width, a.height`,
        [artId]
      )
    } else {
      artsQuery = await client.query(
        artSelect + `
        WHERE a.published_at IS NOT NULL AND a.title IS NOT NULL AND a.title != ''
          AND EXISTS (SELECT 1 FROM arts_wall_lnk awl WHERE awl.art_id = a.id)
          AND NOT EXISTS (
            SELECT 1 FROM files_related_mph frm
            WHERE frm.related_id = a.id AND frm.related_type = 'api::art.art' AND frm.field = 'interior_photo'
          )
        GROUP BY a.id, a.title, a.materials, a.width, a.height
        ORDER BY a.id ASC`
      )
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
        if (!art.picture_url) throw new Error('Нет фотографий картины')

        const artImageUrl = `${STRAPI_URL}${art.picture_url}`
        const prompt = buildPrompt(art)
        console.log(`[batch-interiors] generating art #${art.id} "${art.title}" from ${artImageUrl}`)

        const b64 = await generateInteriorWithImage(artImageUrl, prompt)
        console.log(`[batch-interiors] generated, uploading...`)

        const file = await uploadAndLink(b64, art.id, art.title, strapiJWT, client)
        console.log(`[batch-interiors] uploaded file`, file?.id, file?.url)
        send(res, { type: 'ok', artId: art.id, title: art.title, fileUrl: file.url, index: i + 1 })
        ok++
      } catch (e) {
        const msg = e.cause ? `${e.message}: ${e.cause.message || e.cause}` : e.message
        send(res, { type: 'error', artId: art.id, title: art.title, message: msg, index: i + 1 })
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
