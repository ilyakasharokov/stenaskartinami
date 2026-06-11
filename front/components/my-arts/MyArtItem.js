import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import imageUrlBuilder from '@/utils/img-url-builder'

const STATUS_MAP = {
  published: { label: 'Опубликована', cls: 'is-published' },
  moderation: { label: 'На модерации', cls: 'is-moderation' },
  draft: { label: 'Черновик', cls: 'is-draft' },
}

export const getArtStatus = (art) => {
  if ((art.publishedAt || art.published_at) && art.wall) return 'published'
  if (art.publishedAt || art.published_at) return 'moderation'
  return 'moderation'
}

const getPictureUrl = (art) => {
  if (!Array.isArray(art?.Pictures) || !art.Pictures[0]) return null
  const pic = art.Pictures[0]
  if (pic.formats) {
    return pic.formats.medium?.url || pic.formats.small?.url || pic.formats.thumbnail?.url || null
  }
  return pic.url || null
}

const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
)

const EyeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
)

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6M14 11v6"/>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
)

const DotsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
  </svg>
)

export default function MyArtItem({ art, onDelete, imageOnLoad }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const status = getArtStatus(art)
  const statusCfg = STATUS_MAP[status]
  const pictureUrl = getPictureUrl(art)

  const dateStr = art.createdAt
    ? new Date(art.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
    : ''

  const meta = [
    art.Materials,
    art.width && art.height ? `${art.width}×${art.height} см` : null,
  ].filter(Boolean).join(' · ')

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  return (
    <div className="catalog-item my-art-item">
      <div className="catalog-item__wrapper">
        <div className="catalog-item__img-wrap">
          <div className={`my-art-badge ${statusCfg.cls}`}>{statusCfg.label}</div>
          <div className="my-art-menu" ref={menuRef}>
            <button className="my-art-menu__trigger" onClick={() => setMenuOpen(v => !v)}>
              <DotsIcon />
            </button>
            {menuOpen && (
              <div className="my-art-menu__dropdown">
                <Link href={`/account/edit-art/${art.documentId}`} className="my-art-menu__item" onClick={() => setMenuOpen(false)}>
                  <EditIcon /> Редактировать
                </Link>
                {art.slug && (
                  <Link href={`/art/${art.slug}--${art.id}`} className="my-art-menu__item" onClick={() => setMenuOpen(false)}>
                    <EyeIcon /> Просмотр
                  </Link>
                )}
                <button className="my-art-menu__item my-art-menu__item--danger" onClick={() => { setMenuOpen(false); onDelete(art.documentId) }}>
                  <TrashIcon /> Удалить
                </button>
              </div>
            )}
          </div>
          <div className="catalog-item__btns my-art-hover-actions">
            <Link href={`/account/edit-art/${art.documentId}`} className="my-art-action" title="Редактировать">
              <EditIcon />
            </Link>
            {art.slug && (
              <Link href={`/art/${art.slug}--${art.id}`} className="my-art-action" title="Просмотр">
                <EyeIcon />
              </Link>
            )}
            <button className="my-art-action my-art-action--danger" title="Удалить" onClick={() => onDelete(art.documentId)}>
              <TrashIcon />
            </button>
          </div>
          <div className="overlay" />
          {pictureUrl ? (
            <img
              className="catalog-item__img"
              src={imageUrlBuilder(pictureUrl)}
              alt={art.Title}
              onLoad={imageOnLoad}
            />
          ) : (
            <div className="my-art-item__no-img">Нет фото</div>
          )}
        </div>
        <div className="catalog-item__title">{art.Title}</div>
        {meta && <div className="catalog-item__size">{meta}</div>}
        <div className="catalog-item__artist-price">
          <div className="catalog-item__price">
            {art.sold ? 'ПРОДАНО' : art.Owners_price ? `${art.Owners_price} ₽` : ''}
          </div>
          {dateStr && <div className="my-art-item__date">{dateStr}</div>}
        </div>
      </div>
    </div>
  )
}
