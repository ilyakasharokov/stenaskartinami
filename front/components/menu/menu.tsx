import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import { useAuthModal } from '@/components/auth/AuthModal'

const menuItems = [
  { title: 'Главная',          link: '/' },
  { title: 'Каталог',          link: '/catalog' },
  { title: 'Художники',        link: '/artists' },
  { title: 'Добавить картину', link: '/account/add-art' },
  { title: 'Добавить стену',   link: '/add-wall' },
  { title: 'Добавить художника', link: '/add-artist' },
]

// Links that require auth — a logged-out click opens the auth modal instead of
// navigating to the protected page.
const AUTH_REQUIRED = new Set(['/account/add-art', '/add-wall', '/add-artist'])

export default function Menu() {
  const [showMenu, setShowMenu] = useState(false)
  const router = useRouter()
  const { data: session } = useSession()
  const { open: openAuth } = useAuthModal()

  const isActive = (link) => {
    if (link === '/') return router.pathname === '/'
    return router.pathname.startsWith(link)
  }

  return (
    <div className="menu">
      <button
        className={`menu-btn${showMenu ? ' menu-btn--open' : ''}`}
        onClick={() => setShowMenu(v => !v)}
        aria-label="Меню"
      >
        {showMenu
          ? <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="2" y1="2" x2="16" y2="16"/><line x1="16" y1="2" x2="2" y2="16"/></svg>
          : <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="2" y1="4" x2="16" y2="4"/><line x1="2" y1="9" x2="16" y2="9"/><line x1="2" y1="14" x2="16" y2="14"/></svg>
        }
      </button>
      <nav className={`top-menu${showMenu ? ' active' : ''}`}>
        {menuItems.map((item) => (
          <div key={item.link} className="top-menu__item">
            <Link
              href={item.link}
              className={isActive(item.link) ? 'is-active' : ''}
              onClick={(e) => {
                setShowMenu(false)
                if (AUTH_REQUIRED.has(item.link) && !session) {
                  e.preventDefault()
                  openAuth(item.link)
                }
              }}
            >
              {item.title}
            </Link>
          </div>
        ))}
      </nav>
    </div>
  )
}
