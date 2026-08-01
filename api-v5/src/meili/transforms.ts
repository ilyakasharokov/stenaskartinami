// Single source of truth: entity → Meilisearch document.
// Used by BOTH the plugin config (bulk reindex) and our direct upserts
// (instant indexing on publish), so index shape can never drift.

export const toArtistDoc = (e: any) => ({
  id: e.id,
  full_name: e.full_name || '',
  nickname: e.nickname || '',
  slug: e.slug || '',
  avatar:
    e.avatar?.formats?.thumbnail?.url ||
    e.avatar?.formats?.small?.url ||
    e.avatar?.url ||
    null,
});

export const toArtDoc = (e: any) => ({
  id: e.id,
  Title: e.Title || '',
  slug: e.slug || '',
  img: e.Pictures?.[0]?.url || null,
  Artist_full_name: e.Artist?.full_name || '',
});

export const toWallDoc = (e: any) => ({
  id: e.id,
  Title: e.Title || '',
  slug: e.slug || '',
  Address: e.Address || '',
});
