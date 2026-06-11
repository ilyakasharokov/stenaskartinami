import { useState, useEffect, useCallback, useRef } from 'react'
import MainLayout from '@/components/layouts/MainLayout'
import Head from 'next/head'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { fetchStrapi } from '@/utils/strapi'
import { resizeAllGridItems } from '@/utils/grid-resizer'
import throttle from '@/utils/throttle'
import Preloader from '@/components/preloader/preloader'
import MyArtItem, { getArtStatus } from '@/components/my-arts/MyArtItem'
import Dialog from '@/components/ui/Dialog'

const TABS = [
  { key: 'all', label: 'Все работы' },
  { key: 'published', label: 'Опубликованные' },
  { key: 'moderation', label: 'На модерации' },
  { key: 'draft', label: 'Черновики' },
]

const GridIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <rect x="0" y="0" width="7" height="7" rx="1"/><rect x="9" y="0" width="7" height="7" rx="1"/>
    <rect x="0" y="9" width="7" height="7" rx="1"/><rect x="9" y="9" width="7" height="7" rx="1"/>
  </svg>
)

const ListIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <rect x="0" y="1" width="16" height="3" rx="1"/><rect x="0" y="7" width="16" height="3" rx="1"/>
    <rect x="0" y="13" width="16" height="3" rx="1"/>
  </svg>
)

