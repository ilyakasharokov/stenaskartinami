#!/usr/bin/env node
// Batch interior photo generation for all arts without interior_photo
// Run inside Strapi container: node /app/scripts/gen-interiors.mjs [--limit N] [--art-id ID]
//
// Options:
//   --limit N    process at most N arts (default: all)
//   --art-id ID  process specific art by DB id
//   --dry-run    print arts that would be processed, don't generate

import pg from 'pg'
import FormData from 'form-data'

const { Client } = pg

const STRAPI_URL = process.env.STRAPI_INTERNAL_URL || 'http://localhost:1337'
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const JWT_SECRET = process.env.JWT_SECRET || 'rCnBOOzog0TxlgDBc8w3/w=='
const USER_ID = parseInt(process.env.STRAPI_USER_ID || '946')
const DELAY_MS = parseInt(process.env.DELAY_MS || '2000')

const args = process.argv.slice(2)
const limitIdx = args.indexOf('--limit')
const artIdIdx = args.indexOf('--art-id')
const dryRun = args.includes('--dry-run')
const LIMIT = limitIdx >= 0 ? parseInt(args[limitIdx + 1]) : Infinity
const SPECIFIC_ART = artIdIdx >= 0 ? parseInt(args[artIdIdx + 1]) : null

function makeJWT(secret, payload) {
  const { createHmac } = await import('crypto').then(m => m).catch(() => require('crypto'))
  const enc = s => Buffer.from(JSON.stringify(s)).toString('base64url')
  const header = enc({ alg: 'HS256', typ: 'JWT' })
  const body = enc(payload)
  const sig = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url')
  return `${header}.${body}.${sig}`
}

import { createHmac } from 'crypto'
function buildJWT() {
  const enc = s => Buffer.from(JSON.stringify(s)).toString('base64url')
  const h = enc({ alg: 'HS256', typ: 'JWT' })
  const b = enc({ id: USER_ID, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 86400 * 30 })
  const sig = createHmac('sha256', JWT_SECRET).update(`${h}.${b}`).digest('base64url')
  return `${h}.${b}.${sig}`
}

const userJWT = buildJWT()

const db = new Client({
  host: process.env.DATABASE_HOST || 'postgres',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  database: process.env.DATABASE_NAME || 'stenaskartinami',
  user: process.env.DATABASE_USERNAME || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres',
})

async function getArtsToProcess() {
  if (SPECIFIC_ART) {
    const { rows } = await db.query(`
      SELECT a.id, a.document_id, a.title, a.materials,
        array_agg(DISTINCT s.title) FILTER (WHERE s.title IS NOT NULL AND s.published_at IS NOT NULL) as styles
      FROM arts a
      LEFT JOIN arts_styles_lnk asl ON asl.art_id = a.id
      LEFT JOIN styles s ON s.id = asl.style_id
      WHERE a.id = $1 AND a.published_at IS NOT NULL
      GROUP BY a.id, a.document_id, a.title, a.materials
    `, [SPECIFIC_ART])
    return rows
  }

  const { rows } = await db.query(`
    SELECT a.id, a.document_id, a.title, a.materials,
      array_agg(DISTINCT s.title) FILTER (WHERE s.title IS NOT NULL AND s.published_at IS NOT NULL) as styles
    FROM arts a
    LEFT JOIN arts_styles_lnk asl ON asl.art_id = a.id
    LEFT JOIN styles s ON s.id = asl.style_id
    WHERE a.published_at IS NOT NULL
      AND a.title IS NOT NULL AND a.title != ''
      AND EXISTS (SELECT 1 FROM arts_wall_lnk awl WHERE awl.art_id = a.id)
      AND NOT EXISTS (
        SELECT 1 FROM files_related_mph frm
        WHERE frm.related_id = a.id AND frm.related_type = 'api::art.art' AND frm.field = 'interior_photo'
      )
    GROUP BY a.id, a.document_id, a.title, a.materials
    ORDER BY a.id ASC
  `)
  return rows
}

function buildPrompt(art) {
  const title = art.title || ''
  const materials = art.materials || ''
  const styles = (art.styles || []).filter(Boolean).join(', ')
  const parts = ['картина']
  if (title) parts.push(`"${title}"`)
  if (styles) parts.push(`в стиле ${styles}`)
  if (materials) parts.push(`выполненная в технике ${materials}`)
  const painting = parts.join(' ')
  return `Профессиональная интерьерная фотография. Современная гостиная со светлыми стенами, стильной мебелью и растениями. В центре композиции на стене висит ${painting}. Тёплый мягкий свет. Реалистичная фотосъёмка, высокое качество, без текста и водяных знаков.`
}

