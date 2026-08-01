// Generates abstract "paintings" as JPEGs for the fake-artist walkthrough
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), 'out')
mkdirSync(OUT, { recursive: true })

const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(42)
const pick = arr => arr[Math.floor(rnd() * arr.length)]

function noiseDots(w, h, n, color, opMax = 0.05) {
  let s = ''
  for (let i = 0; i < n; i++) {
    s += `<circle cx="${(rnd() * w).toFixed(0)}" cy="${(rnd() * h).toFixed(0)}" r="${(rnd() * 2 + 0.5).toFixed(1)}" fill="${color}" opacity="${(rnd() * opMax).toFixed(3)}"/>`
  }
  return s
}

// 1. «Северное утро» — холодная геометрия, 1600×2000 (80×100)
function severnoeUtro() {
  const W = 1600, H = 2000
  const cols = ['#2c3e50', '#5d7a97', '#a8bfd4', '#e8eef4', '#c47a4a', '#1a2634']
  let shapes = `<rect width="${W}" height="${H}" fill="#dfe7ee"/>`
  shapes += `<rect x="0" y="0" width="${W}" height="620" fill="#a8bfd4" opacity="0.85"/>`
  shapes += `<rect x="0" y="1450" width="${W}" height="550" fill="#2c3e50"/>`
  for (let i = 0; i < 14; i++) {
    const x = rnd() * W, w = 60 + rnd() * 380, y = 300 + rnd() * 1200, h = 120 + rnd() * 600
    shapes += `<rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="${w.toFixed(0)}" height="${h.toFixed(0)}" fill="${pick(cols)}" opacity="${(0.35 + rnd() * 0.5).toFixed(2)}"/>`
  }
  shapes += `<circle cx="1180" cy="430" r="170" fill="#c47a4a" opacity="0.92"/>`
  shapes += `<line x1="0" y1="1450" x2="${W}" y2="1450" stroke="#1a2634" stroke-width="6"/>`
  shapes += noiseDots(W, H, 2600, '#1a2634')
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${shapes}</svg>`, file: 'severnoe-utro.jpg' }
}

// 2. «Тёплый шум» — тёплая абстракция с кругами, 1800×1400
function teplyShum() {
  const W = 1800, H = 1400
  const cols = ['#c1502e', '#e07b39', '#eec170', '#8d5a3b', '#f4e9d8', '#5b3a29']
  let shapes = `<rect width="${W}" height="${H}" fill="#f4e9d8"/>`
  for (let i = 0; i < 22; i++) {
    const cx = rnd() * W, cy = rnd() * H, r = 60 + rnd() * 300
    shapes += `<circle cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="${r.toFixed(0)}" fill="${pick(cols)}" opacity="${(0.25 + rnd() * 0.45).toFixed(2)}"/>`
  }
  shapes += `<rect x="0" y="1180" width="${W}" height="220" fill="#5b3a29" opacity="0.9"/>`
  shapes += `<circle cx="420" cy="520" r="240" fill="none" stroke="#c1502e" stroke-width="22" opacity="0.85"/>`
  shapes += noiseDots(W, H, 2400, '#5b3a29')
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${shapes}</svg>`, file: 'teply-shum.jpg' }
}

// 3. «Тишина №3» — минимализм, вертикаль 1500×1900
function tishina() {
  const W = 1500, H = 1900
  let shapes = `<rect width="${W}" height="${H}" fill="#efece6"/>`
  shapes += `<rect x="180" y="240" width="1140" height="1420" fill="none" stroke="#3f3a34" stroke-width="10"/>`
  shapes += `<rect x="180" y="980" width="1140" height="680" fill="#3f3a34" opacity="0.92"/>`
  shapes += `<circle cx="750" cy="640" r="190" fill="#b34a2e"/>`
  shapes += `<line x1="180" y1="240" x2="1320" y2="240" stroke="#b34a2e" stroke-width="26"/>`
  shapes += noiseDots(W, H, 2000, '#3f3a34')
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${shapes}</svg>`, file: 'tishina-3.jpg' }
}

for (const gen of [severnoeUtro, teplyShum, tishina]) {
  const { svg, file } = gen()
  await sharp(Buffer.from(svg)).jpeg({ quality: 88 }).toFile(resolve(OUT, file))
  console.log('created', file)
}
