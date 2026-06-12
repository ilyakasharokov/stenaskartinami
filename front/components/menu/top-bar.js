import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'

const BellIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
)

const ChevronIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
)

function UserAvatar({ name, image }) {
  if (image) {
    return <img src={image} alt={name} className="nav-user__avatar-img" />
  }
  const initials = (name || '?').slice(0, 1).toUpperCase()
  return <span className="nav-user__avatar-initials">{initials}</span>
}

export default function NavRight() {
  const { data: session } = useSession()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    if (!dropdownOpen) return
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [dropdownOpen])

  if (!session) {
    return (
      <div className="nav-right">
        <Link href="/auth/signin" className="nav-auth-link">Войти</Link>
      </div>
    )
  }

  return (
    <div className="nav-right">
      <button className="nav-bell" aria-label="Уведомления">
        <BellIcon />
        <span className="nav-bell__dot" />
      </button>

      <div className="nav-user" ref={dropdownRef}>
        <button
          className="nav-user__trigger"
          onClick={() => setDropdownOpen(v => !v)}
          aria-expanded={dropdownOpen}
        >
          <div className="nav-user__avatar">
            <UserAvatar name={session.user?.name} image={session.user?.image} />
          </div>
          <span className="nav-user__name">{session.user?.name}</span>
          <ChevronIcon />
        </button>

        {dropdownOpen && (
          <div className="nav-user__dropdown">
            <Link
              href="/account/profile"
              className="nav-user__item"
              onClick={() => setDropdownOpen(false)}
            >
              Мои работы
            </Link>
            <Link
              href="/account/profile?tab=favorite"
              className="nav-user__item"
              onClick={() => setDropdownOpen(false)}
            >
              Избранное
            </Link>
            <Link
              href="/account/profile?tab=settings"
              className="nav-user__item"
              onClick={() => setDropdownOpen(false)}
            >
              Настройки
            </Link>
            <div className="nav-user__divider" />
            <button
              className="nav-user__item nav-user__item--danger"
              onClick={() => { setDropdownOpen(false); signOut() }}
            >
              Выйти
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
