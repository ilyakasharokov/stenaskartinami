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

// full + detail + framed-on-wall, from a base painting buffer
export async function photosFromBase(baseName, baseBuf) {
  const meta = await sharp(baseBuf).metadata()
  const W = meta.width, H = meta.height

  const main = resolve(OUT, `${baseName}-1.jpg`)
  await sharp(baseBuf).jpeg({ quality: 92 }).toFile(main)

  const detail = resolve(OUT, `${baseName}-2.jpg`)
  await sharp(baseBuf)
    .extract({ left: Math.round(W * 0.24), top: Math.round(H * 0.28), width: Math.round(W * 0.5), height: Math.round(H * 0.5) })
    .resize(1000).jpeg({ quality: 90 }).toFile(detail)

  const FW = 1400, FH = 1600
  const wall = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${FW}" height="${FH}">
    <defs><linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#efeae3"/><stop offset="1" stop-color="#e2dccf"/></linearGradient>
    <filter id="wn"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2"/><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.03 0"/></filter></defs>
    <rect width="${FW}" height="${FH}" fill="url(#w)"/><rect width="${FW}" height="${FH}" filter="url(#wn)"/></svg>`)
  const artW = Math.round(FW * 0.6)
  const artBuf = await sharp(baseBuf).resize(artW).jpeg({ quality: 92 }).toBuffer()
  const am = await sharp(artBuf).metadata()
  const aw = am.width, ah = am.height
  const left = Math.round((FW - aw) / 2), top = Math.round((FH - ah) / 2)
  const fr = 18
  const shadow = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${aw + fr * 2 + 40}" height="${ah + fr * 2 + 40}"><rect x="20" y="26" width="${aw + fr * 2}" height="${ah + fr * 2}" rx="4" fill="#000" opacity="0.20"/></svg>`)
  const frame = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${aw + fr * 2}" height="${ah + fr * 2}"><rect width="${aw + fr * 2}" height="${ah + fr * 2}" fill="#2b2622"/><rect x="6" y="6" width="${aw + fr * 2 - 12}" height="${ah + fr * 2 - 12}" fill="#0f0d0b"/></svg>`)
  const framed = resolve(OUT, `${baseName}-3.jpg`)
  await sharp(wall).composite([
    { input: shadow, left: left - fr - 6, top: top - fr + 2 },
    { input: frame, left: left - fr, top: top - fr },
    { input: artBuf, left, top },
  ]).jpeg({ quality: 90 }).toFile(framed)

  return [main, detail, framed]
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
