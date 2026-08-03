// Fill styles / subjects / mediums / price for the demo artworks via API.
const API = 'https://api.stenaskartinami.com/api'
const BASE = 'https://stenaskartinami.com'

async function idByTitle(type, field, name) {
  const r = await fetch(`${API}/${type}?filters[${field}][$eqi]=${encodeURIComponent(name)}&pagination[pageSize]=1&fields[0]=${field}`)
  const j = await r.json()
  const id = j.data?.[0]?.id
  if (!id) console.warn(`  ! ${type} "${name}" не найдено — пропускаю`)
  return id || null
}

async function login(email, password) {
  const r = await fetch(`${API}/auth/local`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier: email, password }) })
  return (await r.json()).jwt
}

// resolve taxonomy ids once
const S = {}
for (const n of ['Абстракционизм', 'Импрессионизм']) S[n] = await idByTitle('styles', 'title', n)
const SUBJ = {}
for (const n of ['Пейзаж', 'Абстракция']) SUBJ[n] = await idByTitle('subjects', 'title', n)
const MED = {}
for (const n of ['Масло', 'Акрил']) MED[n] = await idByTitle('mediums', 'title', n)
console.log('styles', S, 'subjects', SUBJ, 'mediums', MED)

const PLAN = {
  'maria.lebedeva.spb@example.com': { pw: 'Lebedeva2026!Art', arts: {
    'Северное утро': { styles: ['Абстракционизм'], subjects: ['Пейзаж'], mediums: ['Акрил'], price: 48000 },
    'Тёплый шум':    { styles: ['Абстракционизм'], subjects: ['Абстракция'], mediums: ['Масло'], price: 52000 },
    'Тишина №3':     { styles: ['Абстракционизм'], subjects: ['Абстракция'], mediums: ['Акрил'], price: 39000 },
  }},
  'artem.severov.ekb@example.com': { pw: 'Severov2026!Art', arts: {
    'Полдень в саду':    { styles: ['Импрессионизм'], subjects: ['Пейзаж'], mediums: ['Масло'], price: 55000 },
    'Ржавое эхо':        { styles: ['Абстракционизм'], subjects: ['Абстракция'], mediums: ['Масло'], price: 47000 },
    'Балтийский туман':  { styles: ['Абстракционизм'], subjects: ['Пейзаж'], mediums: ['Масло'], price: 61000 },
  }},
}

for (const [email, cfg] of Object.entries(PLAN)) {
  const jwt = await login(email, cfg.pw)
  const artistId = email.includes('lebedeva') ? 4389 : 4397
  const arts = (await fetch(`${API}/arts?filters[Artist][id][$eq]=${artistId}&pagination[pageSize]=10&fields[0]=title&fields[1]=documentId`).then(r => r.json())).data || []
  for (const art of arts) {
    const spec = cfg.arts[art.title]
    if (!spec) continue
    const data = {
      styles: spec.styles.map(n => S[n]).filter(Boolean),
      subjects: spec.subjects.map(n => SUBJ[n]).filter(Boolean),
      mediums: spec.mediums.map(n => MED[n]).filter(Boolean),
      Price: spec.price,
      Owners_price: spec.price,
    }
    const r = await fetch(`${API}/arts/${art.documentId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` }, body: JSON.stringify({ data }) })
    console.log(`«${art.title}» → PUT ${r.status} (стиль/предмет/техника/цена ${spec.price}₽)`)
  }
}
