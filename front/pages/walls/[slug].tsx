import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { YMaps, Map, Placemark, ZoomControl } from 'react-yandex-maps'
import MainLayout from '@/components/layouts/MainLayout'
import { API_HOST } from '@/constants/constants'
import { fetchStrapi } from '@/utils/strapi'
import serialize from '@/utils/serialize'
import imageUrlBuilder from '@/utils/img-url-builder'
import CatalogItem from '@/components/catalog/catalog-item'
import throttle from '@/utils/throttle'
import { resizeAllGridItems } from '@/utils/grid-resizer'

const WALL_TYPE_LABELS = {
  cafe: 'Кафе',
  gallery: 'Галерея',
  restaurant: 'Ресторан',
  bar: 'Бар',
  office: 'Офис',
  shop: 'Магазин',
  other: 'Другое',
}

function Icon({ d, size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  )
}

function OwnerAvatar({ name, image, size = 44 }) {
  if (image) return <img src={image} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
  const initials = (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div className="wp-owner__avatar" style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {initials}
    </div>
  )
}

const TABS = [
  { key: 'about',    label: 'О стене' },
  { key: 'arts',     label: 'Картины' },
  { key: 'interior', label: 'Интерьер' },
  { key: 'map',      label: 'На карте' },
]

const resizeWallArts = typeof window !== 'undefined'
  ? throttle(() => resizeAllGridItems('catalog-item', 'wall-arts-masonry', '.catalog-item__wrapper'), 100)
  : () => {}

const resizePreviewArts = typeof window !== 'undefined'
  ? throttle(() => resizeAllGridItems('catalog-item', 'wall-preview-masonry', '.catalog-item__wrapper'), 100)
  : () => {}

