// Ask the Next.js frontend to on-demand revalidate ISR pages after content
// changes. Non-blocking; no-op if not configured.
export function revalidateFront(paths: string[]) {
  const base = process.env.FRONT_INTERNAL_URL || 'http://front:3000';
  const secret = process.env.REVALIDATE_SECRET;
  const list = (paths || []).filter(Boolean);
  if (!secret || !list.length) return;
  setImmediate(async () => {
    try {
      await fetch(`${base}/api/revalidate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret, paths: list }),
      });
    } catch (e: any) {
      strapi.log.warn('[revalidate] ' + e.message);
    }
  });
}

// Build the ISR paths affected by a change to an artwork.
export function artPaths(art: any): string[] {
  const paths: string[] = [];
  if (art?.slug && art?.id) paths.push(`/art/${art.slug}--${art.id}`);
  const artist = art?.Artist;
  if (artist?.slug && artist?.id) paths.push(`/artists/${artist.slug}--${artist.id}`);
  return paths;
}
