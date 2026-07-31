import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import MainLayout from '@/components/layouts/MainLayout'
import { Star, ArrowRight } from '@/components/ui/icons'

const API = process.env.NEXT_PUBLIC_API_URL!

const PROFILE_FIELDS = [
  { key: 'description', label: 'Биография', weight: 3, type: 'textarea' },
  { key: 'country',     label: 'Страна',    weight: 1, type: 'text' },
  { key: 'city_name',   label: 'Город',     weight: 1, type: 'text' },
  { key: 'birth_year',  label: 'Год рожд.', weight: 1, type: 'number' },
  { key: 'career_start_year', label: 'Начало карьеры', weight: 0, type: 'number' },
  { key: 'education',   label: 'Образование', weight: 1, type: 'textarea' },
  { key: 'studio_location', label: 'Мастерская', weight: 0, type: 'text' },
] as const

const MAX_SCORE = PROFILE_FIELDS.reduce((s, f) => s + f.weight, 0)

function completeness(artist: any) {
  let score = 0
  for (const f of PROFILE_FIELDS) {
    const v = artist[f.key]
    const filled = v && String(v).trim().length > (f.key === 'description' ? 50 : 0)
    if (filled) score += f.weight
  }
  return Math.round((score / MAX_SCORE) * 100)
}

function ScoreBar({ pct }: { pct: number }) {
  const color = pct < 30 ? '#ef4444' : pct < 70 ? '#f59e0b' : '#22c55e'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ flex: 1, height: 4, background: '#eee', borderRadius: 2 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2, transition: 'width .3s' }} />
      </div>
      <span style={{ fontSize: 11, color: '#888', minWidth: 28 }}>{pct}%</span>
    </div>
  )
}

function MissingTags({ artist }: { artist: any }) {
  const missing = PROFILE_FIELDS.filter(f => {
    const v = artist[f.key]
    return !v || String(v).trim().length <= (f.key === 'description' ? 50 : 0)
  }).filter(f => f.weight > 0).map(f => f.label)
  if (!missing.length) return null
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
      {missing.map(l => (
        <span key={l} style={{ fontSize: 10, padding: '1px 6px', background: '#fef2f2', color: '#ef4444', borderRadius: 10 }}>
          {l}
        </span>
      ))}
    </div>
  )
}

