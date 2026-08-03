// Regenerate paintings whose image orientation didn't match their w×h, using
// the correct aspect ratio, then re-upload.
import { genBase, photosFromBase } from './ai-paint.mjs'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = dirname(fileURLToPath(import.meta.url))
const AI = resolve(DIR, 'ai-out')
const API = 'https://api.stenaskartinami.com/api'

// size from dimensions: landscape → 1536x1024, portrait → 1024x1536, square → 1024x1024
const JOBS = [
  { base: 'maria-shum', title: 'Тёплый шум', owner: 'maria', size: '1536x1024',
    prompt: 'Abstract oil painting, warm urban noise, layered ochre and terracotta, circular echoes, deep shadow at bottom edge, palette knife impasto, expressive, canvas texture' },
  { base: 'sev-polden', title: 'Полдень в саду', owner: 'artem', size: '1536x1024',
    prompt: 'Impressionist oil painting, sunlit summer garden at noon, warm ochre and green, dappled light, loose expressive brushstrokes, thick paint, canvas texture' },
  { base: 'sev-eho', title: 'Ржавое эхо', owner: 'artem', size: '1024x1024',
    prompt: 'Abstract expressionist oil painting, rusty echoes, corroded ochre and iron-red, industrial decay, thick textured strokes, moody, canvas texture' },
]

const CRED = {
  maria: { email: 'maria.lebedeva.spb@example.com', pw: 'Lebedeva2026!Art', artistId: 4389 },
  artem: { email: 'artem.severov.ekb@example.com', pw: 'Severov2026!Art', artistId: 4397 },
}

async function login(c) {
  const r = await fetch(`${API}/auth/local`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier: c.email, password: c.pw }) })
  return (await r.json()).jwt
}
async function upload(jwt, path) {
  const fd = new FormData()
  fd.append('files', new Blob([readFileSync(path)], { type: 'image/jpeg' }), path.split('/').pop())
  const r = await fetch(`${API}/upload`, { method: 'POST', headers: { Authorization: `Bearer ${jwt}` }, body: fd })
  const j = await r.json(); return j[0].id
}

for (const job of JOBS) {
  console.log('generating', job.title, job.size, '…')
  const buf = await genBase(job.prompt, job.size)
  await photosFromBase(job.base, buf) // saves base-1/2/3
  const c = CRED[job.owner]
  const jwt = await login(c)
  const arts = (await fetch(`${API}/arts?filters[Artist][id][$eq]=${c.artistId}&fields[0]=title&fields[1]=documentId&pagination[pageSize]=10`).then(r => r.json())).data || []
  const art = arts.find(a => a.title === job.title)
  const ids = []
  for (const n of [`${job.base}-1`, `${job.base}-2`, `${job.base}-3`]) ids.push(await upload(jwt, resolve(AI, n + '.jpg')))
  const put = await fetch(`${API}/arts/${art.documentId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` }, body: JSON.stringify({ data: { Pictures: ids } }) })
  console.log(`«${job.title}» → ${job.size}, 3 фото, PUT ${put.status}`)
}
