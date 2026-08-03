import { useEffect, useState } from 'react'

// Opens the Jivo chat. Jivo's own floating launcher is hidden via CSS; this
// button (placed in the header) is the only trigger, so the widget never
// overlaps the mobile bottom nav.
export default function ChatButton() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const check = () => {
      if ((window as any).jivo_api?.open) { setReady(true); return true }
      return false
    }
    if (check()) return
    const id = setInterval(() => { if (check()) clearInterval(id) }, 500)
    return () => clearInterval(id)
  }, [])

  const openChat = () => {
    const api = (window as any).jivo_api
    if (api?.open) api.open()
  }

  if (!ready) return null

  return (
    <button className="chat-btn" onClick={openChat} aria-label="Открыть чат" title="Написать в чат">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
      </svg>
    </button>
  )
}
