// Complete Nika: set data on the wizard-uploaded art + create the other two.
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = dirname(fileURLToPath(import.meta.url))
const AI = resolve(DIR, 'ai-out')
const API = 'https://api.stenaskartinami.com/api'
const ARTIST_ID = 4400

async function login() {
  const r = await fetch(`${API}/auth/local`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier: 'nika.orlova.kzn@example.com', password: 'Orlova2026!Art' }) })
  return (await r.json()).jwt
}
async function idByTitle(type, field, name) {
  const list = (await fetch(`${API}/${type}?pagination[pageSize]=200&fields[0]=${field}`).then(r => r.json())).data || []
  const hit = list.find(x => (x[field] || '').trim().toLowerCase() === name.toLowerCase())
  return hit?.id || null
}
async function upload(jwt, base) {
  const fd = new FormData()
  fd.append('files', new Blob([readFileSync(resolve(AI, base + '.jpg'))], { type: 'image/jpeg' }), base + '.jpg')
  const r = await fetch(`${API}/upload`, { method: 'POST', headers: { Authorization: `Bearer ${jwt}` }, body: fd })
  return (await r.json())[0].id
}

const jwt = await login()
const S = { sur: await idByTitle('styles', 'title', 'Сюрреализм'), abs: await idByTitle('styles', 'title', 'Абстракционизм') }
const SUBJ = { peiz: await idByTitle('subjects', 'title', 'Пейзаж'), abst: await idByTitle('subjects', 'title', 'Абстракция') }
const MED = { maslo: await idByTitle('mediums', 'title', 'Масло') }
console.log('ids:', S, SUBJ, MED)

// 1) existing art → set style/subject/medium/price
const arts = (await fetch(`${API}/arts?filters[Artist][id][$eq]=${ARTIST_ID}&fields[0]=title&fields[1]=documentId&pagination[pageSize]=10`).then(r => r.json())).data || []
const existing = arts.find(a => a.title === 'Сон о невесомости')
if (existing) {
  const r = await fetch(`${API}/arts/${existing.documentId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` }, body: JSON.stringify({ data: { styles: [S.sur], subjects: [SUBJ.peiz], mediums: [MED.maslo], Price: 58000, Owners_price: 58000 } }) })
  console.log('«Сон о невесомости» данные → PUT', r.status)
}

// 2) create the other two
const NEW = [
  { title: 'Тихая орбита', files: ['nika-orbita-1', 'nika-orbita-2', 'nika-orbita-3'], w: 100, h: 70, price: 64000, styles: [S.sur], subjects: [SUBJ.peiz], mediums: [MED.maslo], desc: 'Планеты застыли над зеркальным морем на закате. Тёплое золото и холодный бирюзовый, тишина космической орбиты.' },
  { title: 'Внутренний космос', files: ['nika-vnutrenniy-1', 'nika-vnutrenniy-2', 'nika-vnutrenniy-3'], w: 90, h: 90, price: 49000, styles: [S.abs], subjects: [SUBJ.abst], mediums: [MED.maslo], desc: 'Светящийся портал и облака туманности внутри сознания. Бирюза и маджента, геометрия и органика.' },
]
for (const art of NEW) {
  if (arts.find(a => a.title === art.title)) { console.log(art.title, '— уже есть, пропускаю'); continue }
  const pics = []
  for (const fbase of art.files) pics.push(await upload(jwt, fbase))
  const data = {
    title: art.title, Description: art.desc, Materials: 'Холст, масло',
    Owners_price: art.price, Price: art.price, width: art.w, height: art.h, Year: '2026-01-01',
    styles: art.styles.filter(Boolean), subjects: art.subjects.filter(Boolean), mediums: art.mediums.filter(Boolean),
    Pictures: pics, Artist: ARTIST_ID,
  }
  const r = await fetch(`${API}/arts?populate[0]=Artist`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` }, body: JSON.stringify({ data }) })
  console.log(`«${art.title}» создана → POST ${r.status}`)
}
