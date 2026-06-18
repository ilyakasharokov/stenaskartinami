#!/usr/bin/env node
// Sets avatar, cover, directions, techniques, subjects for artists from their arts.

import { execSync } from 'child_process';

const DB = process.env.DB_NAME   || 'stenaskartinami';
const HOST= process.env.DB_HOST  || 'localhost';
const USER= process.env.DB_USER  || 'postgres';
const PASS= process.env.DB_PASS  || 'postgres';

function sql(query) {
  const escaped = query.replace(/'/g, "'\\''");
  const result = execSync(
    `PGPASSWORD=${PASS} psql -h ${HOST} -U ${USER} -d ${DB} -t -A -F '|' -c '${escaped}'`,
    { encoding: 'utf8' }
  );
  return result.trim().split('\n').filter(Boolean).map(row => row.split('|'));
}

function sqlExec(query) {
  const escaped = query.replace(/'/g, "'\\''");
  execSync(
    `PGPASSWORD=${PASS} psql -h ${HOST} -U ${USER} -d ${DB} -c '${escaped}'`,
    { encoding: 'utf8', stdio: ['pipe','pipe','pipe'] }
  );
}

// ── 1. Avatar & Cover ────────────────────────────────────────────────────────

console.log('\n=== Avatar & Cover ===');

const artistsWithoutMedia = sql(`
  SELECT DISTINCT a.id, a.full_name,
    (SELECT COUNT(*) FROM files_related_mph WHERE related_id=a.id AND related_type='api::artist.artist' AND field='avatar') > 0 AS has_avatar,
    (SELECT COUNT(*) FROM files_related_mph WHERE related_id=a.id AND related_type='api::artist.artist' AND field='cover')  > 0 AS has_cover
  FROM artists a
  WHERE a.published_at IS NOT NULL
  ORDER BY a.id
`);

for (const [artistId, fullName, hasAvatar, hasCover] of artistsWithoutMedia) {
  if (hasAvatar === 't' && hasCover === 't') continue;

  // Get pictures from this artist's published arts, ordered by art id
  const pics = sql(`
    SELECT DISTINCT frm.file_id
    FROM arts_artist_lnk aal
    JOIN arts art ON art.id = aal.art_id AND art.published_at IS NOT NULL
    JOIN files_related_mph frm ON frm.related_id = art.id AND frm.related_type='api::art.art' AND frm.field='Pictures'
    WHERE aal.artist_id = ${artistId}
    ORDER BY frm.file_id
    LIMIT 2
  `);

  if (!pics.length) continue;

  const pic1 = pics[0][0];
  const pic2 = (pics[1] || pics[0])[0];

  try {
    if (hasAvatar === 'f') {
      sqlExec(`INSERT INTO files_related_mph (file_id, related_id, related_type, field, "order") VALUES (${pic1}, ${artistId}, 'api::artist.artist', 'avatar', 1)`);
    }
    if (hasCover === 'f') {
      sqlExec(`INSERT INTO files_related_mph (file_id, related_id, related_type, field, "order") VALUES (${pic2}, ${artistId}, 'api::artist.artist', 'cover', 1)`);
    }
    console.log(`✓ ${fullName} (id:${artistId}) — avatar:${hasAvatar==='f'} cover:${hasCover==='f'}`);
  } catch (e) {
    console.error(`✗ ${fullName}: ${e.message}`);
  }
}

// ── 2. Directions (styles), Techniques (mediums), Subjects ──────────────────

console.log('\n=== Directions / Techniques / Subjects ===');

const allArtists = sql(`
  SELECT id, full_name,
    COALESCE(jsonb_array_length(directions), 0) AS dir_count,
    COALESCE(jsonb_array_length(techniques), 0) AS tech_count,
    COALESCE(jsonb_array_length(subjects),   0) AS subj_count
  FROM artists
  WHERE published_at IS NOT NULL
  ORDER BY id
`);

for (const [artistId, fullName, dirCount, techCount, subjCount] of allArtists) {
  const updates = [];

  if (dirCount === '0') {
    const rows = sql(`
      SELECT DISTINCT s.title
      FROM arts_artist_lnk aal
      JOIN arts art ON art.id = aal.art_id AND art.published_at IS NOT NULL
      JOIN arts_styles_lnk asl ON asl.art_id = art.id
      JOIN styles s ON s.id = asl.style_id AND s.published_at IS NOT NULL
      WHERE aal.artist_id = ${artistId}
      LIMIT 10
    `);
    if (rows.length) {
      const json = JSON.stringify(rows.map(r => r[0])).replace(/'/g, "''");
      updates.push(`directions = '${json}'::jsonb`);
    }
  }

  if (techCount === '0') {
    const rows = sql(`
      SELECT DISTINCT m.title
      FROM arts_artist_lnk aal
      JOIN arts art ON art.id = aal.art_id AND art.published_at IS NOT NULL
      JOIN arts_mediums_lnk aml ON aml.art_id = art.id
      JOIN mediums m ON m.id = aml.medium_id AND m.published_at IS NOT NULL
      WHERE aal.artist_id = ${artistId}
      LIMIT 10
    `);
    if (rows.length) {
      const json = JSON.stringify(rows.map(r => r[0])).replace(/'/g, "''");
      updates.push(`techniques = '${json}'::jsonb`);
    }
  }

  if (subjCount === '0') {
    const rows = sql(`
      SELECT DISTINCT s.title
      FROM arts_artist_lnk aal
      JOIN arts art ON art.id = aal.art_id AND art.published_at IS NOT NULL
      JOIN arts_subjects_lnk asl ON asl.art_id = art.id
      JOIN subjects s ON s.id = asl.subject_id AND s.published_at IS NOT NULL
      WHERE aal.artist_id = ${artistId}
      LIMIT 10
    `);
    if (rows.length) {
      const json = JSON.stringify(rows.map(r => r[0])).replace(/'/g, "''");
      updates.push(`subjects = '${json}'::jsonb`);
    }
  }

  if (!updates.length) continue;

  try {
    sqlExec(`UPDATE artists SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ${artistId}`);
    console.log(`✓ ${fullName} — ${updates.map(u => u.split(' ')[0]).join(', ')}`);
  } catch (e) {
    console.error(`✗ ${fullName}: ${e.message}`);
  }
}

console.log('\nDone.');
