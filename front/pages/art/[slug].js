import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import MainLayout from "@/components/layouts/MainLayout"
import { API_HOST } from '@/constants/constants'
import { fetchStrapi } from '@/utils/strapi'
import serialize from '@/utils/serialize'
import imageUrlBuilder from '@/utils/img-url-builder'
import AddFavorite from '@/components/art/add-favorite'

// ── Gallery ──────────────────────────────────────────────────────────────────

function ArtGallery({ images, art }) {
  const imgs = Array.isArray(images) ? images : []
  const [idx, setIdx] = useState(0)
  const cur = imgs[idx] || null

  const prev = () => setIdx(i => (i - 1 + imgs.length) % imgs.length)
  const next = () => setIdx(i => (i + 1) % imgs.length)

  const mainUrl = cur
    ? imageUrlBuilder(
        cur.formats?.large?.url || cur.formats?.medium?.url ||
        cur.formats?.small?.url || cur.url
      )
    : null

  return (
    <div className="art-gallery">
      <div className="art-gallery__main">
        {mainUrl && <img src={mainUrl} alt={art.Title} />}
        {imgs.length > 1 && (
          <>
            <button className="art-gallery__arrow art-gallery__arrow--prev" onClick={prev} type="button" aria-label="Предыдущее">‹</button>
            <button className="art-gallery__arrow art-gallery__arrow--next" onClick={next} type="button" aria-label="Следующее">›</button>
          </>
        )}
        {(art.publishedAt || art.published_at) && (
          <div className="art-gallery__fav">
            <AddFavorite art={art} />
          </div>
        )}
      </div>
      {imgs.length > 1 && (
        <div className="art-gallery__thumbs">
          {imgs.map((img, i) => {
            const tUrl = imageUrlBuilder(img.formats?.small?.url || img.formats?.thumbnail?.url || img.url)
            return (
              <div
                key={img.id}
                className={`art-gallery__thumb${i === idx ? ' art-gallery__thumb--active' : ''}`}
                onClick={() => setIdx(i)}
                style={{ backgroundImage: `url(${tUrl})` }}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Buy form ──────────────────────────────────────────────────────────────────

function BuyForm({ art, mode, onClose }) {
  const [sent, setSent] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      await fetch(API_HOST + '/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: {
          title: mode === 'buy' ? 'Купить картину' : 'Предложить цену',
          name,
          email,
          text: art.Title + (art.Artist ? ', ' + art.Artist.full_name : '') + ', id = ' + art.id,
        }}),
      })
    } catch {}
    setSent(true)
  }

  if (sent) return (
    <div className="art-form art-form--sent">
      <p>Спасибо! Мы свяжемся с вами в ближайшее время.</p>
      <button type="button" className="art-btn-outline art-btn-outline--full" onClick={onClose}>Закрыть</button>
    </div>
  )

  return (
    <form className="art-form" onSubmit={handleSubmit}>
      <p className="art-form__hint">
        {mode === 'buy'
          ? 'Все работы поставляются надёжной транспортной компанией. Наш консультант свяжется с вами.'
          : 'Укажите контакты, чтобы мы могли обсудить условия.'}
      </p>
      <input className="art-form__input" type="text" placeholder="Имя" value={name} onChange={e => setName(e.target.value)} required />
      <input className="art-form__input" type="email" placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} required />
      <div className="art-form__btns">
        <button type="submit" className="art-btn-dark">Отправить</button>
        <button type="button" className="art-btn-outline" onClick={onClose}>Отмена</button>
      </div>
    </form>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatPrice(p) {
  if (p == null || p === '') return null
  return new Intl.NumberFormat('ru-RU').format(p) + ' ₽'
}

function getOrientation(w, h) {
  if (!w || !h) return null
  const r = Number(w) / Number(h)
  if (r > 1.15) return 'Горизонтальная'
  if (r < 0.87) return 'Вертикальная'
  return 'Квадратная'
}

const ShareIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
  </svg>
)
const ShieldIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
)
const TruckIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
    <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
  </svg>
)
const BookmarkIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
  </svg>
)

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Art({ art, style, styleArts, artist }) {
  const [buyMode, setBuyMode] = useState(null)
  const [descExpanded, setDescExpanded] = useState(false)
  const [descClipped, setDescClipped] = useState(false)
  const descRef = useRef(null)

  useEffect(() => {
    if (descRef.current) {
      setDescClipped(descRef.current.scrollHeight > descRef.current.clientHeight)
    }
  }, [art])

  if (!art) return (
    <MainLayout>
      <div style={{ padding: '60px', textAlign: 'center', color: '#777' }}>Картина не найдена</div>
    </MainLayout>
  )

  const isPublished = !!(art.publishedAt || art.published_at)
  const year = art.Year ? new Date(art.Year).getFullYear() : null
  const orientation = getOrientation(art.width, art.height)
  const artistUrl = art.Artist ? `/artists/${art.Artist.slug}--${art.Artist.id}` : null
  const artistInitial = art.Artist?.full_name?.[0]?.toUpperCase() || '?'
  // Use the fully-fetched artist if available, fall back to art.Artist (always populated)
  const aboutArtist = artist || art.Artist || null

  const styleNames   = (art.styles   || []).map(s => s.Title).filter(Boolean).join(', ')
  const subjectNames = (art.subjects || []).map(s => s.Title).filter(Boolean).join(', ')
  const mediumNames  = (art.mediums  || []).map(m => m.title || m.Title).filter(Boolean).join(', ')

  const specs = [
    { label: 'Размер',     value: art.width && art.height ? `${art.width} × ${art.height} см` : null },
    { label: 'Стиль',      value: styleNames   || null },
    { label: 'Материалы',  value: art.Materials || null },
    { label: 'Жанр',       value: subjectNames  || null },
    { label: 'Техника',    value: mediumNames   || null },
    { label: 'Ориентация', value: orientation },
  ].filter(s => s.value)

  return (
    <MainLayout>
      <Head>
        <title>{art.Title}{art.Artist ? `, ${art.Artist.full_name}` : ''} | Стена с картинами</title>
      </Head>
      <div className="art-page">

        {/* Breadcrumbs */}
        <nav className="art-breadcrumbs" aria-label="Навигация">
          <Link href="/">Главная</Link>
          <span className="art-breadcrumbs__sep">›</span>
          <Link href="/catalog">Каталог</Link>
          {style && (
            <>
              <span className="art-breadcrumbs__sep">›</span>
              <Link href={`/catalog/?styles=${style.slug}`}>{style.Title}</Link>
            </>
          )}
          <span className="art-breadcrumbs__sep">›</span>
          <span>{art.Title}</span>
        </nav>

        {/* Main layout */}
        <div className="art-layout">

          {/* Gallery + About artist */}
          <div className="art-layout__gallery">
            <ArtGallery images={art.Pictures} art={art} />

            {aboutArtist && (
              <div className="art-about">
                <h2 className="art-about__heading">О художнике</h2>
                <div className="art-about__header">
                  <div className="art-about__avatar">
                    {aboutArtist.full_name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div className="art-about__name">{aboutArtist.full_name}</div>
                    {aboutArtist.city && typeof aboutArtist.city === 'string' && (
                      <div className="art-about__location">{aboutArtist.city}</div>
                    )}
                  </div>
                </div>
                {aboutArtist.description && (
                  <div className="art-about__bio" dangerouslySetInnerHTML={{ __html: aboutArtist.description }} />
                )}
                <div className="art-about__footer">
                  <button className="art-btn-outline art-btn-outline--sm" type="button">
                    <BookmarkIcon /> Подписаться
                  </button>
                  {artistUrl && (
                    <Link href={artistUrl} className="art-artist__all-link">Все работы художника →</Link>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Info panel */}
          <div className="art-layout__info">

            {/* Status */}
            <div className={`art-status ${isPublished ? 'art-status--published' : 'art-status--pending'}`}>
              {isPublished ? 'Опубликована' : 'На модерации'}
            </div>

            {/* Title + share */}
            <div className="art-title-row">
              <h1 className="art-title">{art.Title}</h1>
              <button className="art-share-btn" type="button" title="Поделиться"
                onClick={() => navigator.share?.({ title: art.Title, url: window.location.href })}>
                <ShareIcon /> Поделиться
              </button>
            </div>

            {/* Year + ID */}
            <div className="art-meta">
              {year && <span>{year}</span>}
              {year && <span className="art-meta__dot">·</span>}
              <span>ID: {art.id}</span>
            </div>

            {/* Artist */}
            {art.Artist && (
              <div className="art-artist">
                <div className="art-artist__avatar">{artistInitial}</div>
                <div className="art-artist__body">
                  <div className="art-artist__name-row">
                    <Link href={artistUrl} className="art-artist__name">{art.Artist.full_name}</Link>
                    <Link href={artistUrl} className="art-artist__all-link">Все работы художника →</Link>
                  </div>
                  {art.Artist.city && <div className="art-artist__location">{art.Artist.city}</div>}
                </div>
              </div>
            )}

            {/* Purchase */}
            {isPublished && !buyMode && (
              <>
                <div className="art-purchase">
                  <div className="art-purchase__price">
                    {art.sold
                      ? <span className="art-price art-price--sold">ПРОДАНО</span>
                      : art.Price
                        ? <span className="art-price">{formatPrice(art.Price)}</span>
                        : null}
                  </div>
                  {!art.sold && (
                    <div className="art-purchase__btns">
                      <button className="art-btn-dark" onClick={() => setBuyMode('buy')}>Купить сейчас</button>
                      <button className="art-btn-outline" onClick={() => setBuyMode('offer')}>Предложить цену</button>
                    </div>
                  )}
                </div>

                <div className="art-safe-deal">
                  <ShieldIcon />
                  <div>
                    <div className="art-safe-deal__title">Безопасная сделка</div>
                    <div className="art-safe-deal__sub">Оплата только после подтверждения продавцом</div>
                  </div>
                </div>
              </>
            )}

            {buyMode && (
              <BuyForm art={art} mode={buyMode} onClose={() => setBuyMode(null)} />
            )}

            {/* Characteristics */}
            {specs.length > 0 && (
              <div className="art-specs">
                <h3 className="art-section-title">Характеристики</h3>
                <div className="art-specs__grid">
                  {specs.map(s => (
                    <div key={s.label} className="art-specs__item">
                      <div className="art-specs__label">{s.label}</div>
                      <div className="art-specs__value">{s.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {art.Description && art.Description.length > 5 && (
              <div className="art-description">
                <h3 className="art-section-title">Описание</h3>
                <div
                  ref={descRef}
                  className={`art-description__text${descExpanded ? ' art-description__text--expanded' : ''}`}
                  dangerouslySetInnerHTML={{ __html: art.Description }}
                />
                {(descClipped || descExpanded) && (
                  <button className="art-description__toggle" type="button" onClick={() => setDescExpanded(v => !v)}>
                    {descExpanded ? 'Скрыть ∧' : 'Показать полностью ∨'}
                  </button>
                )}
              </div>
            )}

            {/* Delivery */}
            <div className="art-delivery">
              <TruckIcon />
              <div>
                <div className="art-delivery__title">Доставка</div>
                <div className="art-delivery__sub">По России и миру. Срок и стоимость рассчитываются индивидуально.</div>
              </div>
            </div>

          </div>
        </div>

        {/* Similar works */}
        <div className="art-bottom">
          {/* Similar works */}
          {styleArts && styleArts.length > 0 && (
            <div className="art-similar">
              <div className="art-similar__header">
                <h2>Похожие работы</h2>
                {style && (
                  <Link href={`/catalog/?styles=${style.slug}`} className="art-similar__all-link">
                    Смотреть все →
                  </Link>
                )}
              </div>
              <div className="art-similar__grid">
                {styleArts.map(item => {
                  const pic = item.Pictures?.[0]
                  const picUrl = pic
                    ? imageUrlBuilder(pic.formats?.medium?.url || pic.formats?.small?.url || pic.url)
                    : null
                  const itemYear = item.Year ? new Date(item.Year).getFullYear() : null
                  return (
                    <Link href={`/art/${item.slug}--${item.id}`} key={item.id} className="art-similar__item">
                      <div className="art-similar__img">
                        {picUrl && <img src={picUrl} alt={item.Title} />}
                      </div>
                      <div className="art-similar__title">{item.Title}</div>
                      {(item.width && item.height) && (
                        <div className="art-similar__size">{item.width} × {item.height}</div>
                      )}
                      <div className="art-similar__meta">
                        {item.Artist && (
                          <span className="art-similar__artist">
                            {item.Artist.full_name}
                            {itemYear && `, ${itemYear}`}
                          </span>
                        )}
                        <span className="art-similar__price">
                          {item.sold ? 'ПРОДАНО' : item.Price ? formatPrice(item.Price) : ''}
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </MainLayout>
  )
}

// ── Static paths & props ──────────────────────────────────────────────────────

export async function getStaticPaths() {
  try {
    const json = await fetchStrapi(
      API_HOST + '/arts' + serialize({ populate: ['Pictures', 'Artist'], 'filters[wall][$notNull]': true })
    )
    const arts = Array.isArray(json) ? json : []
    return {
      paths: arts.map(item => ({ params: { slug: item.slug + '--' + item.id } })),
      fallback: 'blocking',
    }
  } catch {
    return { paths: [], fallback: 'blocking' }
  }
}

export const getStaticProps = async ({ params: { slug } }) => {
  try {
    const id = slug.split('--')[1]
    let json = await fetchStrapi(API_HOST + '/arts/all/' + id + serialize({ populate: 'deep,2' }))

    if (!json || !json.id) return { notFound: true }
    if (!json.wall)        return { notFound: true }

    const art = json

    let artist = null
    const artistLookup = art?.Artist?.documentId || art?.Artist?.id
    if (artistLookup) {
      artist = await fetchStrapi(API_HOST + '/artists/' + artistLookup + '?populate=deep,2')
      if (artist && Array.isArray(artist.Arts)) {
        artist.Arts = artist.Arts
          .sort((a, b) => {
            const ap = a.publishedAt || a.published_at
            const bp = b.publishedAt || b.published_at
            return ap < bp ? 1 : -1
          })
          .filter(aa => aa.id !== art.id)
          .slice(0, 4)
      } else if (artist) {
        artist.Arts = []
      }
    }

    let style = art.styles?.[0] || null
    let styleArts = []
    if (style) {
      json = await fetchStrapi(
        API_HOST +
          `/arts?filters[styles][id][$eq]=${style.id}&filters[wall][$notNull]=true&populate[0]=Pictures&populate[1]=Artist`
      )
      const styleList = Array.isArray(json) ? json : []
      const artistArts = artist?.Arts || []
      styleArts = styleList
        .sort((a, b) => {
          const ap = a.publishedAt || a.published_at
          const bp = b.publishedAt || b.published_at
          return ap < bp ? 1 : -1
        })
        .filter(_art => _art.id !== art.id && !artistArts.find(aa => aa.id === _art.id))
        .slice(0, 4)
    }

    return { props: { art, style, styleArts, artist }, revalidate: 60 }
  } catch {
    return { notFound: true }
  }
}
