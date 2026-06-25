#!/usr/bin/env node
// Syncs locally generated interior_photo images to production Strapi
// Run: node /tmp/sync-interiors-to-prod.mjs

import pg from 'pg'
import { createHmac } from 'crypto'

const LOCAL_STRAPI = 'http://localhost:1337'
const PROD_API = 'https://api.stenaskartinami.com/api'
const PROD_JWT_SECRET = 'your_jwt_secret'
const PROD_USER_ID = 942
const DELAY_MS = 1500

function buildJWT(secret, userId) {
  const enc = s => Buffer.from(JSON.stringify(s)).toString('base64url')
  const h = enc({ alg: 'HS256', typ: 'JWT' })
  const b = enc({ id: userId, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 86400 })
  const sig = createHmac('sha256', secret).update(`${h}.${b}`).digest('base64url')
  return `${h}.${b}.${sig}`
}

const prodJWT = buildJWT(PROD_JWT_SECRET, PROD_USER_ID)

const db = new pg.Client({
  host: 'localhost',
  port: 5432,
  database: 'stenaskartinami',
  user: 'postgres',
  password: 'postgres',
})

async function getLocalArts() {
  const { rows } = await db.query(`
    SELECT a.id, a.document_id, a.title, f.url, f.name
    FROM arts a
    JOIN files_related_mph frm ON frm.related_id = a.id
      AND frm.related_type = 'api::art.art' AND frm.field = 'interior_photo'
    JOIN files f ON f.id = frm.file_id
    WHERE a.published_at IS NOT NULL
    ORDER BY a.id
  `)
  return rows
}

async function getProdArtId(documentId) {
  const res = await fetch(`${PROD_API}/arts/${documentId}?fields=id`, {
    headers: { Authorization: `Bearer ${prodJWT}` },
  })
  if (!res.ok) return null
  const json = await res.json()
  return json?.data?.id || json?.id || null
}

async function prodHasInterior(documentId) {
  const res = await fetch(`${PROD_API}/arts/${documentId}?populate[interior_photo]=true`, {
    headers: { Authorization: `Bearer ${prodJWT}` },
  })
  if (!res.ok) return false
  const json = await res.json()
  const art = json?.data || json
  return !!(art?.interior_photo || art?.attributes?.interior_photo)
}

async function uploadToProd(imageUrl, filename, prodArtId, artTitle) {
  const imgRes = await fetch(imageUrl)
  if (!imgRes.ok) throw new Error(`Failed to fetch local image: ${imgRes.status}`)
  const imgBuf = Buffer.from(await imgRes.arrayBuffer())

  const blob = new Blob([imgBuf], { type: 'image/png' })
  const form = new FormData()
  form.append('files', blob, filename)
  form.append('refId', String(prodArtId))
  form.append('ref', 'api::art.art')
  form.append('field', 'interior_photo')
  form.append('fileInfo', JSON.stringify({ alternativeText: `Интерьер: ${artTitle}` }))

  const res = await fetch(`${PROD_API}/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${prodJWT}` },
    body: form,
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(`Upload failed: ${res.status} ${t.slice(0, 150)}`)
  }
  const [file] = await res.json()
  return file
}

async function main() {
  await db.connect()
  const arts = await getLocalArts()
  console.log(`Found ${arts.length} local arts with interior_photo`)

  let ok = 0, skipped = 0, failed = 0

  for (let i = 0; i < arts.length; i++) {
    const art = arts[i]
    const label = `[${i + 1}/${arts.length}] #${art.id} "${art.title}"`

    try {
      const prodArtId = await getProdArtId(art.document_id)
      if (!prodArtId) {
        console.log(`${label} — not found on prod, skip`)
        skipped++; continue
      }

      const hasInterior = await prodHasInterior(art.document_id)
      if (hasInterior) {
        console.log(`${label} — already has interior on prod, skip`)
        skipped++; continue
      }

      const imageUrl = `${LOCAL_STRAPI}${art.url}`
      const file = await uploadToProd(imageUrl, art.name, prodArtId, art.title)
      console.log(`${label} — ✓ uploaded file #${file.id} ${file.url || file.name}`)
      ok++
    } catch (e) {
      console.error(`${label} — ✗ ${e.message}`)
      failed++
    }

    if (i < arts.length - 1) await new Promise(r => setTimeout(r, DELAY_MS))
  }

  console.log(`\nDone: ${ok} uploaded, ${skipped} skipped, ${failed} failed`)
  await db.end()
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