async function generateImage(prompt) {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set')
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-image-1', prompt, n: 1, size: '1536x1024', quality: 'medium' }),
  })
  if (!res.ok) throw new Error(`OpenAI: ${res.status} ${(await res.text()).slice(0, 200)}`)
  const json = await res.json()
  const b64 = json.data?.[0]?.b64_json
  if (!b64) throw new Error(`No image data: ${JSON.stringify(json).slice(0, 200)}`)
  return b64
}

async function uploadImage(b64, artTitle) {
  const buf = Buffer.from(b64, 'base64')
  const filename = `interior_${Date.now()}.png`
  const form = new FormData()
  form.append('files', buf, { filename, contentType: 'image/png' })
  form.append('fileInfo', JSON.stringify({ name: filename, alternativeText: `Интерьер: ${artTitle}` }))
  const res = await fetch(`${STRAPI_URL}/api/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${userJWT}`, ...form.getHeaders() },
    body: form,
  })
  if (!res.ok) throw new Error(`Upload: ${res.status} ${(await res.text()).slice(0, 200)}`)
  return (await res.json())[0]
}

async function linkToArt(artId, fileId) {
  await db.query(
    `DELETE FROM files_related_mph WHERE related_id = $1 AND related_type = 'api::art.art' AND field = 'interior_photo'`,
    [artId]
  )
  await db.query(
    `INSERT INTO files_related_mph (file_id, related_id, related_type, field, "order") VALUES ($1, $2, 'api::art.art', 'interior_photo', 1)`,
    [fileId, artId]
  )
}

async function processArt(art, index, total) {
  const label = `[${index}/${total}] Art #${art.id} "${art.title}"`
  console.log(`\n${label}`)
  console.log(`  styles: ${(art.styles || []).filter(Boolean).join(', ') || '—'}`)
  console.log(`  materials: ${art.materials || '—'}`)

  if (dryRun) { console.log('  [dry-run, skip]'); return { ok: true, skipped: true } }

  const prompt = buildPrompt(art)
  console.log(`  prompt: ${prompt.slice(0, 100)}...`)

  const b64 = await generateImage(prompt)
  console.log(`  generated (${Math.round(b64.length / 1024)}kb b64)`)

  const file = await uploadImage(b64, art.title)
  console.log(`  uploaded: file #${file.id} ${file.url || file.name}`)

  await linkToArt(art.id, file.id)
  console.log(`  ✓ linked to art #${art.id}`)

  return { ok: true, fileId: file.id, fileUrl: file.url }
}

async function main() {
  await db.connect()

  const allArts = await getArtsToProcess()
  const arts = LIMIT < Infinity ? allArts.slice(0, LIMIT) : allArts

  if (arts.length === 0) {
    console.log('No arts to process. All arts already have interior_photo.')
    await db.end(); return
  }

  console.log(`Found ${arts.length} arts to process${dryRun ? ' (dry-run)' : ''}`)
  if (LIMIT < Infinity) console.log(`Processing at most ${LIMIT}`)

  const results = { ok: 0, failed: 0, skipped: 0 }
  const failed = []

  for (let i = 0; i < arts.length; i++) {
    const art = arts[i]
    try {
      const r = await processArt(art, i + 1, arts.length)
      if (r.skipped) results.skipped++
      else results.ok++
    } catch (e) {
      console.error(`  ✗ ERROR: ${e.message}`)
      results.failed++
      failed.push({ id: art.id, title: art.title, error: e.message })
      if (e.message.includes('billing') || e.message.includes('rate_limit')) {
        console.error('  Stopping due to billing/rate limit error')
        break
      }
    }
    if (i < arts.length - 1 && !dryRun) {
      await new Promise(r => setTimeout(r, DELAY_MS))
    }
  }

  console.log(`\n=== Done ===`)
  console.log(`OK: ${results.ok}, Failed: ${results.failed}, Skipped: ${results.skipped}`)
  if (failed.length) {
    console.log('Failed arts:')
    failed.forEach(f => console.log(`  #${f.id} "${f.title}": ${f.error}`))
  }

  await db.end()
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
