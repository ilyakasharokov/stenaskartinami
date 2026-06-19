import { useState, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import MainLayout from '@/components/layouts/MainLayout'
import Head from 'next/head'

export default function GenerateInteriors() {
  const { data: session } = useSession()
  const router = useRouter()
  const [running, setRunning] = useState(false)
  const [log, setLog] = useState([])
  const [stats, setStats] = useState(null)
  const [limit, setLimit] = useState(5)
  const [artId, setArtId] = useState('')
  const abortRef = useRef(null)
  const logEndRef = useRef(null)

  if (!session?.info?.isModerator) {
    return (
      <MainLayout>
        <div style={{ padding: 40, textAlign: 'center' }}>Доступ запрещён</div>
      </MainLayout>
    )
  }

  function addLog(entry) {
    setLog(prev => [...prev, entry])
    setTimeout(() => logEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  async function start(mode) {
    setRunning(true)
    setLog([])
    setStats(null)

    const params = new URLSearchParams()
    if (mode === 'one' && artId) params.set('artId', artId)
    else if (mode === 'batch') params.set('limit', String(limit))

    const ctrl = new AbortController()
    abortRef.current = ctrl

    try {
      const res = await fetch(`/api/ai/batch-interiors?${params}`, {
        method: 'POST',
        signal: ctrl.signal,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        addLog({ type: 'error', message: err.error || `HTTP ${res.status}` })
        return
      }

      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let buf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n\n')
        buf = lines.pop()
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))
            addLog(data)
            if (data.type === 'done') setStats({ ok: data.ok, failed: data.failed })
          } catch {}
        }
      }
    } catch (e) {
      if (e.name !== 'AbortError') addLog({ type: 'error', message: e.message })
    } finally {
      setRunning(false)
      abortRef.current = null
    }
  }

  function stop() {
    abortRef.current?.abort()
    setRunning(false)
  }

  function renderEntry(e, i) {
    switch (e.type) {
      case 'start':
        return <div key={i} style={{ color: '#888' }}>Найдено {e.total} картин для обработки</div>
      case 'progress':
        return <div key={i} style={{ color: '#aaa' }}>⏳ [{e.index}/{e.total}] #{e.artId} {e.title}</div>
      case 'ok':
        return <div key={i} style={{ color: '#2a9d5c' }}>✓ [{e.index}] #{e.artId} &ldquo;{e.title}&rdquo;
          {e.fileUrl && <a href={e.fileUrl} target="_blank" rel="noreferrer" style={{ marginLeft: 8, fontSize: 12 }}>посмотреть</a>}
        </div>
      case 'error':
        return <div key={i} style={{ color: '#e05a2b' }}>✗ [{e.index}] #{e.artId} &ldquo;{e.title}&rdquo;: {e.message}</div>
      case 'abort':
        return <div key={i} style={{ color: '#e05a2b', fontWeight: 'bold' }}>⚠ Остановлено: {e.reason}</div>
      case 'done':
        return <div key={i} style={{ color: '#333', fontWeight: 'bold', borderTop: '1px solid #eee', paddingTop: 8, marginTop: 4 }}>
          Готово: ✓ {e.ok} успешно, ✗ {e.failed} ошибок
        </div>
      default:
        return null
    }
  }

  return (
    <MainLayout>
      <Head><title>Генерация интерьеров — Стена с картинами</title></Head>
      <div style={{ maxWidth: 760, margin: '40px auto', padding: '0 16px' }}>
        <h1 style={{ fontSize: 24, marginBottom: 24 }}>Генерация интерьерных фото</h1>

        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 32 }}>
          <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 20, flex: '1 1 280px' }}>
            <div style={{ fontWeight: 600, marginBottom: 12 }}>Одна картина</div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, color: '#666', marginBottom: 4 }}>ID картины</label>
              <input
                type="number"
                value={artId}
                onChange={e => setArtId(e.target.value)}
                placeholder="например 16985"
                disabled={running}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 4, fontSize: 14 }}
              />
            </div>
            <button
              onClick={() => start('one')}
              disabled={running || !artId}
              style={{ padding: '8px 20px', background: '#333', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', opacity: (running || !artId) ? 0.5 : 1 }}
            >
              Сгенерировать
            </button>
          </div>

          <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 20, flex: '1 1 280px' }}>
            <div style={{ fontWeight: 600, marginBottom: 12 }}>Пакетная генерация</div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, color: '#666', marginBottom: 4 }}>Количество картин (0 = все, у кого ещё не сгенерирован интерьер)</label>
              <input
                type="number"
                value={limit}
                onChange={e => setLimit(parseInt(e.target.value) || 0)}
                min={0}
                disabled={running}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 4, fontSize: 14 }}
              />
            </div>
            <button
              onClick={() => start('batch')}
              disabled={running}
              style={{ padding: '8px 20px', background: '#333', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', opacity: running ? 0.5 : 1 }}
            >
              Запустить
            </button>
          </div>
        </div>

        {running && (
          <div style={{ marginBottom: 12 }}>
            <button
              onClick={stop}
              style={{ padding: '6px 16px', background: '#e05a2b', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}
            >
              Остановить
            </button>
          </div>
        )}

        {log.length > 0 && (
          <div style={{ background: '#f8f8f8', border: '1px solid #eee', borderRadius: 8, padding: 16, fontFamily: 'monospace', fontSize: 13, lineHeight: 1.7, maxHeight: 400, overflowY: 'auto' }}>
            {log.map((e, i) => renderEntry(e, i))}
            <div ref={logEndRef} />
          </div>
        )}

        {stats && (
          <div style={{ marginTop: 16, padding: '12px 16px', background: stats.failed > 0 ? '#fff3f0' : '#f0fff4', borderRadius: 8, fontSize: 14 }}>
            Итог: {stats.ok} сгенерировано, {stats.failed} ошибок
          </div>
        )}

        <div style={{ marginTop: 32, fontSize: 13, color: '#888', lineHeight: 1.8 }}>
          <div>Модель: <strong>gpt-image-1</strong>, размер 1536×1024, качество medium</div>
          <div>Генерируются только опубликованные картины со стеной, у которых ещё нет фото в интерьере</div>
          <div>Между запросами — пауза 1.5 сек</div>
        </div>
      </div>
    </MainLayout>
  )
}
