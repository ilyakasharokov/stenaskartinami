import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Router from 'next/router'
import AuthForm from './AuthForm'

type Ctx = { open: (redirectTo?: string) => void; close: () => void; isOpen: boolean }
const AuthModalContext = createContext<Ctx>({ open: () => {}, close: () => {}, isOpen: false })

export const useAuthModal = () => useContext(AuthModalContext)

export function AuthModalProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [redirectTo, setRedirectTo] = useState<string | null>(null)

  useEffect(() => { setMounted(true) }, [])

  // `open` may be passed directly as an onClick handler, so guard against
  // receiving a React event instead of a destination string.
  const open = useCallback((to?: string) => {
    setRedirectTo(typeof to === 'string' ? to : null)
    setIsOpen(true)
  }, [])
  const close = useCallback(() => setIsOpen(false), [])

  // close on route change and lock body scroll while open
  useEffect(() => {
    if (!isOpen) return
    const onRoute = () => setIsOpen(false)
    Router.events.on('routeChangeStart', onRoute)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false) }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      Router.events.off('routeChangeStart', onRoute)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [isOpen])

  // after a successful sign-in from the modal: close, then go to the intended
  // destination (if a link was intercepted) or just refresh in place.
  const onDone = () => {
    setIsOpen(false)
    const dest = redirectTo || Router.asPath
    setRedirectTo(null)
    Router.replace(dest)
  }

  return (
    <AuthModalContext.Provider value={{ open, close, isOpen }}>
      {children}
      {mounted && isOpen && createPortal(
        <div className="auth-modal__overlay" onClick={close}>
          <div className="auth-modal" onClick={e => e.stopPropagation()}>
            <button className="auth-modal__close" onClick={close} aria-label="Закрыть">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            <AuthForm onDone={onDone} />
          </div>
        </div>,
        document.body
      )}
    </AuthModalContext.Provider>
  )
}
