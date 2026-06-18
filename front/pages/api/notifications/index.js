import { getSession } from '@/lib/getSession'

const STRAPI = process.env.STRAPI_SERVER_URL || process.env.NEXT_PUBLIC_API_URL

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  const session = await getSession(req, res)
  if (!session?.jwt) return res.status(401).json({ notifications: [], unreadCount: 0 })

  try {
    const r = await fetch(`${STRAPI}/users/me/notifications`, {
      headers: { Authorization: `Bearer ${session.jwt}` },
    })
    if (!r.ok) return res.status(r.status).json({ notifications: [], unreadCount: 0 })
    res.json(await r.json())
  } catch {
    res.json({ notifications: [], unreadCount: 0 })
  }
}