export default function WallPage({ wall }) {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState('about')

  useEffect(() => {
    if (activeTab !== 'arts') return
    const frame = requestAnimationFrame(resizeWallArts)
    window.addEventListener('resize', resizeWallArts)
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', resizeWallArts) }
  }, [activeTab, wall?.arts])

  useEffect(() => {
    if (activeTab !== 'about') return
    const frame = requestAnimationFrame(resizePreviewArts)
    window.addEventListener('resize', resizePreviewArts)
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', resizePreviewArts) }
  }, [activeTab, wall?.arts])

  if (!wall) {
    return (
      <MainLayout>
        <div style={{ padding: '60px 0', textAlign: 'center', color: '#888' }}>Стена не найдена</div>
      </MainLayout>
    )
  }

  const images = Array.isArray(wall.Images) ? wall.Images : []
  const arts = Array.isArray(wall.arts) ? wall.arts : []
  const heroImg = images[0]
    ? imageUrlBuilder(images[0].formats?.large?.url || images[0].formats?.medium?.url || images[0].url)
    : null
  const addr = [wall.city_name, wall.Address].filter(Boolean).join(', ')
  const typeLabel = WALL_TYPE_LABELS[wall.wall_type] || wall.wall_type || ''
  const owner = wall.user_uploader
  const ownerName = owner?.username || owner?.email || 'Владелец'
  const ownerAvatar = owner?.profile_image?.url ? imageUrlBuilder(owner.profile_image.url) : null

  const isOwner = session && owner && String((session as any).id || session.info?.id) === String(owner.id)

  return (
    <MainLayout>
      <Head>
        <title>{wall.title} | Стена с картинами</title>
        <meta name="description" content={typeof wall.Description === 'string' ? wall.Description.slice(0, 160) : ''} />
      </Head>

      <div className="wp">
        {/* ── Hero ── */}
        <div className="wp-hero">
          {heroImg
            ? <img src={heroImg} alt={wall.title} className="wp-hero__img" />
            : <div className="wp-hero__placeholder" />
          }
          <div className="wp-hero__overlay" />

          <div className="wp-hero__top-actions">
            <button className="wp-hero__top-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              Поделиться
            </button>
            <button className="wp-hero__top-btn wp-hero__top-btn--icon">···</button>
          </div>

          <div className="wp-hero__content">
            <div className="wp-hero__badge">
              <svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" fill="currentColor"/></svg>
              Опубликовано
            </div>
            <h1 className="wp-hero__title">{wall.title}</h1>
            {addr && (
              <div className="wp-hero__addr">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                {addr}
              </div>
            )}
            <div className="wp-hero__bottom">
              <div className="wp-hero__stats">
                {arts.length > 0 && (
                  <div className="wp-hero__stat">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                    {arts.length} {arts.length === 1 ? 'картина' : arts.length < 5 ? 'картины' : 'картин'}
                  </div>
                )}
                {typeLabel && (
                  <div className="wp-hero__stat">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                    {typeLabel}
                  </div>
                )}
              </div>
              <div className="wp-hero__actions">
                {wall.Address && (
                  <a
                    href={`https://yandex.ru/maps/?text=${encodeURIComponent(wall.Address)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="wp-hero__btn wp-hero__btn--outline"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
                    Маршрут
                  </a>
                )}
                {wall.Phone && (
                  <a href={`tel:${wall.Phone}`} className="wp-hero__btn wp-hero__btn--orange">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.26h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.29 6.29l.91-.91a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    Связаться
                  </a>
                )}
                {isOwner && (
                  <Link href={`/edit-wall/${wall.documentId}`} className="wp-hero__btn wp-hero__btn--dark">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
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
            const count = t.key === 'arts' ? arts.length : t.key === 'interior' ? images.length : 0
            return (
              <button
                key={t.key}
                className={`wp-tab${activeTab === t.key ? ' is-active' : ''}`}
                onClick={() => setActiveTab(t.key)}
              >
                {t.label}
                {count > 0 && <span className="wp-tab__count">{count}</span>}
              </button>
            )
          })}
        </nav>

        {/* ── О стене ── */}
        {activeTab === 'about' && (
          <div className="wp-body">
            <div className="wp-main">
              <div className="wp-section">
                <div className="wp-section__head">
                  <div className="wp-section__title">О стене</div>
                </div>

                {wall.Description && (
                  <div className="wp-desc">
                    {typeof wall.Description === 'string'
                      ? wall.Description
                      : Array.isArray(wall.Description)
                        ? wall.Description.map((b, i) =>
                            <p key={i}>{(b.children || []).map(c => c.text).join('')}</p>
                          )
                        : null
                    }
                  </div>
                )}

                {(typeLabel || wall.Schedule) && (
                  <div className="wp-info-grid">
                    {typeLabel && (
                      <div className="wp-info-cell">
                        <div className="wp-info-cell__icon">
                          <Icon d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" size={18} />
                        </div>
                        <div>
                          <div className="wp-info-cell__label">Тип заведения</div>
                          <div className="wp-info-cell__value">{typeLabel}</div>
                        </div>
                      </div>
                    )}
                    {wall.spots_count && (
                      <div className="wp-info-cell">
                        <div className="wp-info-cell__icon">
                          <Icon d="M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18" size={18} />
                        </div>
                        <div>
                          <div className="wp-info-cell__label">Мест для картин</div>
                          <div className="wp-info-cell__value">{wall.spots_count}</div>
                        </div>
                      </div>
                    )}
                    {wall.placement_terms && (
                      <div className="wp-info-cell">
                        <div className="wp-info-cell__icon">
                          <Icon d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zM12 8v4l3 3" size={18} />
                        </div>
                        <div>
                          <div className="wp-info-cell__label">Условия</div>
                          <div className="wp-info-cell__value">{wall.placement_terms}</div>
                        </div>
                      </div>
                    )}
                    {wall.Schedule && (
                      <div className="wp-info-cell">
                        <div className="wp-info-cell__icon">
                          <Icon d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zM12 6v6l4 2" size={18} />
                        </div>
                        <div>
                          <div className="wp-info-cell__label">Часы работы</div>
                          <div className="wp-info-cell__value">{wall.Schedule}</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Текущая экспозиция preview */}
              {arts.length > 0 && (
                <div className="wp-section">
                  <div className="wp-section__head">
                    <div className="wp-section__title">Текущая экспозиция</div>
                    <button className="wp-section__more" onClick={() => setActiveTab('arts')}>
                      Смотреть все
                    </button>
                  </div>
                  <div className="catalog-grid wall-preview-masonry">
                    {arts.slice(0, 4).map(art => (
                      <CatalogItem key={art.id} art={art} imageOnLoad={resizePreviewArts} />
                    ))}
                  </div>
                </div>
              )}

              {/* Интерьер preview */}
              {images.length > 0 && (
                <div className="wp-section">
                  <div className="wp-section__head">
                    <div className="wp-section__title">Интерьер</div>
                    {images.length > 4 && (
                      <button className="wp-section__more" onClick={() => setActiveTab('interior')}>
                        Смотреть все фото
                      </button>
                    )}
                  </div>
                  <div className="wp-gallery-grid">
                    {images.slice(0, 4).map((img, i) => (
                      <div key={i} className="wp-gallery-thumb">
                        <img
                          src={imageUrlBuilder(img.formats?.small?.url || img.formats?.thumbnail?.url || img.url)}
                          alt={`Фото ${i + 1}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Map preview */}
              {wall.Coordinates && (
                <div className="wp-section">
                  <div className="wp-section__head">
                    <div className="wp-section__title">На карте</div>
                    <button className="wp-section__more" onClick={() => setActiveTab('map')}>
                      Открыть карту
                    </button>
                  </div>
                  <div className="wp-map">
                    <YMaps>
                      <Map defaultState={wall.Coordinates} style={{ width: '100%', height: '260px' }}>
                        <ZoomControl />
                        <Placemark
                          geometry={wall.Coordinates.center}
                          options={{ iconLayout: 'default#image', iconImageHref: '/images/mapicon.png', iconImageSize: [40, 40], iconImageOffset: [-20, -20] }}
                        />
                      </Map>
                    </YMaps>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="wp-sidebar">
              {/* Contacts */}
              {(wall.Phone || wall.email || wall.Website) && (
                <div className="wp-card">
                  <div className="wp-card__title">Контакты</div>
                  {wall.Phone && (
                    <a href={`tel:${wall.Phone}`} className="wp-contact-row">
                      <div className="wp-contact-row__icon">
                        <Icon d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.26h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.29 6.29l.91-.91a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" size={15} />
                      </div>
                      <div className="wp-contact-row__text">{wall.Phone}</div>
                    </a>
                  )}
                  {wall.email && (
                    <a href={`mailto:${wall.email}`} className="wp-contact-row">
                      <div className="wp-contact-row__icon">
                        <Icon d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6" size={15} />
                      </div>
                      <div className="wp-contact-row__text">{wall.email}</div>
                    </a>
                  )}
                  {wall.Website && (
                    <a href={wall.Website.startsWith('http') ? wall.Website : `https://${wall.Website}`}
                       target="_blank" rel="noopener noreferrer" className="wp-contact-row">
                      <div className="wp-contact-row__icon">
                        <Icon d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zM2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" size={15} />
                      </div>
                      <div className="wp-contact-row__text">Сайт заведения</div>
                    </a>
                  )}
                  {wall.Phone && (
                    <a href={`tel:${wall.Phone}`} className="wp-sidebar-btn wp-sidebar-btn--orange">
                      <Icon d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.26h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.29 6.29l.91-.91a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" size={15} />
                      Связаться
                    </a>
                  )}
                </div>
              )}

              {/* Owner */}
              {owner && (
                <div className="wp-card">
                  <div className="wp-card__title">Владелец стены</div>
                  <div className="wp-owner">
                    <OwnerAvatar name={ownerName} image={ownerAvatar} />
                    <div>
                      <div className="wp-owner__name">
                        {ownerName}
                        {owner.confirmed && (
                          <span className="wp-owner__verified">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#f15a24"/><path d="M8 12l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </span>
                        )}
                      </div>
                      {owner.bio && <div className="wp-owner__role">{owner.bio.slice(0, 40)}</div>}
                    </div>
                  </div>
                  {owner.bio && owner.bio.length > 40 && (
                    <p className="wp-owner-bio">{owner.bio}</p>
                  )}
                  <a href="/account/profile" className="wp-sidebar-btn" style={{ marginTop: 14 }}>
                    Смотреть профиль
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Картины ── */}
        {activeTab === 'arts' && (
          <div style={{ padding: '0 16px' }}>
            {arts.length > 0 ? (
              <div className="catalog-grid wall-arts-masonry">
                {arts.map(art => (
                  <CatalogItem key={art.id} art={art} imageOnLoad={resizeWallArts} />
                ))}
              </div>
            ) : (
              <div className="wp-empty">Картин пока нет</div>
            )}
          </div>
        )}

        {/* ── Интерьер ── */}
        {activeTab === 'interior' && (
          <div>
            {images.length > 0 ? (
              <div className="wp-gallery-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                {images.map((img, i) => (
                  <div key={i} className="wp-gallery-thumb" style={{ aspectRatio: '16/10' }}>
                    <img
                      src={imageUrlBuilder(img.formats?.medium?.url || img.url)}
                      alt={`Фото ${i + 1}`}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="wp-empty">Фотографий пока нет</div>
            )}
          </div>
        )}

        {/* ── На карте ── */}
        {activeTab === 'map' && (
          <div>
            {wall.Coordinates ? (
              <div className="wp-map">
                <YMaps>
                  <Map defaultState={wall.Coordinates} style={{ width: '100%', height: '500px' }}>
                    <ZoomControl />
                    <Placemark
                      geometry={wall.Coordinates.center}
                      properties={{ hintContent: wall.title, balloonContent: addr }}
                      options={{ iconLayout: 'default#image', iconImageHref: '/images/mapicon.png', iconImageSize: [40, 40], iconImageOffset: [-20, -20] }}
                    />
                  </Map>
                </YMaps>
              </div>
            ) : (
              <div className="wp-empty">Адрес не указан</div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  )
}

export async function getStaticPaths() {
  try {
    const json = await fetchStrapi(API_HOST + '/walls')
    const walls = Array.isArray(json) ? json : []
    return {
      paths: walls.map(item => ({
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

    const wall = await fetchStrapi(
      API_HOST + '/walls/' + id + serialize({
        populate: {
          Images: true,
          arts: { populate: ['Pictures', 'Artist', 'styles', 'mediums'] },
          user_uploader: { populate: ['profile_image'] },
        },
        populateDefaults: [],
      })
    )
    if (!wall || (!wall.id && !wall.documentId)) return { notFound: true }

    const arts = Array.isArray(wall.arts) ? wall.arts : []
    wall.arts = arts.sort((a, b) => {
      const ap = a.publishedAt || a.published_at || ''
      const bp = b.publishedAt || b.published_at || ''
      return ap < bp ? 1 : -1
    })

    return { props: { wall }, revalidate: 60 }
  } catch {
    return { notFound: true }
  }
}
