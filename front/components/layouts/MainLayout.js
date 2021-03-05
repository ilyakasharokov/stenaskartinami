import Link from 'next/link'
import Menu from '../menu/menu';
import SearchWidget from '../menu/search';

export default function MainLayout({children}){
  return (
    <>
      <header>
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
        </nav>
      </footer>
    </>
  )
}