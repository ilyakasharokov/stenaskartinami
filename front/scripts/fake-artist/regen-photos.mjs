// Regenerate AI photos (painting + gallery + interior) for all demo arts and
// re-upload them, replacing the script-drawn frame with real AI-generated shots.
import { photosFromBase } from './ai-paint.mjs'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = dirname(fileURLToPath(import.meta.url))
const AI = resolve(DIR, 'ai-out')
const API = 'https://api.stenaskartinami.com/api'

const PLAN = [
  { email: 'maria.lebedeva.spb@example.com', pw: 'Lebedeva2026!Art', artistId: 4389, map: {
    'Северное утро': 'maria-severnoe', 'Тёплый шум': 'maria-shum', 'Тишина №3': 'maria-tishina' } },
  { email: 'artem.severov.ekb@example.com', pw: 'Severov2026!Art', artistId: 4397, map: {
    'Полдень в саду': 'sev-polden', 'Ржавое эхо': 'sev-eho', 'Балтийский туман': 'sev-tuman' } },
]

async function login(email, pw) {
  const r = await fetch(`${API}/auth/local`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier: email, password: pw }) })
  return (await r.json()).jwt
}
async function upload(jwt, path) {
  const fd = new FormData()
  fd.append('files', new Blob([readFileSync(path)], { type: 'image/jpeg' }), path.split('/').pop())
  const r = await fetch(`${API}/upload`, { method: 'POST', headers: { Authorization: `Bearer ${jwt}` }, body: fd })
  const j = await r.json()
  if (!j[0]?.id) throw new Error('upload failed: ' + JSON.stringify(j).slice(0, 120))
  return j[0].id
}

// 1) regenerate the two AI photos for every artwork (base -1.jpg already saved)
const bases = ['maria-severnoe', 'maria-shum', 'maria-tishina', 'sev-polden', 'sev-eho', 'sev-tuman']
for (const b of bases) {
  try {
    const base = readFileSync(resolve(AI, `${b}-1.jpg`))
    await photosFromBase(b, base)
    console.log('regenerated', b)
  } catch (e) { console.log('✗ regen', b, e.message.slice(0, 120)) }
}

// 2) re-upload all three photos and set Pictures
for (const { email, pw, artistId, map } of PLAN) {
  const jwt = await login(email, pw)
  const arts = (await fetch(`${API}/arts?filters[Artist][id][$eq]=${artistId}&pagination[pageSize]=10&fields[0]=Title&fields[1]=documentId`).then(r => r.json())).data || []
  for (const art of arts) {
    const base = map[art.Title]
    if (!base) continue
    const ids = []
    for (const n of [`${base}-1`, `${base}-2`, `${base}-3`]) ids.push(await upload(jwt, resolve(AI, n + '.jpg')))
    const put = await fetch(`${API}/arts/${art.documentId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` }, body: JSON.stringify({ data: { Pictures: ids } }) })
    console.log(`«${art.Title}» → 3 ИИ-фото, PUT ${put.status}`)
  }
}
