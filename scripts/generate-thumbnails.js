#!/usr/bin/env node
// Generates missing thumbnail files for images that have a thumbnail record in DB
// but the actual file is absent from /uploads. Run inside the api-v5 container:
//   node /scripts/generate-thumbnails.js

const { Client } = require('pg');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const UPLOADS_DIR = '/usr/src/app/public/uploads';

const db = new Client({
  host: process.env.DATABASE_HOST || 'postgres',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  database: process.env.DATABASE_NAME || 'stenaskartinami',
  user: process.env.DATABASE_USERNAME || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres',
});

async function main() {
  await db.connect();
  console.log('Connected to DB');

  const { rows } = await db.query(`
    SELECT id, name, hash, ext, url, width, height, formats
    FROM files
    WHERE mime LIKE 'image/%'
      AND formats ? 'thumbnail'
  `);

  console.log(`Total images with thumbnail format entry: ${rows.length}`);

  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    const thumb = row.formats.thumbnail;
    const thumbFilename = thumb.hash + thumb.ext;
    const thumbPath = path.join(UPLOADS_DIR, thumbFilename);

    if (fs.existsSync(thumbPath)) {
      skipped++;
      continue;
    }

    // Find source file: prefer original, then large, then medium, then small
    let sourcePath = null;
    const originalFilename = row.hash + row.ext;
    if (fs.existsSync(path.join(UPLOADS_DIR, originalFilename))) {
      sourcePath = path.join(UPLOADS_DIR, originalFilename);
    } else {
      for (const size of ['large', 'medium', 'small']) {
        if (row.formats[size]) {
          const candidate = row.formats[size].hash + row.formats[size].ext;
          if (fs.existsSync(path.join(UPLOADS_DIR, candidate))) {
            sourcePath = path.join(UPLOADS_DIR, candidate);
            break;
          }
        }
      }
    }

    if (!sourcePath) {
      console.log(`  SKIP (no source): ${row.name}`);
      failed++;
      continue;
    }

    try {
      await sharp(sourcePath)
        .resize(thumb.width, thumb.height, { fit: 'cover', position: 'center' })
        .toFile(thumbPath);

      console.log(`  OK: ${thumbFilename} (${thumb.width}x${thumb.height}) from ${path.basename(sourcePath)}`);
      generated++;
    } catch (err) {
      console.log(`  FAIL: ${row.name} — ${err.message}`);
      failed++;
    }
  }

  await db.end();
  console.log(`\nDone: ${generated} generated, ${skipped} already existed, ${failed} failed`);
}

main().catch(err => { console.error(err); process.exit(1); });
