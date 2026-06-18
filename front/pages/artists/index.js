import MainLayout from '@/components/layouts/MainLayout'
import Head from 'next/head'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import Router from 'next/router'
import { API_HOST } from '@/constants/constants'

const ARTISTS_PER_PAGE = 21
import { fetchStrapi } from '@/utils/strapi'
import { cachedFetch } from '@/utils/server-cache'
import ArtistCard from '@/components/artists/ArtistCard'
import Pagination from '@/components/catalog/pagination'

const FILTER_ITEMS_NUM = 6

function ArtistFilters({ filterOptions, onChange, onHide }) {
  const router = useRouter()
  const [searchText, setSearchText]   = useState(router.query?.q || '')
  const [activeDir, setActiveDir]     = useState([])
  const [activeTech, setActiveTech]   = useState([])
  const [showAllDir, setShowAllDir]   = useState(false)
  const [showAllTech, setShowAllTech] = useState(false)
  const [dirOpen, setDirOpen]         = useState(true)
  const [techOpen, setTechOpen]       = useState(true)
  const searchTimer = useRef(null)

  useEffect(() => {
    setSearchText(router.query?.q || '')
    setActiveDir(router.query?.directions ? [].concat(router.query.directions) : [])
    setActiveTech(router.query?.techniques ? [].concat(router.query.techniques) : [])
  }, [router.query])

  function pushQuery(patch) {
    const q = { ...Router.query, ...patch }
    if (!q.q) delete q.q
    if (!q.directions?.length) delete q.directions
    if (!q.techniques?.length) delete q.techniques
    delete q.page
    onChange()
    Router.push({ pathname: Router.pathname, query: q })
  }

  function handleSearch(e) {
    const val = e.target.value
    setSearchText(val)
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => pushQuery({ q: val }), 400)
  }

  function toggleDir(slug) {
    const next = activeDir.includes(slug) ? activeDir.filter(s => s !== slug) : [...activeDir, slug]
    setActiveDir(next)
    pushQuery({ directions: next })
  }

  function toggleTech(slug) {
    const next = activeTech.includes(slug) ? activeTech.filter(s => s !== slug) : [...activeTech, slug]
    setActiveTech(next)
    pushQuery({ techniques: next })
  }

  function reset() {
    setSearchText(''); setActiveDir([]); setActiveTech([])
    Router.push({ pathname: Router.pathname, query: {} })
    onChange()
  }

  const hasFilters = !!(searchText || activeDir.length || activeTech.length)

  const dirs  = filterOptions.directions || []
  const techs = filterOptions.techniques || []

  function FilterSection({ title, items, active, onToggle, showAll, onShowAll, open, onToggleOpen }) {
    return (
      <div className="catalog-filters__section">
        <div className="catalog-filters__section-top" onClick={onToggleOpen}>
          <div className="catalog-filters__section-title">{title}</div>
          <div className="catalog-filters__section-expand-btn">
            {open
              ? <svg className="minus" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 1"><path d="M0 0h10v1H0V0z" fill="#333"/></svg>
              : <svg viewBox="0 0 13 13" xmlns="http://www.w3.org/2000/svg"><g fill="#333" fillRule="evenodd"><path d="M0 6h13v1H0z"/><path d="M6 0h1v13H6z"/></g></svg>
            }
          </div>
        </div>
        <div className="catalog-filters__collapsable" style={{ maxHeight: open ? `${((showAll ? items.length : Math.min(items.length, FILTER_ITEMS_NUM)) + 1) * 45}px` : '0px' }}>
          {(showAll ? items : items.slice(0, FILTER_ITEMS_NUM)).map(item => (
            <div className="catalog-filters__item" key={item}>
              <div className={`checkbox${active.includes(item) ? ' checkbox--active' : ''}`} onClick={() => onToggle(item)} />
              <div>{item}</div>
            </div>
          ))}
          {!showAll && items.length > FILTER_ITEMS_NUM && (
            <div className="catalog-filters__show-all" onClick={onShowAll}>Показать ещё</div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="catalog-filters">
      <div className="align-right">
        <div className="close-btn" onClick={onHide} />
      </div>
      <div className="catalog-filters__search">
        <input
          type="text"
          className="catalog-filters__search-input"
          placeholder="Имя художника, направление..."
          value={searchText}
          onChange={handleSearch}
        />
      </div>
      <div className="catalog-filters__sections">
        <FilterSection
          title="Направление"
          items={dirs}
          active={activeDir}
          onToggle={toggleDir}
          showAll={showAllDir}
          onShowAll={() => setShowAllDir(true)}
          open={dirOpen}
          onToggleOpen={() => setDirOpen(v => !v)}
        />
        <FilterSection
          title="Техника"
          items={techs}
          active={activeTech}
          onToggle={toggleTech}
          showAll={showAllTech}
          onShowAll={() => setShowAllTech(true)}
          open={techOpen}
          onToggleOpen={() => setTechOpen(v => !v)}
        />
      </div>
      {hasFilters && (
        <div style={{ padding: '8px 0' }}>
          <button className="catalog-filters__show-all" onClick={reset} style={{ color: '#e05a2b' }}>Сбросить фильтры</button>
        </div>
      )}
      <div className="align-center">
        <div className="btn hide-big" onClick={onHide}>Применить</div>
      </div>
    </div>
  )
}

export default function ArtistsCatalog({ artists, filterOptions, totalCount }) {
  const router = useRouter()
  const [showFilters, setShowFilters] = useState(false)
  const [loading, setLoading] = useState(false)
  const [displayArtists, setDisplayArtists] = useState(artists)

  const currentPage = parseInt(router.query?.page, 10) || 1

  useEffect(() => {
    const { q, directions, techniques } = router.query
    let result = artists

    if (q) {
      const lq = q.toLowerCase()
      result = result.filter(a =>
        a.full_name?.toLowerCase().includes(lq) ||
        (Array.isArray(a.directions) && a.directions.some(d => d.toLowerCase().includes(lq)))
      )
    }
    if (directions) {
      const dirs = [].concat(directions)
      result = result.filter(a =>
        Array.isArray(a.directions) && dirs.some(d => a.directions.includes(d))
      )
    }
    if (techniques) {
      const techs = [].concat(techniques)
      result = result.filter(a =>
        Array.isArray(a.techniques) && techs.some(t => a.techniques.includes(t))
      )
    }

    setDisplayArtists(result)
    setLoading(false)
  }, [router.query, artists])

  const pageStart = (currentPage - 1) * ARTISTS_PER_PAGE
  const pageArtists = displayArtists.slice(pageStart, pageStart + ARTISTS_PER_PAGE)

  function setPage(num) {
    const q = { ...router.query, page: num }
    if (num === 1) delete q.page
    Router.push({ pathname: router.pathname, query: q })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <MainLayout>
      <Head>
        <title>Художники | Стена с картинами</title>
        <meta name="description" content="Откройте для себя талантливых художников и их работы" />
      </Head>

      <div className="ac-page">
        <div className="ac-page__header">
          <div>
            <h1 className="ac-page__title">Художники</h1>
            <p className="ac-page__sub">Откройте для себя талантливых художников и их работы</p>
          </div>
          <div className="ac-page__meta">
            <span className="ac-page__count">{displayArtists.length} художников</span>
          </div>
        </div>

        <div className={`catalog${showFilters ? ' catalog--show-filters' : ''}`}>
          <div>
            <div className="catalog__toggle-filters" onClick={() => setShowFilters(v => !v)}>
              <img src="/images/filter.png" />
              <div>Фильтры</div>
            </div>
            <ArtistFilters
              filterOptions={filterOptions}
              onChange={() => setLoading(true)}
              onHide={() => setShowFilters(false)}
            />
          </div>

          <div className="catalog-wrapper">
            {loading && <div className="ac-page__loading" />}
            {pageArtists.length > 0 ? (
              <div className="ac-grid">
                {pageArtists.map(a => (
                  <ArtistCard key={a.id} artist={a} />
                ))}
              </div>
            ) : (
              <div className="catalog__no-results">По данным критериям художников не найдено</div>
            )}
            <Pagination
              currentPage={currentPage}
              count={displayArtists.length}
              setPage={setPage}
              pageSize={ARTISTS_PER_PAGE}
            />
          </div>
        </div>
      </div>
    </MainLayout>
  )
}

export const getServerSideProps = async () => {
  try {
    const query = '?populate[0]=avatar&populate[1]=cover&filters[publishedAt][$notNull]=true&sort=full_name:asc&pagination[pageSize]=500'

    const artists = await cachedFetch('artists:catalog', 300, () =>
      fetchStrapi(API_HOST + '/artists' + query)
    )

    const list = Array.isArray(artists) ? artists : []

    const allDirs  = [...new Set(list.flatMap(a => Array.isArray(a.directions) ? a.directions : []))].sort()
    const allTechs = [...new Set(list.flatMap(a => Array.isArray(a.techniques) ? a.techniques : []))].sort()

    return {
      props: {
        artists: list,
        filterOptions: { directions: allDirs, techniques: allTechs },
        totalCount: list.length,
      },
    }
  } catch (e) {
    console.error(e)
    return { props: { artists: [], filterOptions: { directions: [], techniques: [] }, totalCount: 0 } }
  }
}
