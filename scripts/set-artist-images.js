#!/usr/bin/env node
'use strict';
// Sets avatar, cover, directions, techniques, subjects for artists from their arts.

var execSync = require('child_process').execSync;

var DB       = process.env.DB_NAME      || 'stenaskartinami';
var DB_USER  = process.env.DB_USER      || 'postgres';
var CONTAINER= process.env.PG_CONTAINER || '';  // set to docker container name on prod

function sql(query) {
  var cmd;
  if (CONTAINER) {
    var escaped = query.replace(/'/g, "'\"'\"'");
    cmd = "docker exec " + CONTAINER + " psql -U " + DB_USER + " -d " + DB + " -t -A -F '|' -c '" + escaped + "'";
  } else {
    var escaped2 = query.replace(/'/g, "'\\''");
    cmd = "PGPASSWORD=" + (process.env.DB_PASS||'postgres') + " psql -h " + (process.env.DB_HOST||'localhost') + " -U " + DB_USER + " -d " + DB + " -t -A -F '|' -c '" + escaped2 + "'";
  }
  var result = execSync(cmd, { encoding: 'utf8' });
  return result.trim().split('\n').filter(Boolean).map(function(row) { return row.split('|'); });
}

function sqlExec(query) {
  var cmd;
  if (CONTAINER) {
    var escaped = query.replace(/'/g, "'\"'\"'");
    cmd = "docker exec " + CONTAINER + " psql -U " + DB_USER + " -d " + DB + " -c '" + escaped + "'";
  } else {
    var escaped2 = query.replace(/'/g, "'\\''");
    cmd = "PGPASSWORD=" + (process.env.DB_PASS||'postgres') + " psql -h " + (process.env.DB_HOST||'localhost') + " -U " + DB_USER + " -d " + DB + " -c '" + escaped2 + "'";
  }
  execSync(cmd, { encoding: 'utf8', stdio: ['pipe','pipe','pipe'] });
}

// ── 1. Avatar & Cover ────────────────────────────────────────────────────────

console.log('\n=== Avatar & Cover ===');

var artistsRows = sql(
  "SELECT a.id, a.full_name," +
  "  (SELECT COUNT(*) FROM files_related_mph WHERE related_id=a.id AND related_type='api::artist.artist' AND field='avatar') > 0 AS has_avatar," +
  "  (SELECT COUNT(*) FROM files_related_mph WHERE related_id=a.id AND related_type='api::artist.artist' AND field='cover')  > 0 AS has_cover" +
  " FROM artists a WHERE a.published_at IS NOT NULL ORDER BY a.id"
);

for (var i = 0; i < artistsRows.length; i++) {
  var row = artistsRows[i];
  var artistId = row[0], fullName = row[1], hasAvatar = row[2], hasCover = row[3];
  if (hasAvatar === 't' && hasCover === 't') continue;

  var pics = sql(
    "SELECT DISTINCT frm.file_id" +
    " FROM arts_artist_lnk aal" +
    " JOIN arts art ON art.id = aal.art_id AND art.published_at IS NOT NULL" +
    " JOIN files_related_mph frm ON frm.related_id = art.id AND frm.related_type='api::art.art' AND frm.field='Pictures'" +
    " WHERE aal.artist_id = " + artistId +
    " ORDER BY frm.file_id LIMIT 2"
  );

  if (!pics.length) continue;

  var pic1 = pics[0][0];
  var pic2 = (pics[1] || pics[0])[0];

  try {
    if (hasAvatar === 'f') {
      sqlExec("INSERT INTO files_related_mph (file_id, related_id, related_type, field, \"order\") VALUES (" + pic1 + "," + artistId + ",'api::artist.artist','avatar',1)");
    }
    if (hasCover === 'f') {
      sqlExec("INSERT INTO files_related_mph (file_id, related_id, related_type, field, \"order\") VALUES (" + pic2 + "," + artistId + ",'api::artist.artist','cover',1)");
    }
    console.log('+ ' + fullName + ' (' + artistId + ') avatar:' + (hasAvatar==='f') + ' cover:' + (hasCover==='f'));
  } catch(e) {
    console.error('! ' + fullName + ': ' + e.message.slice(0,120));
  }
}

// ── 2. Directions / Techniques / Subjects ────────────────────────────────────

console.log('\n=== Directions / Techniques / Subjects ===');

var allArtists = sql(
  "SELECT id, full_name," +
  "  COALESCE(jsonb_array_length(directions),0)," +
  "  COALESCE(jsonb_array_length(techniques),0)," +
  "  COALESCE(jsonb_array_length(subjects),0)" +
  " FROM artists WHERE published_at IS NOT NULL ORDER BY id"
);

for (var j = 0; j < allArtists.length; j++) {
  var a = allArtists[j];
  var aid = a[0], aname = a[1], dirC = a[2], techC = a[3], subjC = a[4];
  var updates = [];

  if (dirC === '0') {
    var dr = sql(
      "SELECT DISTINCT s.title FROM arts_artist_lnk aal" +
      " JOIN arts art ON art.id=aal.art_id AND art.published_at IS NOT NULL" +
      " JOIN arts_styles_lnk asl ON asl.art_id=art.id" +
      " JOIN styles s ON s.id=asl.style_id AND s.published_at IS NOT NULL" +
      " WHERE aal.artist_id=" + aid + " LIMIT 10"
    );
    if (dr.length) {
      var dj = JSON.stringify(dr.map(function(r){return r[0];})).replace(/'/g,"''");
      updates.push("directions='" + dj + "'::jsonb");
    }
  }

  if (techC === '0') {
    var tr = sql(
      "SELECT DISTINCT m.title FROM arts_artist_lnk aal" +
      " JOIN arts art ON art.id=aal.art_id AND art.published_at IS NOT NULL" +
      " JOIN arts_mediums_lnk aml ON aml.art_id=art.id" +
      " JOIN mediums m ON m.id=aml.medium_id AND m.published_at IS NOT NULL" +
      " WHERE aal.artist_id=" + aid + " LIMIT 10"
    );
    if (tr.length) {
      var tj = JSON.stringify(tr.map(function(r){return r[0];})).replace(/'/g,"''");
      updates.push("techniques='" + tj + "'::jsonb");
    }
  }

  if (subjC === '0') {
    var sr = sql(
      "SELECT DISTINCT s.title FROM arts_artist_lnk aal" +
      " JOIN arts art ON art.id=aal.art_id AND art.published_at IS NOT NULL" +
      " JOIN arts_subjects_lnk asl ON asl.art_id=art.id" +
      " JOIN subjects s ON s.id=asl.subject_id AND s.published_at IS NOT NULL" +
      " WHERE aal.artist_id=" + aid + " LIMIT 10"
    );
    if (sr.length) {
      var sj = JSON.stringify(sr.map(function(r){return r[0];})).replace(/'/g,"''");
      updates.push("subjects='" + sj + "'::jsonb");
    }
  }

  if (!updates.length) continue;

  try {
    sqlExec("UPDATE artists SET " + updates.join(',') + ",updated_at=NOW() WHERE id=" + aid);
    console.log('+ ' + aname + ' — ' + updates.map(function(u){return u.split('=')[0];}).join(', '));
  } catch(e) {
    console.error('! ' + aname + ': ' + e.message.slice(0,120));
  }
}

console.log('\nDone.');
