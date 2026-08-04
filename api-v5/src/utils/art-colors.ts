/* eslint-disable @typescript-eslint/no-explicit-any */
// Extracts dominant colour families from an artwork image, so the catalog can
// offer a "colour" filter (useful for matching art to an interior). Runs once
// per image (on create/update and via backfill), result stored in
// `art.color_families` as a comma-joined slug list, e.g. "blue,green,white".

// eslint-disable-next-line @typescript-eslint/no-var-requires
const sharp = require('sharp');

export const COLOR_FAMILIES = [
  'red', 'orange', 'yellow', 'green', 'blue', 'purple',
  'pink', 'brown', 'beige', 'black', 'white', 'gray',
];

const NEUTRAL = new Set(['black', 'white', 'gray']);

function rgbToHsv(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const v = max;
  const s = max === 0 ? 0 : (max - min) / max;
  let h = 0;
  if (max !== min) {
    const d = max - min;
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s, v };
}

function classifyHsv(h: number, s: number, v: number): string {
  if (v < 0.16) return 'black';
  if (s < 0.10) return v > 0.85 ? 'white' : 'gray';
  // warm, muted tones → beige / brown
  if (h >= 20 && h <= 55) {
    if (s < 0.35 && v > 0.7) return 'beige';
    if (v < 0.55) return 'brown';
  }
  if (h < 15 || h >= 345) return 'red';
  if (h < 45) return 'orange';
  if (h < 70) return 'yellow';
  if (h < 165) return 'green';
  if (h < 255) return 'blue';
  if (h < 290) return 'purple';
  return 'pink';
}

export async function computeColorFamilies(buffer: Buffer): Promise<string> {
  const { data, info } = await sharp(buffer)
    .resize(48, 48, { fit: 'inside' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const ch = info.channels || 3;
  const counts: Record<string, number> = {};
  let total = 0;
  let sumV = 0, sumS = 0, px = 0;
  for (let i = 0; i + ch - 1 < data.length; i += ch) {
    const { h, s, v } = rgbToHsv(data[i], data[i + 1], data[i + 2]);
    const fam = classifyHsv(h, s, v);
    // down-weight neutrals so real colours win when present
    const w = NEUTRAL.has(fam) ? 0.5 : 1;
    counts[fam] = (counts[fam] || 0) + w;
    total += w;
    sumV += v; sumS += s; px++;
  }
  if (!total) return '';

  const ranked = Object.entries(counts)
    .map(([fam, c]) => [fam, c / total] as [string, number])
    .sort((a, b) => b[1] - a[1]);

  // keep families ≥ 10% of the image, at least the top one, up to 3
  const picked = ranked.filter(([, frac]) => frac >= 0.10).slice(0, 3).map(([f]) => f);
  if (!picked.length && ranked.length) picked.push(ranked[0][0]);

  // Tone / saturation tags (a separate dimension, AND-ed with colour in search)
  const avgV = px ? sumV / px : 0;
  const avgS = px ? sumS / px : 0;
  const tones: string[] = [];
  if (avgV >= 0.70) tones.push('light');
  if (avgV <= 0.38) tones.push('dark');
  if (avgS >= 0.50) tones.push('vivid');
  if (avgV >= 0.68 && avgS >= 0.08 && avgS <= 0.32) tones.push('pastel');

  return [...picked, ...tones].join(',');
}

async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const base = process.env.STRAPI_INTERNAL_URL || 'http://127.0.0.1:1337';
    const full = /^https?:\/\//.test(url) ? url : base + url;
    const res = await fetch(full);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

// Compute + persist colour families for one art (updates all versions by document_id).
export async function extractAndStoreColors(strapi: any, artId: number): Promise<string | null> {
  try {
    const art = await strapi.entityService.findOne('api::art.art', artId, {
      populate: { Pictures: true } as any,
    });
    const pic = (art as any)?.Pictures?.[0];
    if (!pic) return null;
    const url = pic.formats?.small?.url || pic.formats?.medium?.url || pic.formats?.thumbnail?.url || pic.url;
    if (!url) return null;

    const buf = await fetchImageBuffer(url);
    if (!buf) return null;

    const families = await computeColorFamilies(buf);
    const docId = (art as any).documentId;
    if (docId) {
      await strapi.db.connection('arts').where('document_id', docId).update({ color_families: families });
    } else {
      await strapi.db.connection('arts').where('id', artId).update({ color_families: families });
    }
    return families;
  } catch (e: any) {
    strapi.log?.warn?.('[art-colors] extract failed: ' + e.message);
    return null;
  }
}
