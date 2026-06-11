import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/router'

const menuItems = [
  { title: 'Главная',          link: '/' },
  { title: 'Каталог',          link: '/catalog' },
  { title: 'Добавить картину', link: '/account/add-art' },
  { title: 'Добавить стену',   link: '/add-wall' },
]

export default function Menu() {
  const [showMenu, setShowMenu] = useState(false)
  const router = useRouter()

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
      />
      <nav className={`top-menu${showMenu ? ' active' : ''}`}>
        {menuItems.map((item) => (
          <div key={item.link} className="top-menu__item">
            <Link
              href={item.link}
              className={isActive(item.link) ? 'is-active' : ''}
              onClick={() => setShowMenu(false)}
            >
              {item.title}
            </Link>
          </div>
        ))}
      </nav>
    </div>
  )
}
