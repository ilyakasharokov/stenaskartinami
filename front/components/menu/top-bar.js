import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { useState, useRef, useEffect, useCallback } from 'react'

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

const NOTIF_ICONS = {
  new_art:      '🖼',
  new_like:     '❤️',
  new_follower: '👤',
}

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (diff < 60) return 'только что'
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`
  return `${Math.floor(diff / 86400)} д назад`
}

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

  const [bellOpen, setBellOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const bellRef = useRef(null)

  const fetchNotifications = useCallback(async () => {
    if (!session?.user) return
    try {
      const res = await fetch('/api/notifications')
      if (!res.ok) return
      const data = await res.json()
      setNotifications(data.notifications || [])
      setUnreadCount(data.unreadCount || 0)
    } catch {}
  }, [session?.user])

  // Poll every 60 seconds while authenticated
  useEffect(() => {
    if (!session?.user) return
    fetchNotifications()
    const id = setInterval(fetchNotifications, 60_000)
    return () => clearInterval(id)
  }, [fetchNotifications, session?.user])

  const openBell = async () => {
    setBellOpen(v => !v)
    if (!bellOpen && unreadCount > 0) {
      setUnreadCount(0)
      try {
        await fetch('/api/notifications/read-all', { method: 'POST' })
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      } catch {}
    }
  }

  // Close user dropdown on outside click
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

  // Close bell dropdown on outside click
  useEffect(() => {
    if (!bellOpen) return
    const handler = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setBellOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [bellOpen])

  if (!session) {
    return (
      <div className="nav-right">
        <Link href="/auth/signin" className="nav-auth-link">Войти</Link>
      </div>
    )
  }

  return (
    <div className="nav-right">
      <div className="nav-bell-wrap" ref={bellRef}>
        <button className="nav-bell" aria-label="Уведомления" onClick={openBell}>
          <BellIcon />
          {unreadCount > 0 && (
            <span className="nav-bell__badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
          )}
        </button>

        {bellOpen && (
          <div className="nav-notif__dropdown">
            <div className="nav-notif__header">Уведомления</div>
            {notifications.length === 0 ? (
              <div className="nav-notif__empty">Нет уведомлений</div>
            ) : (
              <ul className="nav-notif__list">
                {notifications.map(n => (
                  <li key={n.id} className={`nav-notif__item${n.read ? '' : ' nav-notif__item--unread'}`}>
                    {n.link ? (
                      <Link href={n.link} className="nav-notif__inner" onClick={() => setBellOpen(false)}>
                        <NotifContent n={n} />
                      </Link>
                    ) : (
                      <div className="nav-notif__inner">
                        <NotifContent n={n} />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

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

function NotifContent({ n }) {
  return (
    <>
      <span className="nav-notif__icon">{NOTIF_ICONS[n.type] || '🔔'}</span>
      <div className="nav-notif__body">
        <span className="nav-notif__actor">{n.actor_name}</span>
        {' '}
        <span className="nav-notif__text">{n.body}</span>
        <span className="nav-notif__time">{timeAgo(n.createdAt)}</span>
      </div>
      {n.image_url && (
        <img src={n.image_url} alt="" className="nav-notif__thumb" />
      )}
    </>
  )
}
