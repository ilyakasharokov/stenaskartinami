import { getServerSession } from "next-auth"
import { authOptions } from "./authOptions"

let _devSession = null

async function fetchDevSession() {
  const email = process.env.DEV_AUTO_EMAIL
  const password = process.env.DEV_AUTO_PASSWORD
  if (!email || !password) return null
  try {
    const apiUrl = process.env.STRAPI_SERVER_URL || process.env.NEXT_PUBLIC_API_URL
    const res = await fetch(`${apiUrl}/auth/local`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: email, password }),
    })
    const data = await res.json()
    if (data.jwt) {
      return {
        jwt: data.jwt,
        id: data.user.id,
        info: { id: data.user.id, email: data.user.email, username: data.user.username },
      }
    }
  } catch {}
  return null
}

export async function getSession(req, res) {
  if (process.env.DEV_AUTO_EMAIL) {
    if (!_devSession) _devSession = await fetchDevSession()
    if (_devSession) return _devSession
  }
  return getServerSession(req, res, authOptions)
}
