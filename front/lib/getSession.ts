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
    // Honour an explicit dev logout: the "Выйти" button sets this cookie so the
    // server-side bypass stops authenticating and pages can show the real
    // logged-out experience (auth modal on protected pages, etc.).
    const cookieHeader = req?.headers?.cookie || ''
    const loggedOut = req?.cookies?.devLoggedOut === '1' || /(?:^|;\s*)devLoggedOut=1(?:;|$)/.test(cookieHeader)
    if (!loggedOut) {
      if (!_devSession) _devSession = await fetchDevSession()
      if (_devSession) return _devSession
    }
  }
  return getServerSession(req, res, authOptions as any)
}
