import { getSession } from '@/lib/getSession'

const STRAPI = process.env.STRAPI_SERVER_URL || process.env.NEXT_PUBLIC_API_URL

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const session = await getSession(req, res)
  if (!session?.jwt) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const r = await fetch(`${STRAPI}/users/me/notifications/read-all`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.jwt}` },
    })
    if (!r.ok) return res.status(r.status).json({ ok: false })
    res.json(await r.json())
  } catch {
    res.json({ ok: false })
  }
}
