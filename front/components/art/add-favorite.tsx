import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import Router from 'next/router'

export default function AddFavorite({ art }) {
  const { data: session } = useSession()
  const [isActive, setActive] = useState(false)
  const pendingRef = useRef(false)

  useEffect(() => {
    if (session?.info?.arts) {
      setActive(!!session.info.arts.find(a => a.id === art.id))
    }
  }, [session, art.id])

  async function toggleFavorite() {
    if (!session) return Router.push('/auth/signin')
    if (pendingRef.current) return

    pendingRef.current = true
    const nextActive = !isActive
    setActive(nextActive)

    try {
      const res = await fetch('/api/toggle-favorite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artId: art.id }),
      })
      if (!res.ok) {
        setActive(!nextActive)
      } else {
        const json = await res.json()
        if (session.info) {
          session.info.arts = (json.arts || []).map(id => ({ id }))
        }
      }
    } catch {
      setActive(!nextActive)
    } finally {
      pendingRef.current = false
    }
  }

  return (
    <div
      title="Избранное"
      className={`favorite-btn ${isActive ? 'active' : ''}`}
      onClick={toggleFavorite}
    />
  )
}
