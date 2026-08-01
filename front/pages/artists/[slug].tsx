import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import MainLayout from '@/components/layouts/MainLayout'
import { API_HOST } from '@/constants/constants'
import { fetchStrapi } from '@/utils/strapi'
import serialize from '@/utils/serialize'
import imageUrlBuilder from '@/utils/img-url-builder'
import CatalogItem from '@/components/catalog/catalog-item'
import { Heart, Eye } from '@/components/ui/icons'
import { resizeAllGridItems } from '@/utils/grid-resizer'
import throttle from '@/utils/throttle'
import { pluralWorks, pluralWalls, pluralFollowers } from '@/utils/plural'

function fmtExhibitionDate(d) {
  if (!d) return ''
  try {
    return new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch { return d }
}

function exPeriod(ex) {
  if (ex.date_from || ex.date_to) {
    const from = ex.date_from ? fmtExhibitionDate(ex.date_from) : ''
    const to = ex.date_to ? fmtExhibitionDate(ex.date_to) : ''
    if (from && to && from !== to) return `${from} – ${to}`
    return from || to
  }
  if (ex.year_from) {
    return ex.year_to && ex.year_to !== ex.year_from ? `${ex.year_from}–${ex.year_to}` : String(ex.year_from)
  }
  return ex.year ? String(ex.year) : ''
}

function Icon({ d, size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  )
}

const TABS = [
  { key: 'works',  label: 'Работы' },
  { key: 'walls',  label: 'Стены' },
  { key: 'about',  label: 'О художнике' },
]

export default function ArtistPage({ artist: initialArtist }) {
  const { data: session } = useSession()
  const [artist, setArtist] = useState(initialArtist)
  const [activeTab, setActiveTab] = useState('works')
  const [followBusy, setFollowBusy] = useState(false)

  const resizeMasonry = throttle(() => resizeAllGridItems('catalog-item', 'ap-catalog-grid', '.catalog-item__wrapper'), 100)

  useEffect(() => {
    resizeMasonry()
    window.addEventListener('resize', resizeMasonry)
    return () => window.removeEventListener('resize', resizeMasonry)
  }, [activeTab, artist])

  useEffect(() => {
    if (!session?.jwt || !initialArtist?.documentId) return
    // Refetch fresh — including Arts — so a just-published work shows without
    // waiting for ISR revalidation (fixes "3 работы" counter vs empty grid).
    const populate = 'populate[avatar]=true&populate[cover]=true&populate[photos]=true'
      + '&populate[Arts][populate][0]=Pictures&populate[Arts][populate][1]=wall'
      + '&populate[Arts][populate][2]=styles&populate[Arts][populate][3]=subjects&populate[Arts][populate][4]=mediums'
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/artists/${initialArtist.documentId}?${populate}`, {
      headers: { Authorization: `Bearer ${session.jwt}` },
    })
      .then(r => r.json())
      .then(json => { if (json?.data) setArtist(a => ({ ...a, ...json.data })) })
      .catch(() => {})
  }, [session?.jwt, initialArtist?.documentId])

  if (!artist) {
    return (
      <MainLayout>
        <div style={{ padding: '60px 0', textAlign: 'center', color: '#888' }}>Художник не найден</div>
      </MainLayout>
    )
  }

  const arts = Array.isArray(artist.Arts) ? artist.Arts : []
  const photos = Array.isArray(artist.photos) ? artist.photos : []
  const exhibitions = Array.isArray(artist.exhibitions) ? artist.exhibitions : []
  const directions = Array.isArray(artist.directions) ? artist.directions : []
  const techniques = Array.isArray(artist.techniques) ? artist.techniques : []
  const subjects = Array.isArray(artist.subjects) ? artist.subjects : []
  const social = artist.social_links || {}

  const walls = []
  const seenWallIds = new Set()
  arts.forEach(a => {
    const w = a.wall
    if (w && !seenWallIds.has(w.documentId)) {
      seenWallIds.add(w.documentId)
      walls.push(w)
    }
  })

  const coverImg = artist.cover ? imageUrlBuilder(artist.cover.formats?.large?.url || artist.cover.formats?.medium?.url || artist.cover.url) : null
  const avatarImg = artist.avatar ? imageUrlBuilder(artist.avatar.formats?.small?.url || artist.avatar.url) : null
  const isVerified = artist.profile_type === 'real_user'
  const isOwner = session && artist.user_uploader && String((session as any).id || session.info?.id) === String(artist.user_uploader.id)
  const isFollowing = !!artist.isFollowing
  const location = [artist.country, artist.city_name].filter(Boolean).join(', ')

  const toggleFollow = async () => {
    if (!session?.jwt) return
    setFollowBusy(true)
    try {
      const action = isFollowing ? 'unfollow' : 'follow'
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/artists/${artist.documentId}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.jwt}` },
      })
      const json = await res.json()
      if (res.ok) {
        setArtist(a => ({ ...a, isFollowing: json.isFollowing, followersCount: json.followersCount }))
      }
    } catch {} finally {
      setFollowBusy(false)
    }
  }

  const artistSlug    = (artist.slug || artist.documentId || '') + '--' + artist.id
  const canonicalUrl  = `https://stenaskartinami.com/artists/${artistSlug}`
  const ogImage       = avatarImg || coverImg || 'https://stenaskartinami.com/images/slidebg.jpg'
  const artistDescRaw = typeof artist.description === 'string' ? artist.description.replace(/<[^>]+>/g, '').trim() : ''
  const dirNames      = Array.isArray(artist.directions) ? artist.directions.slice(0, 3).join(', ') : ''
  const metaDesc      = (artistDescRaw ? artistDescRaw.slice(0, 110) + '. ' : '') +
    [dirNames, location, artist.works_count ? `${artist.works_count} ${pluralWorks(artist.works_count)}` : ''].filter(Boolean).join(', ')
  const metaDescClean = metaDesc.slice(0, 160) || `Художник ${artist.full_name} — работы, биография и выставки на Стена с картинами.`

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: artist.full_name,
    url: canonicalUrl,
    ...(ogImage ? { image: ogImage } : {}),
    ...(artistDescRaw ? { description: artistDescRaw.slice(0, 500) } : {}),
    ...(location ? { address: location } : {}),
  }

  return (
    <MainLayout>
      <Head>
        <title>{artist.full_name} — художник, купить картины | Стена с картинами</title>
        <meta name="description" content={metaDescClean} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:type"        content="profile" />
        <meta property="og:site_name"   content="Стена с картинами" />
        <meta property="og:title"       content={`${artist.full_name} — художник`} />
        <meta property="og:description" content={metaDescClean} />
        <meta property="og:url"         content={canonicalUrl} />
        <meta property="og:image"       content={ogImage} />
        <meta name="twitter:card"        content="summary_large_image" />
        <meta name="twitter:title"       content={`${artist.full_name} — художник`} />
        <meta name="twitter:description" content={metaDescClean} />
        <meta name="twitter:image"       content={ogImage} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </Head>

      <div className="wp ap">
        {/* ── Hero ── */}
        <div className="wp-hero ap-hero">
          {coverImg
            ? <img src={coverImg} alt={artist.full_name} className="wp-hero__img" />
            : <div className="wp-hero__placeholder" />
          }
          <div className="wp-hero__overlay" />

          <div className="wp-hero__top-actions">
            <button className="wp-hero__top-btn" onClick={() => navigator.share?.({ title: artist.full_name, url: window.location.href })}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              Поделиться
            </button>
          </div>

          <div className="wp-hero__content">
            <div className="wp-hero__badges">
              {isVerified && (
                <div className="wp-hero__badge">
                  <svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" fill="currentColor"/></svg>
                  Подтверждённый художник
                </div>
              )}
              {artist.is_ai && (
                <div className="wp-hero__badge wp-hero__badge--ai" title="Профиль и работы созданы нейросетью">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/></svg>
                  ИИ-автор
                </div>
              )}
            </div>
            <div className="ap-hero__title-row">
              <div className="ap-avatar">
                {avatarImg
                  ? <img src={avatarImg} alt={artist.full_name} />
                  : <span>{(artist.full_name || '?').slice(0, 1).toUpperCase()}</span>
                }
              </div>
              <div>
                <div className="ap-hero__name-row">
                  <h1 className="wp-hero__title">{artist.full_name}</h1>
                </div>
                {artist.nickname && <div className="ap-hero__nickname">«{artist.nickname}»</div>}
              </div>
            </div>
            {location && (
              <div className="wp-hero__addr">
                <Icon d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                {location}
              </div>
            )}
            <div className="wp-hero__bottom">
              <div className="wp-hero__stats">
                <div className="wp-hero__stat">{artist.worksCount || 0} {pluralWorks(artist.worksCount || 0)}</div>
                <div className="wp-hero__stat">{artist.wallsCount || 0} {pluralWalls(artist.wallsCount || 0)}</div>
                <div className="wp-hero__stat">{artist.followersCount || 0} {pluralFollowers(artist.followersCount || 0)}</div>
                {artist.totalLikes > 0 && <div className="wp-hero__stat"><Heart size={15} filled /> {artist.totalLikes}</div>}
                {artist.totalViews > 0 && <div className="wp-hero__stat"><Eye size={15} /> {artist.totalViews}</div>}
                {artist.soldCount > 0 && <div className="wp-hero__stat">{artist.soldCount} продано</div>}
              </div>
              <div className="wp-hero__actions">
                {!isOwner && session && (
                  <button
                    type="button"
                    className={`wp-hero__btn ${isFollowing ? 'wp-hero__btn--dark' : 'wp-hero__btn--orange'}`}
                    onClick={toggleFollow}
                    disabled={followBusy}
                  >
                    {isFollowing ? 'Отписаться' : 'Подписаться'}
                  </button>
                )}
                {artist.Phone && (
                  <a href={`tel:${artist.Phone}`} className="wp-hero__btn wp-hero__btn--outline">
                    <Icon d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.26h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.29 6.29l.91-.91a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" size={14} />
                    Связаться
                  </a>
                )}
                {isOwner && (
                  <Link href={`/account/edit-artist/${artist.documentId}`} className="wp-hero__btn wp-hero__btn--dark">
                    <Icon d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" size={14} />
                    Редактировать
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <nav className="wp-tabs">
          {TABS.map(t => {
            const count = t.key === 'works' ? arts.length : t.key === 'walls' ? walls.length : t.key === 'exhibitions' ? exhibitions.length : 0
            return (
              <button key={t.key} className={`wp-tab${activeTab === t.key ? ' is-active' : ''}`} onClick={() => setActiveTab(t.key)}>
                {t.label}
                {count > 0 && <span className="wp-tab__count">{count}</span>}
              </button>
            )
          })}
        </nav>

        {/* ── Работы ── */}
        {activeTab === 'works' && (
          <div>
            {arts.length > 0 ? (
              <div className="catalog-grid ap-catalog-grid">
                {arts.map(art => (
                  <CatalogItem key={art.id} art={art} imageOnLoad={resizeMasonry} />
                ))}
              </div>
            ) : (
              <div className="wp-empty">Работ пока нет</div>
            )}
          </div>
        )}

        {/* ── Стены ── */}
        {activeTab === 'walls' && (
          <div>
            {walls.length > 0 ? (
              <div className="ap-walls-grid">
                {walls.map(w => {
                  const img = Array.isArray(w.Images) && w.Images[0]
                    ? imageUrlBuilder(w.Images[0].formats?.small?.url || w.Images[0].url)
                    : null
                  const href = `/walls/${w.slug || w.documentId}--${w.id}`
                  return (
                    <Link key={w.id} href={href} className="ap-wall-card">
                      <div className="ap-wall-card__img-wrap">
                        {img ? <img src={img} alt={w.Title} /> : <div style={{ width: '100%', height: '100%', background: '#f0ede8' }} />}
                      </div>
                      <div className="ap-wall-card__title">{w.Title}</div>
                      {w.city_name && <div className="ap-wall-card__meta">{w.city_name}</div>}
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="wp-empty">Работы художника пока не размещены ни на одной стене</div>
            )}
          </div>
        )}

        {/* ── О художнике ── */}
        {activeTab === 'about' && (
          <div className="wp-body">
            <div className="wp-main">
              <div className="wp-section">
                <div className="wp-section__head"><div className="wp-section__title">О художнике</div></div>
                {artist.description && (
                  <div className="wp-desc">
                    {typeof artist.description === 'string'
                      ? artist.description
                      : Array.isArray(artist.description)
                        ? artist.description.map((b, i) => <p key={i}>{(b.children || []).map(c => c.text).join('')}</p>)
                        : null
                    }
                  </div>
                )}

                {(artist.birth_year || artist.career_start_year || artist.education) && (
                  <div className="wp-info-grid">
                    {artist.birth_year && (
                      <div className="wp-info-cell">
                        <div className="wp-info-cell__icon"><Icon d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zM12 6v6l4 2" size={18} /></div>
                        <div><div className="wp-info-cell__label">Год рождения</div><div className="wp-info-cell__value">{artist.birth_year}</div></div>
                      </div>
                    )}
                    {artist.career_start_year && (
                      <div className="wp-info-cell">
                        <div className="wp-info-cell__icon"><Icon d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zM12 8v4l3 3" size={18} /></div>
                        <div><div className="wp-info-cell__label">В творчестве с</div><div className="wp-info-cell__value">{artist.career_start_year}</div></div>
                      </div>
                    )}
                    {artist.education && (
                      <div className="wp-info-cell">
                        <div className="wp-info-cell__icon"><Icon d="M22 10v6M2 10l10-5 10 5-10 5-10-5zM6 12v5c3 2 9 2 12 0v-5" size={18} /></div>
                        <div><div className="wp-info-cell__label">Образование</div><div className="wp-info-cell__value">{artist.education}</div></div>
                      </div>
                    )}
                  </div>
                )}

                {directions.length > 0 && (
                  <div className="ap-chip-group">
                    <div className="ap-chip-group__label">Направления</div>
                    <div className="ap-chips">{directions.map(d => <span key={d} className="ap-chip">{d}</span>)}</div>
                  </div>
                )}
                {techniques.length > 0 && (
                  <div className="ap-chip-group">
                    <div className="ap-chip-group__label">Техники</div>
                    <div className="ap-chips">{techniques.map(t => <span key={t} className="ap-chip">{t}</span>)}</div>
                  </div>
                )}
                {subjects.length > 0 && (
                  <div className="ap-chip-group">
                    <div className="ap-chip-group__label">Темы и сюжеты</div>
                    <div className="ap-chips">{subjects.map(s => <span key={s} className="ap-chip">{s}</span>)}</div>
                  </div>
                )}
              </div>

              {photos.length > 0 && (
                <div className="wp-section">
                  <div className="wp-section__head"><div className="wp-section__title">Фотографии</div></div>
                  <div className="wp-gallery-grid">
                    {photos.slice(0, 8).map((img, i) => (
                      <div key={i} className="wp-gallery-thumb">
                        <img src={imageUrlBuilder(img.formats?.small?.url || img.url)} alt={`Фото ${i + 1}`} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="wp-sidebar">
              {(social.instagram || social.telegram || social.vk || social.facebook || social.website || social.behance || artist.email || artist.Phone) && (
                <div className="wp-card">
                  <div className="wp-card__title">Контакты</div>
                  {artist.Phone && (
                    <a href={`tel:${artist.Phone}`} className="wp-contact-row">
                      <div className="wp-contact-row__icon"><Icon d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.26h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.29 6.29l.91-.91a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" size={15} /></div>
                      <div className="wp-contact-row__text">{artist.Phone}</div>
                    </a>
                  )}
                  {artist.email && (
                    <a href={`mailto:${artist.email}`} className="wp-contact-row">
                      <div className="wp-contact-row__icon"><Icon d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6" size={15} /></div>
                      <div className="wp-contact-row__text">{artist.email}</div>
                    </a>
                  )}
                  {social.website && (
                    <a href={social.website.startsWith('http') ? social.website : `https://${social.website}`} target="_blank" rel="noopener noreferrer" className="wp-contact-row">
                      <div className="wp-contact-row__icon"><Icon d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zM2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" size={15} /></div>
                      <div className="wp-contact-row__text">Сайт</div>
                    </a>
                  )}
                  {social.instagram && (
                    <a href={`https://instagram.com/${social.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="wp-contact-row">
                      <div className="wp-contact-row__icon"><Icon d="M16 3H8a5 5 0 0 0-5 5v8a5 5 0 0 0 5 5h8a5 5 0 0 0 5-5V8a5 5 0 0 0-5-5zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM17.5 6.5h.01" size={15} /></div>
                      <div className="wp-contact-row__text">Instagram</div>
                    </a>
                  )}
                  {social.telegram && (
                    <a href={`https://t.me/${social.telegram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="wp-contact-row">
                      <div className="wp-contact-row__icon"><Icon d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" size={15} /></div>
                      <div className="wp-contact-row__text">Telegram</div>
                    </a>
                  )}
                </div>
              )}

              {exhibitions.length > 0 && (
                <div className="wp-card">
                  <div className="wp-card__title">Выставки</div>
                  {exhibitions.slice(0, 3).map((ex, i) => {
                    const period = exPeriod(ex)
                    return (
                      <div key={i} className="ap-exhibition-item">
                        {period && <div className="ap-exhibition-item__year">{period}</div>}
                        <div>
                          <div className="ap-exhibition-item__title">{ex.title}</div>
                          {ex.place && <div className="ap-exhibition-item__place">{ex.place}</div>}
                        </div>
                      </div>
                    )
                  })}
                  {exhibitions.length > 3 && (
                    <button className="wp-sidebar-btn" onClick={() => setActiveTab('exhibitions')}>Все выставки</button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Выставки ── */}
        {activeTab === 'exhibitions' && (
          <div className="ap-exhibitions-list">
            {exhibitions.length > 0 ? (
              exhibitions.map((ex, i) => {
                const period = exPeriod(ex)
                return (
                  <div key={i} className="ap-exhibition-item ap-exhibition-item--lg">
                    {period && <div className="ap-exhibition-item__year">{period}</div>}
                    <div>
                      <div className="ap-exhibition-item__title">{ex.title}</div>
                      {ex.place && <div className="ap-exhibition-item__place">{ex.place}</div>}
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="wp-empty">Информация о выставках пока не добавлена</div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  )
}

export async function getStaticPaths() {
  try {
    const json = await fetchStrapi(API_HOST + '/artists')
    const artists = Array.isArray(json) ? json : []
    return {
      paths: artists.map(item => ({
        params: { slug: (item.slug || item.documentId) + '--' + item.id },
      })),
      fallback: 'blocking',
    }
  } catch {
    return { paths: [], fallback: 'blocking' }
  }
}

export async function getStaticProps({ params: { slug } }) {
  try {
    const parts = slug.split('--')
    const id = parts.length > 1 ? parts[parts.length - 1] : parts[0]

    const artist = await fetchStrapi(
      API_HOST + '/artists/' + id + serialize({
        populate: {
          avatar: true,
          cover: true,
          photos: true,
          user_uploader: { fields: ['id'] },
          Arts: { populate: ['Pictures', 'wall', 'styles', 'subjects', 'mediums'] },
        },
        populateDefaults: [],
      })
    )
    if (!artist || (!artist.id && !artist.documentId)) return { notFound: true }

    return { props: { artist }, revalidate: 60 }
  } catch {
    return { notFound: true }
  }
}