export default function ArtistAdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [artists, setArtists] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any>(null)
  const [form, setForm] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [filter, setFilter] = useState<'all' | 'incomplete'>('incomplete')
  const [search, setSearch] = useState('')

  const isModerator = session?.info?.isModerator ?? session?.info?.is_moderator

  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated') { router.replace('/'); return }
    if (status === 'authenticated' && session?.info !== undefined && !isModerator) router.replace('/')
  }, [status, isModerator, session?.info, router])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // Load all artists (paginated)
      let all: any[] = []
      let page = 1
      while (true) {
        const res = await fetch(`${API}/artists?pagination[page]=${page}&pagination[pageSize]=100&sort=full_name:asc`, {
          headers: { Authorization: `Bearer ${session?.jwt}` },
        })
        const json = await res.json()
        const items = json?.data || []
        all = [...all, ...items]
        if (all.length >= (json?.meta?.pagination?.total || 0)) break
        page++
      }
      setArtists(all)
    } catch {}
    setLoading(false)
  }, [session?.jwt])

  useEffect(() => { if (session?.jwt) load() }, [load, session?.jwt])

  function selectArtist(artist: any) {
    setSelected(artist)
    setSaved(false)
    const f: Record<string, any> = {}
    for (const field of PROFILE_FIELDS) f[field.key] = artist[field.key] ?? ''
    setForm(f)
  }

  async function save() {
    if (!selected) return
    setSaving(true)
    try {
      await fetch(`${API}/artists/${selected.documentId}/admin`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.jwt}` },
        body: JSON.stringify(form),
      })
      // Update local state
      setArtists(prev => prev.map(a =>
        a.documentId === selected.documentId ? { ...a, ...form } : a
      ))
      setSelected((prev: any) => ({ ...prev, ...form }))
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {}
    setSaving(false)
  }

  const displayed = artists
    .filter(a => filter === 'all' || completeness(a) < 100)
    .filter(a => !search || (a.full_name || '').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => completeness(a) - completeness(b))

  if (status === 'loading' || (status === 'authenticated' && !isModerator)) return null

  return (
    <MainLayout>
      <Head><title>Художники | Администрирование</title></Head>
      <div className="mod-artists">
        {/* Sidebar */}
        <div className="mod-artists__list">
          <div className="mod-artists__list-head">
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <input
                className="mod-artists__search"
                placeholder="Поиск…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <select
                className="mod-artists__filter-sel"
                value={filter}
                onChange={e => setFilter(e.target.value as any)}
              >
                <option value="incomplete">Неполные</option>
                <option value="all">Все</option>
              </select>
            </div>
            <div style={{ fontSize: 12, color: '#888' }}>{displayed.length} художников</div>
          </div>

          {loading ? (
            <div className="mod-empty">Загрузка…</div>
          ) : (
            <div className="mod-artists__items">
              {displayed.map(a => {
                const pct = completeness(a)
                const isActive = selected?.documentId === a.documentId
                return (
                  <div
                    key={a.documentId}
                    className={`mod-artists__item${isActive ? ' mod-artists__item--active' : ''}`}
                    onClick={() => selectArtist(a)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span className="mod-artists__item-name">{a.full_name || '—'}</span>
                      <span style={{ fontSize: 11, color: '#aaa' }}>{a.works_count || 0} работ</span>
                    </div>
                    <ScoreBar pct={pct} />
                    <MissingTags artist={a} />
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Edit panel */}
        <div className="mod-artists__editor">
          {!selected ? (
            <div className="mod-artists__editor-empty">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ddd" strokeWidth="1.5">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <p>Выберите художника</p>
            </div>
          ) : (
            <div className="mod-artists__editor-inner">
              <div className="mod-artists__editor-head">
                <div>
                  <h2 className="mod-artists__editor-title">{selected.full_name}</h2>
                  <Link
                    href={`/artists/${selected.slug}--${selected.id}`}
                    target="_blank"
                    className="mod-artists__editor-link"
                  >
                    Открыть профиль <ArrowRight size={13} style={{ verticalAlign: 'middle' }} />
                  </Link>
                </div>
                <button
                  className={`mod-btn ${saved ? 'mod-btn--saved' : ''}`}
                  style={{ background: saved ? '#22c55e' : '#111', color: '#fff', minWidth: 90 }}
                  onClick={save}
                  disabled={saving}
                >
                  {saving ? '…' : saved ? 'Сохранено' : 'Сохранить'}
                </button>
              </div>

              <div className="mod-artists__fields">
                {PROFILE_FIELDS.map(field => (
                  <div key={field.key} className="mod-artists__field">
                    <label className="mod-artists__field-label">
                      {field.label}
                      {field.weight > 0 && <Star size={12} filled style={{ color: '#f59e0b', marginLeft: 4, verticalAlign: 'middle' }} />}
                    </label>
                    {field.type === 'textarea' ? (
                      <textarea
                        className="mod-artists__input mod-artists__input--ta"
                        value={form[field.key] || ''}
                        onChange={e => setForm(p => ({ ...p, [field.key]: e.target.value }))}
                        rows={field.key === 'description' ? 6 : 3}
                        placeholder={`Введите ${field.label.toLowerCase()}…`}
                      />
                    ) : (
                      <input
                        className="mod-artists__input"
                        type={field.type}
                        value={form[field.key] || ''}
                        onChange={e => setForm(p => ({ ...p, [field.key]: e.target.value }))}
                        placeholder={`Введите ${field.label.toLowerCase()}…`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  )
}
