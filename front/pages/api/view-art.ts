import type { NextApiRequest, NextApiResponse } from 'next'

const STRAPI = process.env.STRAPI_SERVER_URL || process.env.NEXT_PUBLIC_API_URL

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { artId } = req.body || {}
  if (!artId) return res.status(400).json({ error: 'artId required' })

  try {
    const r = await fetch(`${STRAPI}/arts/${artId}/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!r.ok) return res.status(r.status).json({ error: 'Failed' })
    res.json(await r.json())
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
}
