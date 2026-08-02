import type { NextApiRequest, NextApiResponse } from 'next'

// On-demand ISR revalidation, called by Strapi when content changes so a
// freshly-published work appears on the artist/art pages without waiting for
// the revalidate window. Protected by a shared secret.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { secret, paths } = req.body || {}
  if (!process.env.REVALIDATE_SECRET || secret !== process.env.REVALIDATE_SECRET) {
    return res.status(401).json({ error: 'Invalid secret' })
  }

  const list = (Array.isArray(paths) ? paths : [paths]).filter(Boolean)
  const revalidated: string[] = []
  for (const p of list) {
    try {
      await res.revalidate(p)
      revalidated.push(p)
    } catch (e: any) {
      // ignore individual failures (e.g. path never generated yet)
    }
  }
  return res.json({ revalidated })
}
