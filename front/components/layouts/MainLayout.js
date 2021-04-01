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
          <div className="logo">
            <img src="/images/Logo_stenaskartinami_black_sqr.svg"/> 
            <div className="logo__text">Стена с картинами</div>
          </div>
          <Menu></Menu>
          { /* <SearchWidget></SearchWidget> */ }
        </nav>
      </header>
      <main>
        <div className="container">
          { children }
        </div>
      </main>
      <footer>
        <nav className="bottom-navigation">
          <div className="logo">
            <img src="/images/Logo_stenaskartinami_black_sqr.svg"/> 
            <div className="logo__text">Стена с картинами</div>
          </div>
          <div className="bottom-social">
            <a href="https://www.instagram.com/stena_s_kartinami/" target="_blank" title="Стена с картинами в Instagram"><img src="/images/instagram.svg"/></a>
            <a href="https://www.facebook.com/stenaskartinami/" target="_blank" title="Стена с картинами в Facebook"><img src="/images/facebook.svg"/></a>
          </div>
        </nav>
      </footer>
    </>
  )
}