import { getSession } from '@/lib/getSession'

const STRAPI = process.env.STRAPI_SERVER_URL || process.env.NEXT_PUBLIC_API_URL

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const session = await getSession(req, res)
  if (!session?.jwt) return res.status(401).json({ error: 'Unauthorized' })

  const { artId } = req.body || {}
  if (!artId) return res.status(400).json({ error: 'artId required' })

  const toggleRes = await fetch(`${STRAPI}/users/me/toggle-art`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.jwt}` },
    body: JSON.stringify({ artId }),
  })
  if (!toggleRes.ok) return res.status(toggleRes.status).json({ error: 'Failed to toggle' })

  res.json(await toggleRes.json())
}
