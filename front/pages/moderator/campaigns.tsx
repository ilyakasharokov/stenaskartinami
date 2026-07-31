import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import MainLayout from '@/components/layouts/MainLayout'
import { Check, X, RotateCw } from '@/components/ui/icons'

const API = process.env.NEXT_PUBLIC_API_URL!

const FIELDS = [
  { key: 'description', weight: 3, minLen: 50 },
  { key: 'country',     weight: 1, minLen: 0 },
  { key: 'city_name',   weight: 1, minLen: 0 },
  { key: 'birth_year',  weight: 1, minLen: 0 },
  { key: 'education',   weight: 1, minLen: 0 },
]
const MAX_SCORE = FIELDS.reduce((s, f) => s + f.weight, 0)

function score(artist: any) {
  let s = 0
  for (const f of FIELDS) {
    const v = artist[f.key]
    if (v && String(v).trim().length > f.minLen) s += f.weight
  }
  return Math.round((s / MAX_SCORE) * 100)
}

function ScoreDiff({ before, after }: { before: number; after: number | null }) {
  if (after === null) return <span style={{ color: '#bbb' }}>—</span>
  const diff = after - before
  return (
    <span style={{ color: diff > 0 ? '#22c55e' : diff < 0 ? '#ef4444' : '#aaa' }}>
      {before}% → {after}%{diff > 0 ? ` (+${diff}%)` : ''}
    </span>
  )
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

const DEFAULT_BODY = `Мы заметили, что ваш профиль на «Стена с картинами» ещё не заполнен.

Заполненный профиль помогает покупателям лучше познакомиться с вами и вашим творчеством, что повышает шансы на продажу.

Нажмите кнопку ниже, чтобы добавить биографию, город и другую информацию о себе:`

export default function CampaignsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [tab, setTab] = useState<'compose' | 'stats'>('compose')

  // Artists
  const [artists, setArtists] = useState<any[]>([])
  const [loadingArtists, setLoadingArtists] = useState(true)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [filterScore, setFilterScore] = useState(70)

  // Compose
  const [subject, setSubject] = useState('Заполните профиль художника на «Стена с картинами»')
  const [body, setBody] = useState(DEFAULT_BODY)
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<any>(null)
  const campaignId = useRef(crypto.randomUUID())

  // Stats
  const [logs, setLogs] = useState<any[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const isModerator = session?.info?.isModerator ?? session?.info?.is_moderator

  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated') { router.replace('/'); return }
    if (status === 'authenticated' && session?.info !== undefined && !isModerator) router.replace('/')
  }, [status, isModerator, session?.info, router])

  const loadArtists = useCallback(async () => {
    if (!session?.jwt) return
    setLoadingArtists(true)
    try {
      let all: any[] = [], page = 1
      while (true) {
        const res = await fetch(
          `${API}/artists?pagination[page]=${page}&pagination[pageSize]=100&sort=full_name:asc&fields[0]=full_name&fields[1]=email&fields[2]=description&fields[3]=country&fields[4]=city_name&fields[5]=birth_year&fields[6]=education&fields[7]=slug`,
          { headers: { Authorization: `Bearer ${session.jwt}` } }
        )
        const json = await res.json()
        all = [...all, ...(json?.data || [])]
        if (all.length >= (json?.meta?.pagination?.total || 0)) break
        page++
      }
      setArtists(all)
    } catch {}
    setLoadingArtists(false)
  }, [session?.jwt])

  const loadLogs = useCallback(async () => {
    if (!session?.jwt) return
    setLoadingLogs(true)
    try {
      const res = await fetch(`${API}/mail/logs`, {
        headers: { Authorization: `Bearer ${session.jwt}` },
      })
      const json = await res.json()
      setLogs(json?.data || [])
    } catch {}
    setLoadingLogs(false)
  }, [session?.jwt])

  useEffect(() => { if (session?.jwt) loadArtists() }, [loadArtists, session?.jwt])
  useEffect(() => { if (tab === 'stats') loadLogs() }, [tab, loadLogs])

  const filtered = artists.filter(a => {
    const s = score(a)
    const hasEmail = !!a.email
    return hasEmail && s < filterScore
  })

  function toggleAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map((a: any) => a.id)))
    }
  }

  async function send() {
    if (!selected.size || !session?.jwt) return
    setSending(true)
    setSendResult(null)
    try {
      const res = await fetch(`${API}/mail/send-campaign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.jwt}` },
        body: JSON.stringify({
          artistIds: [...selected],
          subject,
          body,
          campaignId: campaignId.current,
        }),
      })
      const json = await res.json()
      setSendResult(json)
      campaignId.current = crypto.randomUUID()
    } catch (e: any) {
      setSendResult({ error: e.message })
    }
    setSending(false)
  }

  async function refreshScores() {
    if (!session?.jwt) return
    setRefreshing(true)
    try {
      await fetch(`${API}/mail/refresh-scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.jwt}` },
        body: JSON.stringify({}),
      })
      await loadLogs()
    } catch {}
    setRefreshing(false)
  }

  if (status === 'loading' || (status === 'authenticated' && !isModerator)) return null

  const sentOk = sendResult?.results?.filter((r: any) => r.ok).length ?? 0
  const sentFail = sendResult?.results?.filter((r: any) => !r.ok).length ?? 0

  return (
    <MainLayout>
      <Head><title>Рассылки | Администрирование</title></Head>
      <div className="camp-page">
        <div className="camp-header">
          <h1 className="camp-title">Рассылки</h1>
          <div className="camp-tabs">
            <button className={`camp-tab${tab === 'compose' ? ' camp-tab--active' : ''}`} onClick={() => setTab('compose')}>Отправить</button>
            <button className={`camp-tab${tab === 'stats' ? ' camp-tab--active' : ''}`} onClick={() => setTab('stats')}>Статистика</button>
          </div>
        </div>

        {tab === 'compose' && (
          <div className="camp-compose">
            {/* Recipients */}
            <div className="camp-section">
              <div className="camp-section-head">
                <span className="camp-section-title">Получатели</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <label style={{ fontSize: 13, color: '#666', display: 'flex', alignItems: 'center', gap: 6 }}>
                    Профиль заполнен менее чем на
                    <input
                      type="number" min={10} max={100} value={filterScore}
                      onChange={e => setFilterScore(Number(e.target.value))}
                      style={{ width: 50, padding: '2px 6px', border: '1.5px solid #e5e7eb', borderRadius: 6, fontSize: 13 }}
                    />%
                  </label>
                  <span style={{ fontSize: 12, color: '#888' }}>{filtered.length} подходит</span>
                </div>
              </div>

              <div className="camp-recipients">
                <div className="camp-recipient-head">
                  <input type="checkbox"
                    checked={selected.size === filtered.length && filtered.length > 0}
                    onChange={toggleAll}
                  />
                  <span style={{ fontSize: 12, color: '#888' }}>
                    Выбрано: {selected.size} из {filtered.length}
                  </span>
                </div>
                <div className="camp-recipient-list">
                  {loadingArtists ? <div className="camp-empty">Загрузка…</div> : filtered.map(a => (
                    <label key={a.id} className="camp-recipient-item">
                      <input
                        type="checkbox"
                        checked={selected.has(a.id)}
                        onChange={e => {
                          const s = new Set(selected)
                          e.target.checked ? s.add(a.id) : s.delete(a.id)
                          setSelected(s)
                        }}
                      />
                      <span className="camp-recipient-name">{a.full_name || '—'}</span>
                      <span className="camp-recipient-email">{a.email}</span>
                      <span className="camp-recipient-score">{score(a)}%</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Message */}
            <div className="camp-section">
              <div className="camp-section-head">
                <span className="camp-section-title">Письмо</span>
              </div>
              <div className="camp-field">
                <label className="camp-label">Тема</label>
                <input className="camp-input" value={subject} onChange={e => setSubject(e.target.value)} />
              </div>
              <div className="camp-field">
                <label className="camp-label">Текст</label>
                <textarea className="camp-input camp-input--ta" rows={8} value={body} onChange={e => setBody(e.target.value)} />
                <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>
                  После текста автоматически добавляется кнопка «Заполнить профиль» и пиксель отслеживания
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8 }}>
                <button
                  className="mod-btn"
                  style={{ background: '#111', color: '#fff', padding: '10px 24px', fontSize: 14 }}
                  onClick={send}
                  disabled={sending || !selected.size}
                >
                  {sending ? 'Отправка…' : `Отправить ${selected.size ? `(${selected.size})` : ''}`}
                </button>
                {sendResult && (
                  <span style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6, color: sentFail ? '#ef4444' : '#22c55e' }}>
                    {sentOk > 0 && <><Check size={15} /> Отправлено: {sentOk}</>}
                    {sentFail > 0 && <><X size={15} /> Ошибок: {sentFail}</>}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === 'stats' && (
          <div className="camp-stats">
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <button
                className="mod-btn mod-btn--ghost"
                onClick={refreshScores}
                disabled={refreshing}
                style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                {refreshing ? 'Обновление…' : <><RotateCw size={15} /> Обновить % заполнения</>}
              </button>
            </div>

            {loadingLogs ? (
              <div className="camp-empty">Загрузка…</div>
            ) : logs.length === 0 ? (
              <div className="camp-empty">Рассылок ещё не было</div>
            ) : (
              <>
                <div className="camp-stats-summary">
                  <div className="camp-stat-card">
                    <div className="camp-stat-val">{logs.length}</div>
                    <div className="camp-stat-lbl">Отправлено</div>
                  </div>
                  <div className="camp-stat-card">
                    <div className="camp-stat-val">{logs.filter(l => l.opened_at).length}</div>
                    <div className="camp-stat-lbl">Открыто ({Math.round(logs.filter(l => l.opened_at).length / logs.length * 100)}%)</div>
                  </div>
                  <div className="camp-stat-card">
                    <div className="camp-stat-val">{logs.filter(l => l.clicked_at).length}</div>
                    <div className="camp-stat-lbl">Перешли ({Math.round(logs.filter(l => l.clicked_at).length / logs.length * 100)}%)</div>
                  </div>
                  <div className="camp-stat-card">
                    <div className="camp-stat-val">{logs.filter(l => l.score_after != null && l.score_after > l.score_before).length}</div>
                    <div className="camp-stat-lbl">Заполнили профиль</div>
                  </div>
                </div>

                <table className="camp-table">
                  <thead>
                    <tr>
                      <th>Художник</th>
                      <th>Отправлено</th>
                      <th>Открыл</th>
                      <th>Перешёл</th>
                      <th>Заполнение</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map(log => (
                      <tr key={log.id}>
                        <td>
                          {log.artist ? (
                            <Link href={`/artists/${log.artist.slug}--${log.artist.id}`} target="_blank">
                              {log.artist.full_name}
                            </Link>
                          ) : log.recipient_email}
                        </td>
                        <td>{fmtDate(log.sent_at)}</td>
                        <td>
                          {log.opened_at
                            ? <span style={{ color: '#22c55e', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Check size={14} /> {fmtDate(log.opened_at)}</span>
                            : <span style={{ color: '#ddd' }}>—</span>}
                        </td>
                        <td>
                          {log.clicked_at
                            ? <span style={{ color: '#22c55e', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Check size={14} /> {fmtDate(log.clicked_at)}</span>
                            : <span style={{ color: '#ddd' }}>—</span>}
                        </td>
                        <td>
                          <ScoreDiff before={log.score_before} after={log.score_after ?? null} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  )
}
