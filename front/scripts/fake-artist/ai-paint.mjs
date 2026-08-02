// Real AI paintings via OpenAI gpt-image-1, then derive 3 "photos" of each:
// full view (AI), brushwork detail (crop), framed on a wall (composite).
import sharp from 'sharp'
import { mkdirSync, readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(DIR, 'ai-out')
mkdirSync(OUT, { recursive: true })

const OPENAI_KEY = (() => {
  const env = readFileSync(resolve(DIR, '../../.env'), 'utf8')
  for (const line of env.split('\n')) {
    const m = line.match(/^\s*OPENAI_API_KEY\s*=\s*(.*)\s*$/)
    if (m) return m[1].replace(/^["']|["']$/g, '')
  }
  return process.env.OPENAI_API_KEY
})()

export async function genBase(prompt, size = '1024x1536') {
  const r = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-image-1', prompt, size, quality: 'medium', n: 1 }),
  })
  const j = await r.json()
  if (!j.data?.[0]?.b64_json) throw new Error(`OpenAI: ${r.status} ${JSON.stringify(j).slice(0, 200)}`)
  return Buffer.from(j.data[0].b64_json, 'base64')
}

// Edit the base painting with a prompt (keeps it the SAME painting) — used to
// AI-generate additional "photos": framed on a wall, in an interior.
export async function genEdit(baseBuf, prompt, size = '1024x1024') {
  const fd = new FormData()
  fd.append('model', 'gpt-image-1')
  fd.append('image', new Blob([baseBuf], { type: 'image/jpeg' }), 'art.jpg')
  fd.append('prompt', prompt)
  fd.append('size', size)
  fd.append('quality', 'medium')
  const r = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST', headers: { Authorization: `Bearer ${OPENAI_KEY}` }, body: fd,
  })
  const j = await r.json()
  if (!j.data?.[0]?.b64_json) throw new Error(`OpenAI edit: ${r.status} ${JSON.stringify(j).slice(0, 200)}`)
  return Buffer.from(j.data[0].b64_json, 'base64')
}

// 3 photos, all AI: the painting, framed on a gallery wall, in a living room.
export async function photosFromBase(baseName, baseBuf) {
  const main = resolve(OUT, `${baseName}-1.jpg`)
  await sharp(baseBuf).jpeg({ quality: 92 }).toFile(main)

  const gallery = await genEdit(baseBuf, 'Realistic interior photo: this exact painting in a thin dark frame hanging on a light neutral gallery wall, soft natural lighting, eye-level, minimal, photographic')
  const g = resolve(OUT, `${baseName}-2.jpg`)
  await sharp(gallery).jpeg({ quality: 90 }).toFile(g)

  const room = await genEdit(baseBuf, 'Cozy realistic interior photo: this exact painting framed on the wall above a sofa in a warm modern living room, natural daylight, some plants, photographic, wide shot')
  const r = resolve(OUT, `${baseName}-3.jpg`)
  await sharp(room).jpeg({ quality: 90 }).toFile(r)

  return [main, g, r]
}

export async function makeAiPhotos(baseName, prompt) {
  const base = await genBase(prompt)
  return photosFromBase(baseName, base)
}

// standalone smoke test
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const p = await makeAiPhotos('ai-sample', 'Abstract oil painting, Baltic northern morning, cold blue-grey geometric planes dissolving into fog, a single warm orange sun, thick impasto brushwork, visible canvas texture, muted expressionist palette')
  console.log('done:', p.map(x => x.split('/').pop()).join(', '))
}
