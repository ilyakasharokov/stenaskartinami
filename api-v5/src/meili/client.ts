// Thin, resilient Meilisearch client for instant indexing on publish.
//
// Why this exists: strapi-plugin-meilisearch's lifecycle hooks don't fire for
// entries created/published via the Documents API (our wizards use
// documents().publish()), so new artists/arts/walls never auto-index. We index
// explicitly from our controllers at the publish point instead — deterministic
// and independent of the plugin version. All calls are non-blocking: if Meili
// is down, the user's request still succeeds.

import { toArtistDoc, toArtDoc, toWallDoc } from './transforms';

type Kind = 'artist' | 'art' | 'wall';

const CFG: Record<Kind, { index: string; uid: string; transform: (e: any) => any; populate: any }> = {
  artist: { index: 'artist', uid: 'api::artist.artist', transform: toArtistDoc, populate: { avatar: true } },
  art: { index: 'art', uid: 'api::art.art', transform: toArtDoc, populate: { Pictures: true, Artist: true } },
  wall: { index: 'wall', uid: 'api::wall.wall', transform: toWallDoc, populate: {} },
};

async function meiliFetch(path: string, method: string, body?: any) {
  const host = process.env.MEILISEARCH_HOST;
  if (!host) return; // not configured (e.g. local without Meili) — skip silently
  const res = await fetch(`${host}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.MEILISEARCH_API_KEY || ''}`,
      'Content-Type': 'application/json',
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text().catch(() => '')}`);
}

/** Upsert the PUBLISHED version of an entity into its index. Non-blocking. */
export function meiliSync(kind: Kind, documentId: string) {
  if (!documentId) return;
  const cfg = CFG[kind];
  setImmediate(async () => {
    try {
      const rows = await strapi.entityService.findMany(cfg.uid as any, {
        filters: { documentId: { $eq: documentId } } as any,
        status: 'published',
        populate: cfg.populate,
        pagination: { pageSize: 1 },
      });
      const entity = Array.isArray(rows) ? rows[0] : rows;
      if (!entity) return; // not published (yet) — nothing to index
      await meiliFetch(`/indexes/${cfg.index}/documents`, 'PUT', [cfg.transform(entity)]);
    } catch (e: any) {
      strapi.log.warn(`[meili] sync ${kind} ${documentId} failed: ${e.message}`);
    }
  });
}

/** Remove an entity from its index by numeric id (on unpublish/delete). Non-blocking. */
export function meiliRemove(kind: Kind, id: number | string) {
  if (!id) return;
  const cfg = CFG[kind];
  setImmediate(async () => {
    try {
      await meiliFetch(`/indexes/${cfg.index}/documents/${id}`, 'DELETE');
    } catch (e: any) {
      strapi.log.warn(`[meili] remove ${kind} ${id} failed: ${e.message}`);
    }
  });
}
