// Painterly abstract "oil paintings" via layered SVG (brush strokes + canvas
// texture with feTurbulence). Produces a main shot + detail + angled variants
// so each artwork has 2-3 "photos".
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(DIR, 'paint-out')
mkdirSync(OUT, { recursive: true })

function mulberry(seed) { return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }

const PALETTES = {
  север: ['#2b3a55', '#3f5c78', '#6b8cae', '#a9c3d6', '#e7eef3', '#c56b3f', '#8a5a3b'],
  охра: ['#7a3b23', '#b5651d', '#d99a3f', '#e9cf9a', '#f3ead6', '#5b3a29', '#9c4a2f'],
  сад: ['#2f4a2e', '#4e7a41', '#8bab5a', '#cbd68a', '#f0ead2', '#c25b3f', '#e0a13a'],
  сумерки: ['#3a2a4d', '#5b4a7a', '#9b7bab', '#d0a9c0', '#e9d6e0', '#e0913a', '#c2503f'],
}

// one elongated brush stroke, biased toward the painting's dominant direction
function stroke(rnd, W, H, colors, domAng) {
  const x = rnd() * W, y = rnd() * H
  const len = 60 + rnd() * 340
  const wid = 8 + rnd() * 30
  // most strokes follow the dominant angle (±25°), a few break free
  const ang = rnd() < 0.8 ? domAng + (rnd() * 50 - 25) : rnd() * 360
  const c = colors[Math.floor(rnd() * colors.length)]
  const op = (0.14 + rnd() * 0.5).toFixed(2)
  return `<g transform="translate(${x.toFixed(0)} ${y.toFixed(0)}) rotate(${ang.toFixed(0)})">
    <ellipse cx="0" cy="0" rx="${(len / 2).toFixed(0)}" ry="${(wid / 2).toFixed(0)}" fill="${c}" opacity="${op}" filter="url(#soft)"/>
  </g>`
}

function palletKnife(rnd, W, H, colors) {
  const x = rnd() * W, y = rnd() * H
  const w = 60 + rnd() * 220, h = 20 + rnd() * 90
  const ang = (rnd() * 60 - 30).toFixed(0)
  const c = colors[Math.floor(rnd() * colors.length)]
  return `<rect x="${(x - w / 2).toFixed(0)}" y="${(y - h / 2).toFixed(0)}" width="${w.toFixed(0)}" height="${h.toFixed(0)}" transform="rotate(${ang} ${x.toFixed(0)} ${y.toFixed(0)})" fill="${c}" opacity="${(0.18 + rnd() * 0.4).toFixed(2)}" filter="url(#soft)"/>`
}

