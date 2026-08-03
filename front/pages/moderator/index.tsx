import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import MainLayout from '@/components/layouts/MainLayout'
import imageUrlBuilder from '@/utils/img-url-builder'

const API = process.env.NEXT_PUBLIC_API_URL

function formatPrice(p) {
  if (!p) return null
  return Number(p).toLocaleString('ru-RU') + ' ₽'
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function ModeratorPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [arts, setArts] = useState([])
  const [loading, setLoading] = useState(true)
  const [rejecting, setRejecting] = useState(null)
  const [approving, setApproving] = useState(null)

  const isModerator = session?.info?.isModerator ?? session?.info?.is_moderator

  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated') { router.replace('/'); return }
    // Wait for session.info to load before checking moderator flag
    if (status === 'authenticated' && session?.info !== undefined && !isModerator) {
      router.replace('/')
    }
  }, [status, isModerator, session?.info, router])

  const load = useCallback(async () => {
    if (!session?.jwt) return
    setLoading(true)
    try {
      const res = await fetch(`${API}/arts/moderation`, {
        headers: { Authorization: `Bearer ${session.jwt}` },
      })
      const json = await res.json()
      setArts(json?.data || [])
    } catch {}
    setLoading(false)
  }, [session?.jwt])

  useEffect(() => { load() }, [load])

  const reject = async (art) => {
    if (!confirm(`Отклонить «${art.title}»?`)) return
    setRejecting(art.id)
    try {
      await fetch(`${API}/arts/${art.id}/reject`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.jwt}` },
      })
      setArts(prev => prev.filter(a => a.id !== art.id))
    } catch {}
    setRejecting(null)
  }

  const approve = async (art) => {
    setApproving(art.id)
    try {
      const res = await fetch(`${API}/arts/${art.id}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.jwt}` },
      })
      if (res.ok) setArts(prev => prev.filter(a => a.id !== art.id))
    } catch {}
    setApproving(null)
  }

  if (status === 'loading' || (status === 'authenticated' && !isModerator)) return null

  return (
    <MainLayout>
      <Head><title>Модерация | Стена с картинами</title></Head>
      <div className="mod-page">
        <div className="mod-header">
          <h1 className="mod-title">Модерация</h1>
          <span className="mod-count">{arts.length} на проверке</span>
        </div>

        {loading ? (
          <div className="mod-empty">Загрузка…</div>
        ) : arts.length === 0 ? (
          <div className="mod-empty">Нет работ на модерации 🎉</div>
        ) : (
          <div className="mod-list">
            {arts.map(art => {
              const pic = art.Pictures?.[0]
              const thumb = pic ? imageUrlBuilder(pic.formats?.small?.url || pic.url) : null
              const artistUrl = art.Artist?.slug && art.Artist?.id
                ? `/artists/${art.Artist.slug}--${art.Artist.id}`
                : null
              const artUrl = `/art/${art.slug || art.documentId}--${art.id}`

              return (
                <div key={art.id} className="mod-item">
                  <Link href={artUrl} target="_blank" className="mod-item__thumb">
                    {thumb
                      ? <img src={thumb} alt={art.title} />
                      : <div className="mod-item__no-img" />
                    }
                  </Link>
                  <div className="mod-item__body">
                    <Link href={artUrl} target="_blank" className="mod-item__title">
                      {art.title || 'Без названия'}
                    </Link>
                    {art.Artist && (
                      artistUrl
                        ? <Link href={artistUrl} target="_blank" className="mod-item__artist">{art.Artist.full_name}</Link>
                        : <span className="mod-item__artist">{art.Artist.full_name}</span>
                    )}
                    <div className="mod-item__meta">
                      {art.width && art.height && <span>{art.width} × {art.height} см</span>}
                      {art.Price && <span>{formatPrice(art.Price)}</span>}
                      <span className="mod-item__date">{fmtDate(art.createdAt)}</span>
                    </div>
                    {art.user_uploader && (
                      <div className="mod-item__uploader">
                        Загрузил: {art.user_uploader.username || art.user_uploader.email}
                      </div>
                    )}
                  </div>
                  <div className="mod-item__actions">
                    <Link href={artUrl} target="_blank" className="mod-btn mod-btn--ghost">
                      Просмотр
                    </Link>
                    <button
                      className="mod-btn mod-btn--approve"
                      onClick={() => approve(art)}
                      disabled={approving === art.id}
                    >
                      {approving === art.id ? '…' : 'Одобрить'}
                    </button>
                    <button
                      className="mod-btn mod-btn--reject"
                      onClick={() => reject(art)}
                      disabled={rejecting === art.id}
                    >
                      {rejecting === art.id ? '…' : 'Отклонить'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </MainLayout>
  )
}
