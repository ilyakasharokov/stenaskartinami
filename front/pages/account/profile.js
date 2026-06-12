import { useState, useEffect, useCallback, useRef } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useSession, signOut } from 'next-auth/react'
import MainLayout from '@/components/layouts/MainLayout'
import Preloader from '@/components/preloader/preloader'
import Dialog from '@/components/ui/Dialog'
import MyArtItem, { getArtStatus } from '@/components/my-arts/MyArtItem'
import CatalogCmp from '@/components/catalog/catalog'
import { fetchStrapi } from '@/utils/strapi'
import { resizeAllGridItems } from '@/utils/grid-resizer'
import throttle from '@/utils/throttle'
import imageUrlBuilder from '@/utils/img-url-builder'

const ART_FILTERS = [
  { key: 'all',       label: 'Все работы' },
  { key: 'published', label: 'В продаже' },
  { key: 'sold',      label: 'Продано' },
  { key: 'drafts',    label: 'Черновики' },
]
const PAGE_SIZE = 8
const VALID_TABS = ['overview', 'arts', 'favorite', 'settings']

const Icon = ({ d, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

function UserAvatar({ name, image, size = 120 }) {
  if (image) return <img src={image} alt={name} className="prof-avatar__img" style={{ width: size, height: size }} />
  const initials = (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  return <div className="prof-avatar__initials" style={{ width: size, height: size, fontSize: size * 0.33 }}>{initials}</div>
}

function StatusBadge({ art }) {
  if (art.sold) return <span className="art-status-badge art-status-badge--sold">Продано</span>
  const s = getArtStatus(art)
  if (s === 'published') return <span className="art-status-badge art-status-badge--pub">Опубликовано</span>
  return <span className="art-status-badge art-status-badge--mod">На модерации</span>
}

function OverviewArtCard({ art, imageOnLoad }) {
  const getPic = (a) => {
    if (!Array.isArray(a?.Pictures) || !a.Pictures[0]) return null
    const p = a.Pictures[0]
    return imageUrlBuilder(p.formats?.medium?.url || p.formats?.small?.url || p.formats?.thumbnail?.url || p.url || null)
  }
  const pic = getPic(art)
  const href = `/art/${art.slug}--${art.id}`
  return (
    <div className="catalog-item">
      <div className="catalog-item__wrapper">
        {pic && (
          <div className="catalog-item__img-wrap">
            <div className="catalog-item__btns">
              <StatusBadge art={art} />
            </div>
            <div className="overlay" />
            <Link href={href} className="catalog-item__img-link" title={art.Title}>
              <img className="catalog-item__img" src={pic} alt={art.Title} onLoad={imageOnLoad} />
            </Link>
          </div>
        )}
        <Link href={href}>
          <div className="catalog-item__title">{art.Title}</div>
        </Link>
        {art.width && art.height && <div className="catalog-item__size">{art.width} x {art.height}</div>}
        <div className="catalog-item__artist-price">
          <div className="catalog-item__price">
            {art.sold ? 'ПРОДАНО' : art.Price ? art.Price + ' ₽' : ''}
          </div>
        </div>
      </div>
    </div>
  )
}

function ProfileCompletion({ info, session }) {
  const steps = [
    { label: 'Фото профиля',   done: !!(info?.profile_image || session?.user?.image) },
    { label: 'Имя пользователя', done: !!(info?.username) },
    { label: 'О себе',         done: !!(info?.bio) },
    { label: 'Местоположение', done: !!(info?.location) },
  ]
  const pct = Math.round((steps.filter(s => s.done).length / steps.length) * 100)
  const r = 22, circ = 2 * Math.PI * r
  const dash = circ * (1 - pct / 100)
  return (
    <div className="prof-completion">
      <div className="prof-completion__head">
        <svg viewBox="0 0 52 52" className="prof-completion__ring" width="52" height="52">
          <circle cx="26" cy="26" r={r} fill="none" stroke="#f0f0f0" strokeWidth="4" />
          <circle cx="26" cy="26" r={r} fill="none" stroke="#dc3a0f" strokeWidth="4"
            strokeDasharray={circ} strokeDashoffset={dash}
            strokeLinecap="round" transform="rotate(-90 26 26)" />
        </svg>
        <div>
          <div className="prof-completion__pct">{pct}%</div>
          <div className="prof-completion__label">Профиль заполнен</div>
        </div>
      </div>
      <div className="prof-completion__bar">
        <div className="prof-completion__bar-fill" style={{ width: pct + '%' }} />
      </div>
      <div className="prof-completion__hint">Заполните профиль, чтобы привлечь больше покупателей</div>
    </div>
  )
}

export default function ProfilePage() {
  const { data: session, status, update } = useSession()
  const router = useRouter()

  const [activeTab, setActiveTab] = useState(() => {
    const t = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('tab') : null
    return VALID_TABS.includes(t) ? t : 'overview'
  })

  const [artFilter, setArtFilter] = useState('all')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [arts, setArts] = useState([])
  const [artsLoading, setArtsLoading] = useState(true)
  const [favoriteArts, setFavoriteArts] = useState([])
  const [favoritesLoading, setFavoritesLoading] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState({ open: false, documentId: null, deleting: false })

  // cover / avatar upload
  const coverInputRef = useRef(null)
  const avatarInputRef = useRef(null)
  const [coverSrc, setCoverSrc] = useState(null)
  const [avatarSrc, setAvatarSrc] = useState(null)
  const [coverUploading, setCoverUploading] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)

  // settings form
  const [username, setUsername]     = useState('')
  const [bio, setBio]               = useState('')
  const [location, setLocation]     = useState('')
  const [website, setWebsite]       = useState('')
  const [instagram, setInstagram]   = useState('')
  const [tgHandle, setTgHandle]     = useState('')
  const [saving, setSaving]         = useState(false)
  const [saveError, setSaveError]   = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)

  const info = session?.info

  const resizeThrottled = throttle(
    () => resizeAllGridItems('catalog-item', 'catalog-grid', '.catalog-item__wrapper'),
    100
  )

  useEffect(() => {
    if (status === 'loading' || !session?.jwt) return
    fetchStrapi(`${process.env.NEXT_PUBLIC_API_URL}/arts/my`, {
      headers: { Authorization: `Bearer ${session.jwt}` },
    }).then(data => setArts(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setArtsLoading(false))
  }, [session, status])

  useEffect(() => {
    if (!artsLoading) setTimeout(resizeThrottled, 50)
    window.addEventListener('resize', resizeThrottled)
    return () => window.removeEventListener('resize', resizeThrottled)
  }, [artsLoading, arts, artFilter, visibleCount, activeTab])

  useEffect(() => {
    const t = router.query.tab
    if (VALID_TABS.includes(t)) setActiveTab(t)
  }, [router.query.tab])

  useEffect(() => {
    if (!info) return
    if (info.username)        setUsername(info.username)
    if (info.bio)             setBio(info.bio)
    if (info.location)        setLocation(info.location)
    if (info.website)         setWebsite(info.website)
    if (info.instagram)       setInstagram(info.instagram)
    if (info.telegram_handle) setTgHandle(info.telegram_handle)
    if (info.cover_image?.url)   setCoverSrc(imageUrlBuilder(info.cover_image.url))
    if (info.profile_image?.url) setAvatarSrc(imageUrlBuilder(info.profile_image.url))
  }, [info])

  useEffect(() => {
    if (activeTab !== 'favorite') return
    const ids = Array.isArray(info?.arts) ? info.arts.map(a => a.id).filter(Boolean) : []
    if (!ids.length) { setFavoriteArts([]); return }
    setFavoritesLoading(true)
    const params = new URLSearchParams({
      'populate[0]': 'Pictures', 'populate[1]': 'Artist',
      'populate[2]': 'styles',   'populate[3]': 'subjects',
      'populate[4]': 'mediums',  'populate[5]': 'wall',
      'pagination[pageSize]': '100',
    })
    ids.forEach((id, i) => params.append(`filters[id][$in][${i}]`, id))
    fetchStrapi(`${process.env.NEXT_PUBLIC_API_URL}/arts?${params}`)
      .then(data => setFavoriteArts(Array.isArray(data) ? [...data].reverse() : []))
      .catch(() => setFavoriteArts([]))
      .finally(() => setFavoritesLoading(false))
  }, [activeTab, info?.arts])

  // ─── Upload helpers ──────────────────────────────────────────────────────────
  async function uploadToStrapi(file) {
    const formData = new FormData()
    formData.append('files', file)
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.jwt}` },
      body: formData,
    })
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
    const arr = await res.json()
    return arr[0]?.id
  }

  async function handleCoverChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const preview = URL.createObjectURL(file)
    setCoverSrc(preview)
    setCoverUploading(true)
    try {
      const fileId = await uploadToStrapi(file)
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/me/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.jwt}` },
        body: JSON.stringify({ cover_image: fileId }),
      })
      update().catch(() => {})
    } catch {
      setCoverSrc(info?.cover_image?.url ? imageUrlBuilder(info.cover_image.url) : null)
    } finally {
      setCoverUploading(false)
      e.target.value = ''
    }
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const preview = URL.createObjectURL(file)
    setAvatarSrc(preview)
    setAvatarUploading(true)
    try {
      const fileId = await uploadToStrapi(file)
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/me/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.jwt}` },
        body: JSON.stringify({ profile_image: fileId }),
      })
      update().catch(() => {})
    } catch {
      setAvatarSrc(info?.profile_image?.url ? imageUrlBuilder(info.profile_image.url) : null)
    } finally {
      setAvatarUploading(false)
      e.target.value = ''
    }
  }

  // ─── Arts helpers ────────────────────────────────────────────────────────────
  const filteredArts = arts.filter(a => {
    const s = getArtStatus(a)
    if (artFilter === 'published') return s === 'published' && !a.sold
    if (artFilter === 'sold')      return !!a.sold
    if (artFilter === 'drafts')    return s === 'moderation'
    return true
  })
  const visibleArts = filteredArts.slice(0, visibleCount)
  const hasMore = filteredArts.length > visibleCount
  const recentArts = [...arts].slice(0, 4)

  const stats = {
    total:     arts.length,
    sale:      arts.filter(a => getArtStatus(a) === 'published' && !a.sold).length,
    sold:      arts.filter(a => !!a.sold).length,
    moderation: arts.filter(a => getArtStatus(a) === 'moderation').length,
  }

  const handleDelete = useCallback((documentId) => {
    setDeleteDialog({ open: true, documentId, deleting: false })
  }, [])

  async function confirmDelete() {
    const { documentId } = deleteDialog
    setDeleteDialog(d => ({ ...d, deleting: true }))
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/arts/${documentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.jwt}` },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setArts(prev => prev.filter(a => a.documentId !== documentId))
      setDeleteDialog({ open: false, documentId: null, deleting: false })
    } catch {
      setDeleteDialog(d => ({ ...d, deleting: false }))
    }
  }

  async function saveProfile(e) {
    e.preventDefault()
    setSaving(true); setSaveError('')
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/me/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.jwt}` },
        body: JSON.stringify({ username, bio, location, website, instagram, telegram_handle: tgHandle }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d?.error?.message || `HTTP ${res.status}`)
      }
      await update()
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // ─── Render guards ───────────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <MainLayout>
        <Head><title>Профиль | Стена с картинами</title></Head>
        <div className="my-arts-loading"><Preloader /></div>
      </MainLayout>
    )
  }
  if (!session) {
    return (
      <MainLayout>
        <Head><title>Профиль | Стена с картинами</title></Head>
        <div style={{ padding: '60px 0', textAlign: 'center', color: '#888' }}>Вы не авторизованы</div>
      </MainLayout>
    )
  }

  const displayName = info?.username || session.user?.name || '—'
  const joinedDate = info?.createdAt
    ? new Date(info.createdAt).toLocaleDateString('ru-RU', { year: 'numeric', month: 'long' })
    : null
  const avatarImage = avatarSrc || session.user?.image || null

  const TABS = [
    { key: 'overview',  label: 'Обзор' },
    { key: 'arts',      label: 'Работы' },
    { key: 'favorite',  label: 'Избранное' },
    { key: 'settings',  label: 'Настройки' },
  ]

  return (
    <MainLayout>
      <Head><title>Профиль | Стена с картинами</title></Head>

      <div className="prof-page">

        {/* Cover */}
        <div className="prof-cover" style={coverSrc ? { backgroundImage: `url(${coverSrc})` } : {}}>
          {coverSrc && <div className="prof-cover__overlay" />}
          <input ref={coverInputRef} type="file" accept="image/*" className="prof-upload-input" onChange={handleCoverChange} />
          <button className="prof-cover__change-btn" onClick={() => coverInputRef.current?.click()} disabled={coverUploading}>
            {coverUploading
              ? <><span className="prof-upload-spinner" /> Загрузка…</>
              : <><Icon d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" size={14} /> Изменить обложку</>
            }
          </button>
        </div>

        {/* Profile header */}
        <div className="prof-header">
          <div className="prof-header__left">
            {/* Avatar */}
            <div className="prof-avatar">
              <UserAvatar name={displayName} image={avatarImage} size={120} />
              <input ref={avatarInputRef} type="file" accept="image/*" className="prof-upload-input" onChange={handleAvatarChange} />
              <button className="prof-avatar__cam" onClick={() => avatarInputRef.current?.click()} disabled={avatarUploading} title="Изменить фото">
                {avatarUploading
                  ? <span className="prof-upload-spinner prof-upload-spinner--sm" />
                  : <Icon d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2zM12 15a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" size={13} />
                }
              </button>
            </div>

            {/* Identity */}
            <div className="prof-identity">
              <div className="prof-identity__name">
                {displayName}
                {info?.confirmed && <span className="prof-identity__badge">✓</span>}
              </div>
              <div className="prof-identity__meta">
                <span className="prof-identity__handle">@{(info?.username || displayName).toLowerCase().replace(/\s+/g, '')}</span>
                {info?.location && (
                  <span className="prof-identity__loc">
                    <Icon d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" size={12} />
                    {info.location}
                  </span>
                )}
              </div>
              {info?.bio && <div className="prof-identity__bio">{info.bio}</div>}
              {(info?.website || info?.instagram || info?.telegram_handle) && (
                <div className="prof-identity__links">
                  {info.website && (
                    <a href={info.website.startsWith('http') ? info.website : `https://${info.website}`}
                       target="_blank" rel="noopener noreferrer" className="prof-social-link" title="Сайт">
                      <Icon d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zM2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" size={15} />
                    </a>
                  )}
                  {info.instagram && (
                    <a href={`https://instagram.com/${info.instagram.replace('@', '')}`}
                       target="_blank" rel="noopener noreferrer" className="prof-social-link" title="Instagram">
                      <Icon d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37zm1.5-4.87h.01M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2z" size={15} />
                    </a>
                  )}
                  {info.telegram_handle && (
                    <a href={`https://t.me/${info.telegram_handle.replace('@', '')}`}
                       target="_blank" rel="noopener noreferrer" className="prof-social-link" title="Telegram">
                      <Icon d="M21.87 5.54L18.5 19.1c-.24 1.08-.9 1.35-1.82.84l-5-3.68-2.41 2.32c-.27.27-.49.49-.99.49l.36-5.04L17.4 7.37c.42-.37-.09-.58-.65-.2L6.2 13.7l-4.86-1.52c-1.06-.33-1.08-1.06.22-1.57L20.6 4c.88-.32 1.65.19 1.27 1.54z" size={15} />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="prof-header__right">
            <div className="prof-stats-row">
              <div className="prof-stat">
                <div className="prof-stat__val">{stats.total}</div>
                <div className="prof-stat__lbl">картин</div>
              </div>
              <div className="prof-stat">
                <div className="prof-stat__val">{stats.sale}</div>
                <div className="prof-stat__lbl">в продаже</div>
              </div>
              <div className="prof-stat">
                <div className="prof-stat__val">{stats.sold}</div>
                <div className="prof-stat__lbl">продано</div>
              </div>
              {joinedDate && (
                <div className="prof-stat prof-stat--date">
                  <div className="prof-stat__lbl">с {joinedDate}</div>
                </div>
              )}
            </div>
            <div className="prof-header__actions">
              <button className="prof-btn prof-btn--outline" onClick={() => setActiveTab('settings')}>
                <Icon d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" size={13} />
                Редактировать
              </button>
              <button className="prof-btn prof-btn--ghost" onClick={() => signOut()}>
                <Icon d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" size={13} />
                Выйти
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="prof-tabs">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              className={`prof-tabs__btn${activeTab === key ? ' is-active' : ''}`}
              onClick={() => setActiveTab(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── ОБЗОР ── */}
        {activeTab === 'overview' && (
          <div className="prof-overview">
            <div className="prof-overview__main">
              <div className="prof-section">
                <div className="prof-section__head">
                  <div className="prof-section__title">Последние работы</div>
                  {arts.length > 4 && (
                    <button className="prof-section__more" onClick={() => setActiveTab('arts')}>
                      Смотреть все работы →
                    </button>
                  )}
                </div>
                {artsLoading ? (
                  <div className="my-arts-loading"><Preloader /></div>
                ) : recentArts.length > 0 ? (
                  <div className="catalog-grid">
                    {recentArts.map(art => (
                      <OverviewArtCard key={art.id} art={art} imageOnLoad={resizeThrottled} />
                    ))}
                  </div>
                ) : (
                  <div className="prof-empty">
                    <div className="prof-empty__text">Работ пока нет</div>
                    <Link href="/account/add-art" className="prof-empty__btn">+ Добавить работу</Link>
                  </div>
                )}
                {!artsLoading && (
                  <div className="prof-section__add">
                    <Link href="/account/add-art" className="prof-add-btn">+ Добавить работу</Link>
                  </div>
                )}
              </div>
            </div>

            <div className="prof-sidebar">
              <div className="prof-sidebar-card">
                <div className="prof-sidebar-card__head">
                  <span>О себе</span>
                  <button className="prof-sidebar-card__edit" onClick={() => setActiveTab('settings')}>Редактировать</button>
                </div>
                {info?.bio
                  ? <p className="prof-sidebar-card__bio">{info.bio}</p>
                  : <p className="prof-sidebar-card__bio prof-sidebar-card__bio--empty">Расскажите о себе и своём творчестве</p>
                }
              </div>
              <ProfileCompletion info={info} session={session} />
            </div>
          </div>
        )}

        {/* ── РАБОТЫ ── */}
        {activeTab === 'arts' && (
          <div>
            <div className="profile-arts-toolbar">
              <div className="art-filters">
                {ART_FILTERS.map(({ key, label }) => (
                  <button key={key}
                    className={`art-filters__btn${artFilter === key ? ' is-active' : ''}`}
                    onClick={() => { setArtFilter(key); setVisibleCount(PAGE_SIZE) }}>
                    {label}
                  </button>
                ))}
              </div>
              <Link href="/account/add-art" className="profile-add-btn">+ Добавить работу</Link>
            </div>
            {artsLoading ? (
              <div className="my-arts-loading"><Preloader /></div>
            ) : visibleArts.length > 0 ? (
              <>
                <div className="catalog-grid">
                  {visibleArts.map(art => (
                    <MyArtItem key={art.id} art={art} onDelete={handleDelete} imageOnLoad={resizeThrottled} />
                  ))}
                </div>
                {hasMore && (
                  <div className="profile-load-more-wrap">
                    <button className="profile-load-more" onClick={() => setVisibleCount(c => c + PAGE_SIZE)}>
                      Показать ещё работы
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.61"/></svg>
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="my-arts-empty">
                <div className="my-arts-empty__title">
                  {artFilter === 'all' ? 'У вас пока нет работ' : 'Нет работ в этой категории'}
                </div>
                {artFilter === 'all' && (
                  <>
                    <div className="my-arts-empty__text">Добавьте первую работу, чтобы разместить её в галерее</div>
                    <Link href="/account/add-art" className="my-arts-empty__btn">+ Добавить работу</Link>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── ИЗБРАННОЕ ── */}
        {activeTab === 'favorite' && (
          <div>
            {favoritesLoading ? (
              <div className="my-arts-loading"><Preloader /></div>
            ) : favoriteArts.length > 0 ? (
              <CatalogCmp arts={favoriteArts} hideFiltersForce={true} hideSort={true} title="" />
            ) : (
              <div className="my-arts-empty">
                <div className="my-arts-empty__title">В избранном пока ничего нет</div>
                <div className="my-arts-empty__text">Добавляйте понравившиеся работы в избранное</div>
                <Link href="/catalog" className="my-arts-empty__btn">Перейти в каталог</Link>
              </div>
            )}
          </div>
        )}

        {/* ── НАСТРОЙКИ ── */}
        {activeTab === 'settings' && (
          <div className="prof-settings">
            <form className="prof-settings-form" onSubmit={saveProfile}>
              <div className="prof-settings-card">
                <div className="prof-settings-card__title">Основная информация</div>
                {saveSuccess && <div className="prof-alert prof-alert--success">Профиль сохранён</div>}
                {saveError   && <div className="prof-alert prof-alert--error">{saveError}</div>}

                <div className="prof-field">
                  <label className="prof-field__label">Имя пользователя</label>
                  <input className="prof-input" value={username} onChange={e => setUsername(e.target.value)} maxLength={50} placeholder="Ваше имя" />
                </div>
                <div className="prof-field">
                  <label className="prof-field__label">Email</label>
                  <input className="prof-input" value={session.user?.email || ''} disabled />
                </div>
                <div className="prof-field">
                  <label className="prof-field__label">О себе</label>
                  <textarea className="prof-input" value={bio} onChange={e => setBio(e.target.value)} rows={4} maxLength={500} placeholder="Расскажите о себе и своём творчестве…" />
                </div>
                <div className="prof-field">
                  <label className="prof-field__label">Местоположение</label>
                  <input className="prof-input" value={location} onChange={e => setLocation(e.target.value)} maxLength={100} placeholder="Москва, Россия" />
                </div>
              </div>

              <div className="prof-settings-card">
                <div className="prof-settings-card__title">Социальные сети</div>
                <div className="prof-field">
                  <label className="prof-field__label">Сайт</label>
                  <input className="prof-input" value={website} onChange={e => setWebsite(e.target.value)} maxLength={200} placeholder="yoursite.com" />
                </div>
                <div className="prof-field">
                  <label className="prof-field__label">Instagram</label>
                  <div className="prof-field__prefix-wrap">
                    <span className="prof-field__prefix">@</span>
                    <input className="prof-input prof-field__prefix-input" value={instagram} onChange={e => setInstagram(e.target.value)} maxLength={50} placeholder="username" />
                  </div>
                </div>
                <div className="prof-field">
                  <label className="prof-field__label">Telegram</label>
                  <div className="prof-field__prefix-wrap">
                    <span className="prof-field__prefix">@</span>
                    <input className="prof-input prof-field__prefix-input" value={tgHandle} onChange={e => setTgHandle(e.target.value)} maxLength={50} placeholder="username" />
                  </div>
                </div>
              </div>

              <div className="prof-settings-actions">
                <button type="submit" className="prof-btn prof-btn--primary" disabled={saving}>
                  {saving ? 'Сохранение…' : 'Сохранить изменения'}
                </button>
              </div>
            </form>
          </div>
        )}

      </div>

      <Dialog
        open={deleteDialog.open}
        onClose={() => !deleteDialog.deleting && setDeleteDialog({ open: false, documentId: null, deleting: false })}
        title="Удалить работу?" danger
        actions={
          <>
            <button className="dialog-btn dialog-btn--ghost" onClick={() => setDeleteDialog({ open: false, documentId: null, deleting: false })} disabled={deleteDialog.deleting}>Отмена</button>
            <button className="dialog-btn dialog-btn--danger" onClick={confirmDelete} disabled={deleteDialog.deleting}>{deleteDialog.deleting ? 'Удаление…' : 'Удалить'}</button>
          </>
        }
      >
        Работа будет удалена безвозвратно. Восстановить её не получится.
      </Dialog>
    </MainLayout>
  )
}
