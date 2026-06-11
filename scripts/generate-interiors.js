#!/usr/bin/env node
/**
 * Generates interior photos for the 8 main arts using DALL-E 3,
 * then uploads them to Strapi and links to each art document.
 *
 * Usage:
 *   OPENAI_API_KEY=sk-... \
 *   STRAPI_ADMIN_EMAIL=admin@example.com \
 *   STRAPI_ADMIN_PASSWORD=yourpassword \
 *   node scripts/generate-interiors.js
 */

const fs = require('fs')
const path = require('path')
const https = require('https')
const http = require('http')
const FormData = require('form-data')

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337'
const OPENAI_KEY = process.env.OPENAI_API_KEY
const ADMIN_EMAIL = process.env.STRAPI_ADMIN_EMAIL
const ADMIN_PASSWORD = process.env.STRAPI_ADMIN_PASSWORD

if (!OPENAI_KEY)      { console.error('OPENAI_API_KEY is required'); process.exit(1) }
if (!ADMIN_EMAIL)     { console.error('STRAPI_ADMIN_EMAIL is required'); process.exit(1) }
if (!ADMIN_PASSWORD)  { console.error('STRAPI_ADMIN_PASSWORD is required'); process.exit(1) }

// ── Helpers ───────────────────────────────────────────────────────────────────

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, options)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${url} → ${res.status}: ${text.slice(0, 300)}`)
  }
  return res.json()
}

async function strapiLogin() {
  const json = await fetchJSON(`${STRAPI_URL}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  })
  const token = json?.data?.token
  if (!token) throw new Error('Login failed — check credentials')
  console.log('✓ Logged in to Strapi admin')
  return token
}

async function getMainArts(adminToken) {
  const url = `${STRAPI_URL}/api/arts?filters[main][$eq]=true&filters[wall][$notNull]=true&populate[0]=Pictures&populate[1]=Artist&populate[2]=styles&populate[3]=mediums&pagination[limit]=8&status=published`
  const json = await fetchJSON(url, {
    headers: { Authorization: `Bearer ${adminToken}` },
  })
  const items = Array.isArray(json?.data) ? json.data : (Array.isArray(json) ? json : [])
  console.log(`✓ Found ${items.length} main arts`)
  return items
}

function buildPrompt(art) {
  const title = art.Title || 'abstract painting'
  const styles = (art.styles || []).map(s => s.Title || s.title).filter(Boolean).join(', ')
  const medium = art.Materials || (art.mediums || []).map(m => m.title || m.Title).filter(Boolean).join(', ')
  const artist = art.Artist?.full_name || ''

  let desc = `a painting titled "${title}"`
  if (artist) desc += ` by ${artist}`
  if (styles) desc += `, ${styles} style`
  if (medium) desc += `, ${medium}`

  return `Realistic interior design photograph. A beautifully decorated contemporary living room with a framed painting prominently displayed on the wall. The painting is ${desc}. The room has elegant furniture, soft natural lighting from windows, neutral tones with warm accents. Professional interior photography, high resolution, no text, no watermarks.`
}

async function generateWithDalle(prompt) {
  const json = await fetchJSON('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_KEY}`,
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1792x1024',
      quality: 'standard',
    }),
  })
  return json.data[0].url
}

function downloadImage(url, dest) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http
    const file = fs.createWriteStream(dest)
    proto.get(url, res => {
      res.pipe(file)
      file.on('finish', () => file.close(resolve))
    }).on('error', err => { fs.unlink(dest, () => {}); reject(err) })
  })
}

async function uploadToStrapi(filePath, filename, adminToken) {
  const form = new FormData()
  form.append('files', fs.createReadStream(filePath), filename)

  const res = await fetch(`${STRAPI_URL}/api/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}`, ...form.getHeaders() },
    body: form,
  })
  if (!res.ok) throw new Error(`Upload failed: ${await res.text()}`)
  const json = await res.json()
  const uploaded = Array.isArray(json) ? json[0] : json
  return uploaded.id
}

async function setInteriorPhoto(documentId, mediaId, adminToken) {
  // Update draft
  await fetchJSON(`${STRAPI_URL}/api/arts/${documentId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ data: { interior_photo: mediaId } }),
  })
  // Publish to apply change
  await fetchJSON(`${STRAPI_URL}/api/arts/${documentId}/actions/publish`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  }).catch(() => {}) // ignore if already published
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const tmpDir = path.join(__dirname, '.interior-tmp')
  fs.mkdirSync(tmpDir, { recursive: true })

  const adminToken = await strapiLogin()
  const arts = await getMainArts(adminToken)

  if (!arts.length) {
    console.log('No main arts found. Make sure arts have main=true and a wall assigned.')
    return
  }

  for (const art of arts) {
    const id = art.id
    const documentId = art.documentId
    const title = art.Title || `art-${id}`
    console.log(`\n→ Processing: "${title}" (id=${id}, documentId=${documentId})`)

    try {
      const prompt = buildPrompt(art)
      console.log(`  Prompt: ${prompt.slice(0, 100)}…`)

      console.log(`  Calling DALL-E 3…`)
      const imageUrl = await generateWithDalle(prompt)

      const filename = `interior-${id}.jpg`
      const tmpPath = path.join(tmpDir, filename)
      console.log(`  Downloading image…`)
      await downloadImage(imageUrl, tmpPath)

      console.log(`  Uploading to Strapi…`)
      const mediaId = await uploadToStrapi(tmpPath, filename, adminToken)
      console.log(`  Uploaded, mediaId=${mediaId}`)

      await setInteriorPhoto(documentId, mediaId, adminToken)
      console.log(`  ✓ Saved to art`)

      fs.unlinkSync(tmpPath)
    } catch (err) {
      console.error(`  ✗ Failed for "${title}": ${err.message}`)
    }
  }

  fs.rmdirSync(tmpDir, { recursive: true })
  console.log('\n✓ Done')
}

main().catch(err => { console.error(err); process.exit(1) })
