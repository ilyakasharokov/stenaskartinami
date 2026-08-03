import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { Heart } from '@/components/ui/icons'
import { useAuthModal } from '@/components/auth/AuthModal'

export default function AddFavorite({ art }) {
  const { data: session } = useSession()
  const { open: openAuth } = useAuthModal()
  const [isActive, setActive] = useState(false)
  const pendingRef = useRef(false)

  useEffect(() => {
    if (session?.info?.arts) {
      setActive(!!session.info.arts.find(a => a.id === art.id))
    }
  }, [session, art.id])

  async function toggleFavorite() {
    if (!session) return openAuth()
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
      role="button"
      aria-pressed={isActive}
      className={`favorite-btn ${isActive ? 'active' : ''}`}
      onClick={toggleFavorite}
    >
      <Heart className="favorite-btn__icon" filled={isActive} />
    </div>
  )
}
