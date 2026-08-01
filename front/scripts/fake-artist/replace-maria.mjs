// Replace Maria's 3 artworks' images with painterly multi-photos (prod).
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(DIR, 'ai-out')
const API = 'https://api.stenaskartinami.com/api'

const MAP = {
  'Северное утро': ['maria-severnoe-1', 'maria-severnoe-2', 'maria-severnoe-3'],
  'Тёплый шум': ['maria-shum-1', 'maria-shum-2', 'maria-shum-3'],
  'Тишина №3': ['maria-tishina-1', 'maria-tishina-2', 'maria-tishina-3'],
}

async function login() {
  const r = await fetch(`${API}/auth/local`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'maria.lebedeva.spb@example.com', password: 'Lebedeva2026!Art' }),
  })
  return (await r.json()).jwt
}

async function upload(jwt, base) {
  const path = resolve(OUT, base + '.jpg')
  const fd = new FormData()
  fd.append('files', new Blob([readFileSync(path)], { type: 'image/jpeg' }), base + '.jpg')
  const r = await fetch(`${API}/upload`, { method: 'POST', headers: { Authorization: `Bearer ${jwt}` }, body: fd })
  const j = await r.json()
  if (!Array.isArray(j) || !j[0]?.id) throw new Error('upload failed: ' + JSON.stringify(j).slice(0, 120))
  return j[0].id
}

const jwt = await login()
console.log('logged in:', !!jwt)

const arts = (await fetch(`${API}/arts?filters[Artist][id][$eq]=4389&pagination[pageSize]=10&fields[0]=Title&fields[1]=documentId`).then(r => r.json())).data || []
for (const art of arts) {
  const bases = MAP[art.Title]
  if (!bases) { console.log('skip', art.Title); continue }
  const ids = []
  for (const b of bases) ids.push(await upload(jwt, b))
  const put = await fetch(`${API}/arts/${art.documentId}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
    body: JSON.stringify({ data: { Pictures: ids } }),
  })
  console.log(`«${art.Title}» → ${ids.length} фото, PUT ${put.status}`)
}
