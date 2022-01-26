import Link from 'next/link'
import Menu from '../menu/menu';
import SearchWidget from '../menu/search';
import TopBar from '../menu/top-bar'

export default function MainLayout({children}){
  return (
    <>
      <header>
        <TopBar></TopBar>
        <nav className="top-navigation">
          <Link href="/">
            <a className="logo-link">
            <div className="logo">
              <img src="/images/newlogo2.svg"/> 
              <div className="logo__text">Стена с картинами</div>
            </div>
            </a>
          </Link>
          <Menu></Menu>
          <div className="top-search-desktop">
            <SearchWidget></SearchWidget> 
          </div>
        </nav>
      </header>
      <main>
        <div className="container">
          { children }
        </div>
      </main>
      <footer>
        <nav className="bottom-navigation">
          <Link href="/">
            <a className="logo-link">
            <div className="logo">
              <img src="/images/newlogo2.svg"/> 
              <div className="logo__text">Стена с картинами</div>
            </div>
            </a>
          </Link>
          <div className="bottom-social">
            <a href="https://www.instagram.com/stena_s_kartinami/" target="_blank" title="Стена с картинами в Instagram"><img src="/images/instagram.svg"/></a>
            <a href="https://www.facebook.com/stenaskartinami/" target="_blank" title="Стена с картинами в Facebook"><img src="/images/facebook.svg"/></a>
          </div>
        </nav>
      </footer>
    </>
  )
}