export default function MyArts() {
  const { data: session, status } = useSession()
  const [arts, setArts] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [viewMode, setViewMode] = useState('grid')
  const [deleteDialog, setDeleteDialog] = useState({ open: false, documentId: null, deleting: false })

  const resizeThrottled = throttle(
    () => resizeAllGridItems('catalog-item', 'catalog-grid', '.catalog-item__wrapper'),
    100
  )

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.jwt) {
      setLoading(false)
      return
    }

    fetchStrapi(
      `${process.env.NEXT_PUBLIC_API_URL}/arts/my`,
      { headers: { Authorization: `Bearer ${session.jwt}` } }
    )
      .then((data) => {
        setArts(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [session, status])

  useEffect(() => {
    if (!loading && viewMode === 'grid') {
      setTimeout(resizeThrottled, 50)
    }
    window.addEventListener('resize', resizeThrottled)
    return () => window.removeEventListener('resize', resizeThrottled)
  }, [loading, arts, activeTab, viewMode])

  const handleDelete = useCallback((documentId) => {
    setDeleteDialog({ open: true, documentId, deleting: false })
  }, [])

  const confirmDelete = useCallback(async () => {
    const { documentId } = deleteDialog
    setDeleteDialog(d => ({ ...d, deleting: true }))
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/arts/${documentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.jwt}` },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setArts((prev) => prev.filter((a) => a.documentId !== documentId))
      setDeleteDialog({ open: false, documentId: null, deleting: false })
    } catch {
      setDeleteDialog(d => ({ ...d, deleting: false }))
    }
  }, [deleteDialog, session])

  const stats = {
    total: arts.length,
    published: arts.filter((a) => getArtStatus(a) === 'published').length,
    moderation: arts.filter((a) => getArtStatus(a) === 'moderation').length,
    draft: arts.filter((a) => getArtStatus(a) === 'draft').length,
  }

  const filteredArts = activeTab === 'all' ? arts : arts.filter((a) => getArtStatus(a) === activeTab)

  const tabCount = (key) => (key === 'all' ? stats.total : stats[key] ?? 0)

  if (status === 'loading' || loading) {
    return (
      <MainLayout>
        <Head><title>Мои работы | Стена с картинами</title></Head>
        <div className="my-arts-loading"><Preloader /></div>
      </MainLayout>
    )
  }

  if (!session) {
    return (
      <MainLayout>
        <Head><title>Мои работы | Стена с картинами</title></Head>
        <div className="account-page">
          <div className="account-page__unauthorized">Вы не авторизованы</div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <Head><title>Мои работы | Стена с картинами, облачная галерея</title></Head>

      <div className="my-arts-page">
        <div className="my-arts-page__header">
          <div>
            <h1>Мои работы</h1>
            <p>Управляйте своей коллекцией и отслеживайте статус публикаций</p>
          </div>
          <Link href="/account/add-art" className="my-arts-page__add-btn">
            + Добавить работу
          </Link>
        </div>

        <div className="my-arts-stats">
          <div className="my-arts-stats__card">
            <div className="my-arts-stats__value">{stats.total}</div>
            <div className="my-arts-stats__label">Все работы</div>
          </div>
          <div className="my-arts-stats__card my-arts-stats__card--published">
            <div className="my-arts-stats__value">{stats.published}</div>
            <div className="my-arts-stats__label">Опубликовано</div>
          </div>
          <div className="my-arts-stats__card my-arts-stats__card--moderation">
            <div className="my-arts-stats__value">{stats.moderation}</div>
            <div className="my-arts-stats__label">На модерации</div>
          </div>
          <div className="my-arts-stats__card my-arts-stats__card--draft">
            <div className="my-arts-stats__value">{stats.draft}</div>
            <div className="my-arts-stats__label">Черновики</div>
          </div>
        </div>

        <div className="my-arts-tabs">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              className={`my-arts-tabs__btn${activeTab === key ? ' is-active' : ''}`}
              onClick={() => setActiveTab(key)}
            >
              {label}
              <span className="my-arts-tabs__count">{tabCount(key)}</span>
            </button>
          ))}
        </div>

        <div className="my-arts-toolbar">
          <div className="my-arts-toolbar__left">
            <select className="stena-select" style={{ width: 'auto' }}>
              <option value="newest">По дате добавления</option>
            </select>
            <span className="my-arts-toolbar__count">{filteredArts.length} работ</span>
          </div>
          <div className="my-arts-toolbar__view-toggle">
            <button
              className={`my-arts-toolbar__view-btn${viewMode === 'grid' ? ' is-active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Сетка"
            >
              <GridIcon />
            </button>
            <button
              className={`my-arts-toolbar__view-btn${viewMode === 'list' ? ' is-active' : ''}`}
              onClick={() => setViewMode('list')}
              title="Список"
            >
              <ListIcon />
            </button>
          </div>
        </div>

        {filteredArts.length > 0 ? (
          <div className={viewMode === 'grid' ? 'catalog-grid' : 'catalog-grid catalog-grid--list'}>
            {filteredArts.map((art) => (
              <MyArtItem
                key={art.id}
                art={art}
                onDelete={handleDelete}
                imageOnLoad={resizeThrottled}
              />
            ))}
          </div>
        ) : (
          <div className="my-arts-empty">
            <div className="my-arts-empty__title">
              {activeTab === 'all' ? 'У вас пока нет работ' : 'Нет работ в этой категории'}
            </div>
            <div className="my-arts-empty__text">
              {activeTab === 'all'
                ? 'Добавьте свою первую работу, чтобы разместить её в галерее'
                : 'Попробуйте другую вкладку'}
            </div>
            {activeTab === 'all' && (
              <Link href="/account/add-art" className="my-arts-empty__btn">
                + Добавить работу
              </Link>
            )}
          </div>
        )}

        <div className="my-arts-help">
          <span className="my-arts-help__text">Возникли вопросы по размещению работ?</span>
          <Link href="/help" className="my-arts-help__btn">Центр помощи</Link>
        </div>
      </div>

      <Dialog
        open={deleteDialog.open}
        onClose={() => !deleteDialog.deleting && setDeleteDialog({ open: false, documentId: null, deleting: false })}
        title="Удалить работу?"
        danger
        actions={
          <>
            <button
              className="dialog-btn dialog-btn--ghost"
              onClick={() => setDeleteDialog({ open: false, documentId: null, deleting: false })}
              disabled={deleteDialog.deleting}
            >
              Отмена
            </button>
            <button
              className="dialog-btn dialog-btn--danger"
              onClick={confirmDelete}
              disabled={deleteDialog.deleting}
            >
              {deleteDialog.deleting ? 'Удаление…' : 'Удалить'}
            </button>
          </>
        }
      >
        Работа будет удалена безвозвратно. Восстановить её не получится.
      </Dialog>
    </MainLayout>
  )
}
