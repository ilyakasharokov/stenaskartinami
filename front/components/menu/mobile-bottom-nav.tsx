import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import { useAuthModal } from '@/components/auth/AuthModal'

const SearchWidget = dynamic(() => import('./search'), { ssr: false })

const ADD_ITEMS = [
  { title: 'Добавить картину', link: '/account/add-art' },
  { title: 'Добавить стену', link: '/add-wall' },
  { title: 'Добавить художника', link: '/add-artist' },
]
const AUTH_REQUIRED = new Set(ADD_ITEMS.map(i => i.link))

const IconCatalog = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>
)
const IconArtists = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
)
const IconSearch = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
)
const IconHome = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5L12 3l9 6.5"/><path d="M5 10v10h5v-6h4v6h5V10"/></svg>
)
const IconPlus = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
)

export default function MobileBottomNav() {
  const router = useRouter()
  const { data: session } = useSession()
  const { open: openAuth } = useAuthModal()
  const [panel, setPanel] = useState<null | 'add' | 'search'>(null)
  const close = () => setPanel(null)

  // Close any open panel on navigation.
  useEffect(() => {
    const h = () => setPanel(null)
    router.events.on('routeChangeStart', h)
    return () => router.events.off('routeChangeStart', h)
  }, [router])

  // Lock body scroll while a panel is open.
  useEffect(() => {
    if (!panel) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [panel])

  const isActive = (l: string) => (l === '/' ? router.pathname === '/' : router.pathname.startsWith(l))

  const handleAddClick = (e, link: string) => {
    close()
    if (AUTH_REQUIRED.has(link) && !session) {
      e.preventDefault()
      openAuth(link)
    }
  }

  const toggle = (p: 'add' | 'search') => setPanel(cur => (cur === p ? null : p))

  return (
    <>
      {panel && <div className="mbn-overlay" onClick={close} />}

      {panel === 'add' && (
        <div className="mbn-sheet" role="menu">
          <div className="mbn-sheet__title">Что добавить?</div>
          {ADD_ITEMS.map(it => (
            <Link key={it.link} href={it.link} className="mbn-sheet__item" onClick={(e) => handleAddClick(e, it.link)}>
              <span className="mbn-sheet__plus"><IconPlus /></span>{it.title}
            </Link>
          ))}
        </div>
      )}

      {panel === 'search' && (
        <div className="mbn-search">
          <div className="mbn-search__bar">
            <div className="mbn-search__widget"><SearchWidget /></div>
            <button type="button" className="mbn-search__cancel" onClick={close}>Отмена</button>
          </div>
        </div>
      )}

      <nav className="mobile-bottom-nav">
        <Link href="/" className={`mbn-item${isActive('/') ? ' active' : ''}`} onClick={close}>
          <IconHome /><span>Главная</span>
        </Link>
        <Link href="/catalog" className={`mbn-item${isActive('/catalog') ? ' active' : ''}`} onClick={close}>
          <IconCatalog /><span>Каталог</span>
        </Link>
        <button type="button" className={`mbn-fab${panel === 'add' ? ' open' : ''}`} onClick={() => toggle('add')} aria-label="Добавить">
          <IconPlus />
        </button>
        <Link href="/artists" className={`mbn-item${isActive('/artists') ? ' active' : ''}`} onClick={close}>
          <IconArtists /><span>Художники</span>
        </Link>
        <button type="button" className={`mbn-item${panel === 'search' ? ' active' : ''}`} onClick={() => toggle('search')}>
          <IconSearch /><span>Поиск</span>
        </button>
      </nav>
    </>
  )
}
