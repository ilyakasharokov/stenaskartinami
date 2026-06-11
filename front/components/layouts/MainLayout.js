import Link from 'next/link'
import Menu from '../menu/menu'
import NavRight from '../menu/top-bar'
import dynamic from 'next/dynamic'

const SearchWidget = dynamic(() => import('../menu/search'), { ssr: false })

export default function MainLayout({ children }) {
  return (
    <>
      <header>
        <nav className="top-navigation">
          <Link href="/" className="logo-link">
            <div className="logo">
              <img src="/images/newlogo2.svg" alt="Стена с картинами" />
              <div className="logo__text">Стена с картинами</div>
            </div>
          </Link>

          <Menu />

          <div className="nav-search">
            <SearchWidget />
          </div>

          <NavRight />
        </nav>
      </header>

      <main>
        <div className="container">
          {children}
        </div>
      </main>

      <footer>
        <nav className="bottom-navigation">
          <Link href="/" className="logo-link">
            <div className="logo">
              <img src="/images/newlogo2.svg" alt="Стена с картинами" />
              <div className="logo__text">Стена с картинами</div>
            </div>
          </Link>
          <div className="footer__links">
            <Link href="/privacy-policy">Политика конфиденциальности</Link>
            <Link href="/remove-data">Запрос на удаление данных</Link>
          </div>
          <div className="bottom-social">
            <a href="https://www.instagram.com/stena_s_kartinami/" target="_blank" rel="noreferrer" title="Instagram">
              <img src="/images/instagram.svg" alt="Instagram" />
            </a>
            <a href="https://www.facebook.com/stenaskartinami/" target="_blank" rel="noreferrer" title="Facebook">
              <img src="/images/facebook.svg" alt="Facebook" />
            </a>
          </div>
        </nav>
      </footer>
    </>
  )
}