export function paintingSVG(seed, W, H, paletteKey) {
  const rnd = mulberry(seed)
  const colors = PALETTES[paletteKey] || PALETTES['север']
  const bg = colors[colors.length - 2]
  const domAng = rnd() * 180 // dominant brush direction for this painting

  // base wash: a few big soft blobs
  let base = ''
  for (let i = 0; i < 6; i++) {
    const c = colors[Math.floor(rnd() * colors.length)]
    base += `<ellipse cx="${(rnd() * W).toFixed(0)}" cy="${(rnd() * H).toFixed(0)}" rx="${(W * (0.3 + rnd() * 0.4)).toFixed(0)}" ry="${(H * (0.25 + rnd() * 0.4)).toFixed(0)}" fill="${c}" opacity="0.5" filter="url(#wash)"/>`
  }
  // palette-knife blocks then fine strokes
  let knives = ''; for (let i = 0; i < 12; i++) knives += palletKnife(rnd, W, H, colors)
  let strokes = ''; for (let i = 0; i < 190; i++) strokes += stroke(rnd, W, H, colors, domAng)
  // a focal element — sun/moon or horizon
  const focal = rnd() > 0.5
    ? `<circle cx="${(W * (0.55 + rnd() * 0.3)).toFixed(0)}" cy="${(H * (0.2 + rnd() * 0.2)).toFixed(0)}" r="${(Math.min(W, H) * 0.10).toFixed(0)}" fill="${colors[5]}" opacity="0.85" filter="url(#soft)"/>`
    : `<rect x="0" y="${(H * (0.6 + rnd() * 0.1)).toFixed(0)}" width="${W}" height="${(H * 0.02).toFixed(0)}" fill="${colors[0]}" opacity="0.5" filter="url(#soft)"/>`

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs>
      <filter id="soft"><feGaussianBlur stdDeviation="2.2"/></filter>
      <filter id="wash"><feGaussianBlur stdDeviation="60"/></filter>
      <filter id="canvas">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="${seed % 100}" result="n"/>
        <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.5 0"/>
      </filter>
      <filter id="paper">
        <feTurbulence type="fractalNoise" baseFrequency="0.012 0.016" numOctaves="3" seed="${(seed + 7) % 100}" result="n"/>
        <feDisplacementMap in="SourceGraphic" in2="n" scale="7"/>
      </filter>
    </defs>
    <rect width="${W}" height="${H}" fill="${bg}"/>
    <g filter="url(#paper)">
      ${base}
      ${knives}
      ${focal}
      ${strokes}
    </g>
    <!-- canvas weave / grain -->
    <rect width="${W}" height="${H}" filter="url(#canvas)" opacity="0.22"/>
    <!-- vignette -->
    <rect width="${W}" height="${H}" fill="url(#vig)"/>
    <radialGradient id="vig" cx="50%" cy="48%" r="72%">
      <stop offset="60%" stop-color="#000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0.22"/>
    </radialGradient>
  </svg>`
}

// Produce 2-3 "photos" of the same painting: full view, brushwork detail,
// and the framed piece on a wall. Returns array of written file paths.
export async function makePhotos(baseName, { seed, palette, W = 1200, H = 1500 }) {
  const svg = paintingSVG(seed, W, H, palette)
  const base = await sharp(Buffer.from(svg)).jpeg({ quality: 92 }).toBuffer()

  const mainPath = resolve(OUT, `${baseName}-1.jpg`)
  await sharp(base).toFile(mainPath)

  // detail: zoom into brushwork
  const detailPath = resolve(OUT, `${baseName}-2.jpg`)
  await sharp(base)
    .extract({ left: Math.round(W * 0.26), top: Math.round(H * 0.30), width: Math.round(W * 0.46), height: Math.round(H * 0.46) })
    .resize(1000)
    .jpeg({ quality: 90 })
    .toFile(detailPath)

  // framed on a wall
  const FW = 1400, FH = 1600
  const wall = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${FW}" height="${FH}">
    <defs><linearGradient id="w" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#efeae3"/><stop offset="1" stop-color="#e2dccf"/></linearGradient>
      <filter id="wn"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2"/><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.03 0"/></filter>
    </defs>
    <rect width="${FW}" height="${FH}" fill="url(#w)"/>
    <rect width="${FW}" height="${FH}" filter="url(#wn)"/>
  </svg>`)
  const artW = Math.round(FW * 0.62)
  const artBuf = await sharp(base).resize(artW).toBuffer()
  const meta = await sharp(artBuf).metadata()
  const aw = meta.width, ah = meta.height
  const left = Math.round((FW - aw) / 2), top = Math.round((FH - ah) / 2)
  const frame = 18
  const shadow = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${aw + frame * 2 + 30}" height="${ah + frame * 2 + 30}"><rect x="18" y="24" width="${aw + frame * 2}" height="${ah + frame * 2}" rx="4" fill="#000" opacity="0.20"/></svg>`)
  const frameBuf = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${aw + frame * 2}" height="${ah + frame * 2}"><rect width="${aw + frame * 2}" height="${ah + frame * 2}" fill="#2b2622"/><rect x="6" y="6" width="${aw + frame * 2 - 12}" height="${ah + frame * 2 - 12}" fill="#0f0d0b"/></svg>`)
  const framedPath = resolve(OUT, `${baseName}-3.jpg`)
  await sharp(wall)
    .composite([
      { input: shadow, left: left - frame - 4, top: top - frame + 2 },
      { input: frameBuf, left: left - frame, top: top - frame },
      { input: artBuf, left, top },
    ])
    .jpeg({ quality: 90 })
    .toFile(framedPath)

  return [mainPath, detailPath, framedPath]
}

// standalone: render one sample to inspect
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const svg = paintingSVG(101, 1200, 1500, 'север')
  await sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toFile(resolve(OUT, 'sample.jpg'))
  console.log('sample written', resolve(OUT, 'sample.jpg'))
}
