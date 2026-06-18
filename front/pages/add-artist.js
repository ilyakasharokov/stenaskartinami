import { useState, useRef, useEffect, useCallback } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import MainLayout from '@/components/layouts/MainLayout'
import { getSession } from '@/lib/getSession'
import { useToast } from '@/components/ui/Toast'
import { fetchStrapi } from '@/utils/strapi'
import { API_HOST } from '@/constants/constants'
const MESSENGER_TYPES = [['telegram', 'Telegram'], ['whatsapp', 'WhatsApp'], ['phone', 'Телефон'], ['email', 'Email']]

const STEPS = [
  { num: 1, label: 'Основная информация', sub: 'Имя, направление и специализация' },
  { num: 2, label: 'Биография', sub: 'О себе, техники и достижения' },
  { num: 3, label: 'Соцсети и контакты', sub: 'Как с вами связаться' },
  { num: 4, label: 'Подтверждение', sub: 'Фото профиля и публикация' },
]

const STORAGE_KEY = 'add-artist-draft'

const initState = () => {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        return { ...parsed, avatar: null, cover: null, photos: [] }
      }
    } catch {}
  }
  return {
    full_name: '', nickname: '', country: 'Россия', city_name: '',
    directions: [], birth_year: '', career_start_year: '', profile_type: 'real_user',
    description: '', techniques: [], subjects: [], education: '',
    exhibitions: [],  // items: { title, place, date_from, date_to, wall_id }
    instagram: '', telegram: '', vk: '', facebook: '', website: '', behance: '',
    email: '', phone: '', messenger_type: 'telegram', studio_location: '', timezone: '',
    avatar: null, cover: null, photos: [],
    agree: false,
  }
}

function StringMultiSelect({ label, options, value, onChange }) {
  const [filter, setFilter] = useState('')
  const filterLower = filter.toLowerCase()
  const canAddCustom = filter.trim().length > 1 &&
    !options.some(o => o.toLowerCase() === filter.toLowerCase()) &&
    !value.includes(filter.trim())
  const available = options.filter(o => !value.includes(o) && (!filter || o.toLowerCase().includes(filterLower)))
  const addCustom = (text) => { const t = text.trim(); if (t) { onChange([...value, t]); setFilter('') } }
  return (
    <div className="ms-field">
      <label className="aw-label">{label}</label>
      <div className="ms-selected">
        {value.map(v => (
          <span key={v} className="ms-pill">
            {v}
            <button type="button" className="ms-pill__remove" onClick={() => onChange(value.filter(x => x !== v))}>×</button>
          </span>
        ))}
      </div>
      <div className="ms-search-wrap">
        <i className="ms-search-wrap__icon">⌕</i>
        <input
          type="text"
          className="aw-input"
          placeholder="Поиск или свой вариант…"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          onKeyDown={e => {
            if ((e.key === 'Enter' || e.key === ',') && canAddCustom) { e.preventDefault(); addCustom(filter) }
          }}
        />
      </div>
      <div className="ms-options">
        {available.map(o => (
          <div key={o} className="ms-chip" onClick={() => onChange([...value, o])} role="button" tabIndex={0}
            onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onChange([...value, o])}>
            {o}
          </div>
        ))}
        {canAddCustom && (
          <div className="ms-chip ms-chip--add" onClick={() => addCustom(filter)} role="button" tabIndex={0}
            onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && addCustom(filter)}>
            + Добавить «{filter.trim()}»
          </div>
        )}
      </div>
    </div>
  )
}

export default function AddArtist() {
  const router = useRouter()
  const { data: session } = useSession()
  const showToast = useToast()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(initState)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [wallsList, setWallsList] = useState([])
  const [existingArtist, setExistingArtist] = useState(null)
  const [options, setOptions] = useState({ directions: [], techniques: [], subjects: [] })
  const avatarInputRef = useRef(null)
  const coverInputRef = useRef(null)
  const photosInputRef = useRef(null)

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }))

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/walls?pagination[limit]=200&sort=Title:asc`)
      .then(r => r.json())
      .then(json => {
        const items = Array.isArray(json) ? json : (Array.isArray(json?.data) ? json.data : [])
        setWallsList(items)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    Promise.all([
      fetchStrapi(API_HOST + '/styles?pagination[limit]=200'),
      fetchStrapi(API_HOST + '/mediums?pagination[limit]=200'),
      fetchStrapi(API_HOST + '/subjects?pagination[limit]=200'),
    ]).then(([styles, mediums, subjects]) => {
      setOptions({
        directions: (Array.isArray(styles)  ? styles  : []).map(i => i.Title).filter(Boolean),
        techniques: (Array.isArray(mediums)  ? mediums  : []).map(i => i.title).filter(Boolean),
        subjects:   (Array.isArray(subjects) ? subjects : []).map(i => i.Title).filter(Boolean),
      })
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!session?.jwt) return
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/me?populate[0]=pending_artist`, {
      headers: { Authorization: `Bearer ${session.jwt}` },
    })
      .then(r => r.json())
      .then(user => {
        if (user?.pending_artist && user?.artist_confirmed) {
          setExistingArtist(user.pending_artist)
        }
      })
      .catch(() => {})
  }, [session?.jwt])

  useEffect(() => {
    try {
      const { avatar, cover, photos, ...rest } = form
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rest))
    } catch {}
  }, [form])

  const handleAvatar = (files) => {
    const file = files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    setForm(f => ({ ...f, avatar: { file, url: URL.createObjectURL(file) } }))
  }

  const handleCover = (files) => {
    const file = files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    setForm(f => ({ ...f, cover: { file, url: URL.createObjectURL(file) } }))
  }

  const handlePhotos = useCallback((files) => {
    const allowed = [...files].filter(f => f.type.startsWith('image/'))
    if (!allowed.length) return
    setForm(f => {
      const remaining = 6 - f.photos.length
      const toAdd = allowed.slice(0, remaining).map(file => ({ file, url: URL.createObjectURL(file) }))
      return { ...f, photos: [...f.photos, ...toAdd] }
    })
  }, [])

  const removePhoto = (idx) => setForm(f => ({ ...f, photos: f.photos.filter((_, i) => i !== idx) }))

  const addExhibition = () => setForm(f => ({ ...f, exhibitions: [...f.exhibitions, { title: '', place: '', date_from: '', date_to: '', wall_id: '' }] }))
  const updateExhibition = (idx, key, value) => setForm(f => ({
    ...f,
    exhibitions: f.exhibitions.map((e, i) => i === idx ? { ...e, [key]: value } : e),
  }))
  const removeExhibition = (idx) => setForm(f => ({ ...f, exhibitions: f.exhibitions.filter((_, i) => i !== idx) }))

  const fillFromSession = () => {
    if (!session?.user) return
    setForm(f => ({
      ...f,
      full_name: f.full_name || session.user.name || '',
      email: f.email || session.user.email || '',
    }))
  }

  const validateStep = (s) => {
    const e = {}
    if (s === 1) {
      if (!form.full_name.trim()) e.full_name = 'Укажите имя художника'
      if (!form.avatar) e.avatar = 'Добавьте фото профиля'
    }
    if (s === 4) {
      if (!form.agree) e.agree = 'Подтвердите, что информация верна'
    }
    return e
  }

  const goNext = () => {
    const e = validateStep(step)
    if (Object.keys(e).length) { setErrors(e); return }
    setErrors({})
    setStep(s => s + 1)
    window.scrollTo(0, 0)
  }

  const goBack = () => { setErrors({}); setStep(s => s - 1); window.scrollTo(0, 0) }

  const uploadFile = async (file, jwt) => {
    const fd = new FormData()
    fd.append('files', file)
    const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${jwt}` },
      body: fd,
    })
    const arr = await r.json()
    return arr[0]?.id
  }

  const submit = async () => {
    if (!session?.jwt) { router.push('/auth/signin?callbackUrl=/add-artist'); return }
    const e1 = validateStep(1)
    const e4 = validateStep(4)
    const allErrors = { ...e1, ...e4 }
    if (Object.keys(allErrors).length) {
      setErrors(allErrors)
      if (Object.keys(e1).length) setStep(1)
      return
    }
    setSubmitting(true)
    try {
      const jwt = session.jwt
      const avatarId = form.avatar ? await uploadFile(form.avatar.file, jwt) : null
      const coverId = form.cover ? await uploadFile(form.cover.file, jwt) : null

      const body = {
        data: {
          full_name: form.full_name,
          nickname: form.nickname || null,
          country: form.country || null,
          city_name: form.city_name || null,
          directions: form.directions,
          birth_year: form.birth_year ? Number(form.birth_year) : null,
          career_start_year: form.career_start_year ? Number(form.career_start_year) : null,
          profile_type: form.profile_type,
          description: form.description || null,
          techniques: form.techniques,
          subjects: form.subjects,
          education: form.education || null,
          exhibitions: form.exhibitions
            .filter(ex => ex.title.trim())
            .map(ex => ({
              title: ex.title,
              place: ex.place || null,
              date_from: ex.date_from || null,
              date_to: ex.date_to || null,
              wall_id: ex.wall_id || null,
            })),
          social_links: {
            instagram: form.instagram || null,
            telegram: form.telegram || null,
            vk: form.vk || null,
            facebook: form.facebook || null,
            website: form.website || null,
            behance: form.behance || null,
          },
          email: form.email || null,
          Phone: form.phone || null,
          messenger_type: form.messenger_type,
          studio_location: form.studio_location || null,
          timezone: form.timezone || null,
          avatar: avatarId || null,
          cover: coverId || null,
        },
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/artists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) {
        const msg = json?.error?.message || `Ошибка ${res.status}`
        if (res.status === 400 && json?.error?.message?.includes('уже есть профиль')) {
          showToast('У вас уже есть профиль художника. Перенаправляем…', 'warn')
          const meRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/me?populate[0]=pending_artist`, {
            headers: { Authorization: `Bearer ${jwt}` },
          })
          const me = await meRes.json()
          const artist = me?.pending_artist
          if (artist) {
            setExistingArtist(artist)
            router.push(`/artists/${artist.slug || artist.documentId}--${artist.id}`)
          }
          return
        }
        showToast(msg, 'error')
        return
      }
      const artist = json?.data
      localStorage.removeItem(STORAGE_KEY)
      router.push(`/artists/${(artist?.slug || artist?.documentId)}--${artist?.id}`)
    } catch (err) {
      showToast('Ошибка при сохранении: ' + err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const Sidebar = () => {
    if (step === 1) return (
      <div className="aw-sidebar">
        <div className="aw-sb-section">
          <div className="aw-sb-section__title">Предпросмотр</div>
          <div className="aw-sb-preview">
            <div className="aw-sb-preview__avatar">
              {form.avatar
                ? <img src={form.avatar.url} alt="" />
                : <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>
              }
            </div>
            <div className="aw-sb-preview__name">{form.full_name || 'Имя художника'}</div>
            <div className="aw-sb-preview__loc">{[form.country, form.city_name].filter(Boolean).join(', ') || 'Страна, город'}</div>
            {form.directions.length > 0
              ? <div className="aw-sb-preview__dir">{form.directions.slice(0, 2).join(', ')}</div>
              : <div className="aw-sb-preview__dir aw-sb-preview__dir--hint">Направление</div>
            }
            <div className="aw-sb-preview__bio-hint">Биография появится здесь после заполнения</div>
            <div className="aw-sb-preview__stats">
              <div><strong>0</strong><span>работ</span></div>
              <div><strong>0</strong><span>стен</span></div>
              <div><strong>0</strong><span>подписчиков</span></div>
            </div>
          </div>
        </div>

        <div className="aw-sb-section">
          <div className="aw-sb-section__title">Тип профиля</div>
          <div className="aw-sb-section__sub">Кем является художник на платформе?</div>
          <div className="aw-ptype-list">
            <label className={`aw-ptype-card${form.profile_type === 'real_user' ? ' aw-ptype-card--active' : ''}`}>
              <input type="radio" name="profile_type" checked={form.profile_type === 'real_user'} onChange={() => set('profile_type', 'real_user')} />
              <div className="aw-ptype-card__body">
                <div className="aw-ptype-card__name">Реальный пользователь</div>
                <div className="aw-ptype-card__desc">Художник связан с аккаунтом пользователя. Он сможет управлять профилем и работами.</div>
              </div>
            </label>
            <label className={`aw-ptype-card${form.profile_type === 'organization' ? ' aw-ptype-card--active' : ''}`}>
              <input type="radio" name="profile_type" checked={form.profile_type === 'organization'} onChange={() => set('profile_type', 'organization')} />
              <div className="aw-ptype-card__body">
                <div className="aw-ptype-card__name">Представлен организацией</div>
                <div className="aw-ptype-card__desc">Профиль ведёт галерея, студия или другое юридическое лицо.</div>
              </div>
            </label>
          </div>
          <div className="aw-ptype-note">ⓘ Тип профиля можно изменить в настройках позже.</div>
        </div>
      </div>
    )

    const tips = step === 2
      ? ['Подробная биография помогает рассказать вашу историю', 'Выставки и достижения повышают доверие к профилю', 'Указанные техники помогут точнее подбирать ваши работы']
      : step === 3
      ? ['Соцсети помогают посетителям узнать больше о вашем творчестве', 'Контакты позволяют владельцам стен связаться напрямую']
      : ['Проверьте данные перед публикацией', 'После публикации профиль сразу станет виден всем посетителям']

    const title = step === 2 ? 'Почему это важно?' : step === 3 ? 'Зачем указывать контакты?' : 'Перед публикацией'

    return (
      <div className="aw-sidebar">
        <div className="aw-sidebar__why">
          <div className="aw-sidebar__why-title">{title}</div>
          <ul className="aw-sidebar__check-list">
            {tips.map((item, i) => (
              <li key={i}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="8" fill="#e8f5e9" />
                  <path d="M4.5 8l2.5 2.5 4.5-4.5" stroke="#2e7d32" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {step === 4 && (
          <div className="aa-preview">
            <div className="aa-preview__cover">
              {form.cover ? <img src={form.cover.url} alt="" /> : <div className="aa-preview__cover-empty" />}
              <div className="aa-preview__avatar">
                {form.avatar
                  ? <img src={form.avatar.url} alt="" />
                  : <span>{(form.full_name || '?').slice(0, 1).toUpperCase()}</span>
                }
              </div>
            </div>
            <div className="aa-preview__body">
              <div className="aa-preview__name">{form.full_name || 'Имя художника'}</div>
              {form.city_name && <div className="aa-preview__loc">{[form.country, form.city_name].filter(Boolean).join(', ')}</div>}
              {form.directions.length > 0 && (
                <div className="aa-preview__tags">
                  {form.directions.slice(0, 3).map(d => <span key={d} className="aa-preview__tag">{d}</span>)}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  const Step1 = () => (
    <div className="aw-step">
      <div className="aw-step__head">
        <h1 className="aw-step__title">Основная информация</h1>
      </div>

      {existingArtist && (
        <div className="aw-existing-artist-banner">
          У вас уже есть профиль художника.{' '}
          <Link href={`/artists/${existingArtist.slug || existingArtist.documentId}--${existingArtist.id}`}>
            Перейти к профилю →
          </Link>
        </div>
      )}
      {session?.user && !existingArtist && (
        <button type="button" className="aw-me-btn" onClick={fillFromSession}>
          ЭТО Я — заполнить из профиля
        </button>
      )}

      <div className="aw-step1-top">
        <div className="aw-step1-photo">
          <div className={`aa-avatar-rect${errors.avatar ? ' aa-avatar-rect--err' : ''}`} onClick={() => avatarInputRef.current?.click()}>
            {form.avatar
              ? <img src={form.avatar.url} alt="" />
              : <>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                  <span className="aa-avatar-rect__label">Загрузить фото</span>
                  <span className="aa-avatar-rect__hint">JPG, PNG или WEBP, не более 10 МБ.</span>
                </>
            }
            <input ref={avatarInputRef} type="file" accept="image/*" className="aw-file-input" onChange={e => handleAvatar(e.target.files)} />
          </div>
          {errors.avatar && <div className="aw-err">{errors.avatar}</div>}
        </div>

        <div className="aw-step1-fields">
          <div className="aw-field">
            <label className="aw-label">Имя художника <span className="aw-req">*</span></label>
            <input className={`aw-input${errors.full_name ? ' aw-input--err' : ''}`} value={form.full_name}
              maxLength={100} onChange={e => set('full_name', e.target.value)} placeholder="Например: Василий Кандинский" />
            {errors.full_name && <div className="aw-err">{errors.full_name}</div>}
          </div>
          <div className="aw-field">
            <label className="aw-label">Псевдоним / Творческий псевдоним</label>
            <input className="aw-input" value={form.nickname} onChange={e => set('nickname', e.target.value)} placeholder="Если есть" />
          </div>
          <div className="aw-field">
            <label className="aw-label">Страна</label>
            <input className="aw-input" value={form.country} onChange={e => set('country', e.target.value)} placeholder="Выберите страну" />
          </div>
          <div className="aw-field">
            <label className="aw-label">Город</label>
            <input className="aw-input" value={form.city_name} onChange={e => set('city_name', e.target.value)} placeholder="Например: Москва" />
          </div>
        </div>
      </div>

      <StringMultiSelect
        label="Направление / Стиль"
        options={options.directions}
        value={form.directions}
        onChange={v => set('directions', v)}
      />

      <div className="aw-row2" style={{ marginTop: 16 }}>
        <div className="aw-field">
          <label className="aw-label">Год рождения <span className="aw-opt">(необязательно)</span></label>
          <input className="aw-input" inputMode="numeric" pattern="[0-9]*" value={form.birth_year}
            onChange={e => set('birth_year', e.target.value.replace(/\D/g, ''))} placeholder="Год" />
        </div>
        <div className="aw-field">
          <label className="aw-label">Год начала творчества <span className="aw-opt">(необязательно)</span></label>
          <input className="aw-input" inputMode="numeric" pattern="[0-9]*" value={form.career_start_year}
            onChange={e => set('career_start_year', e.target.value.replace(/\D/g, ''))} placeholder="Год" />
          <div className="aw-hint">Если неизвестно — оставьте пустым</div>
        </div>
      </div>
    </div>
  )

  const Step2 = () => (
    <div className="aw-step">
      <div className="aw-step__head">
        <h1 className="aw-step__title">Биография</h1>
        <span className="aw-step__badge">2 из 4</span>
      </div>
      <p className="aw-step__sub">Расскажите о своём творческом пути.</p>

      <div className="aw-field" style={{ marginBottom: 16 }}>
        <label className="aw-label">О себе <span className="aw-opt">(необязательно)</span></label>
        <textarea className="aw-textarea" value={form.description} maxLength={1000} rows={6}
          onChange={e => set('description', e.target.value)}
          placeholder="Расскажите о своём пути в искусстве, источниках вдохновения и подходе к творчеству…" />
        <div className="aw-counter aw-counter--right">{form.description.length} / 1000</div>
      </div>

      <StringMultiSelect
        label="Техники"
        options={options.techniques}
        value={form.techniques}
        onChange={v => set('techniques', v)}
      />

      <div style={{ marginTop: 16 }}>
        <StringMultiSelect
          label="Темы и сюжеты"
          options={options.subjects}
          value={form.subjects}
          onChange={v => set('subjects', v)}
        />
      </div>

      <div className="aw-field" style={{ marginBottom: 20 }}>
        <label className="aw-label">Образование <span className="aw-opt">(необязательно)</span></label>
        <input className="aw-input" value={form.education} onChange={e => set('education', e.target.value)} placeholder="Например: МГАХИ им. Сурикова" />
      </div>

      <div className="aw-field">
        <label className="aw-label">Выставки и достижения <span className="aw-opt">(необязательно)</span></label>
        <div className="aa-exh-list">
          {form.exhibitions.map((ex, i) => (
            <div key={i} className="aa-exh-card">
              <div className="aa-exh-card__row1">
                <input className="aw-input aa-exh-card__title" value={ex.title} onChange={e => updateExhibition(i, 'title', e.target.value)} placeholder="Название выставки или мероприятия" />
                <button type="button" className="aa-exh-row__remove" onClick={() => removeExhibition(i)}>×</button>
              </div>
              <div className="aa-exh-card__row2">
                <input className="aw-input" value={ex.place} onChange={e => updateExhibition(i, 'place', e.target.value)} placeholder="Место проведения" />
                <div className="aa-exh-period">
                  <div className="aa-exh-period__field">
                    <span className="aa-exh-period__lbl">Начало</span>
                    <input className="aw-input aa-exh-period__date" type="date" value={ex.date_from} onChange={e => updateExhibition(i, 'date_from', e.target.value)} />
                  </div>
                  <span className="aa-exh-period__dash">—</span>
                  <div className="aa-exh-period__field">
                    <span className="aa-exh-period__lbl">Конец</span>
                    <input className="aw-input aa-exh-period__date" type="date" value={ex.date_to} onChange={e => updateExhibition(i, 'date_to', e.target.value)} />
                  </div>
                </div>
              </div>
              {wallsList.length > 0 && (
                <select className="aw-select aa-exh-card__wall" value={ex.wall_id} onChange={e => updateExhibition(i, 'wall_id', e.target.value)}>
                  <option value="">Стена (необязательно)</option>
                  {wallsList.map(w => (
                    <option key={w.documentId || w.id} value={w.documentId || w.id}>{w.Title}</option>
                  ))}
                </select>
              )}
            </div>
          ))}
        </div>
        <button type="button" className="aa-add-btn" onClick={addExhibition}>+ Добавить выставку</button>
      </div>
    </div>
  )

  const Step3 = () => (
    <div className="aw-step">
      <div className="aw-step__head">
        <h1 className="aw-step__title">Соцсети и контакты</h1>
        <span className="aw-step__badge">3 из 4</span>
      </div>
      <p className="aw-step__sub">Укажите, как с вами могут связаться посетители и владельцы стен.</p>

      <div className="aw-section-title">Социальные сети</div>
      <div className="aw-row2">
        <div className="aw-field">
          <label className="aw-label">Instagram</label>
          <input className="aw-input" value={form.instagram} onChange={e => set('instagram', e.target.value)} placeholder="@username" />
        </div>
        <div className="aw-field">
          <label className="aw-label">Telegram</label>
          <input className="aw-input" value={form.telegram} onChange={e => set('telegram', e.target.value)} placeholder="@username" />
        </div>
      </div>
      <div className="aw-row2">
        <div className="aw-field">
          <label className="aw-label">VK</label>
          <input className="aw-input" value={form.vk} onChange={e => set('vk', e.target.value)} placeholder="vk.com/username" />
        </div>
        <div className="aw-field">
          <label className="aw-label">Facebook</label>
          <input className="aw-input" value={form.facebook} onChange={e => set('facebook', e.target.value)} placeholder="facebook.com/username" />
        </div>
      </div>
      <div className="aw-row2">
        <div className="aw-field">
          <label className="aw-label">Веб-сайт</label>
          <input className="aw-input" value={form.website} onChange={e => set('website', e.target.value)} placeholder="example.com" />
        </div>
        <div className="aw-field">
          <label className="aw-label">Behance</label>
          <input className="aw-input" value={form.behance} onChange={e => set('behance', e.target.value)} placeholder="behance.net/username" />
        </div>
      </div>

      <div className="aw-contacts-section">
        <div className="aw-section-title">Контакты</div>
        <div className="aw-row3">
          <div className="aw-field">
            <label className="aw-label">Email</label>
            <input className="aw-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="example@mail.ru" />
          </div>
          <div className="aw-field">
            <label className="aw-label">Телефон</label>
            <input className="aw-input" type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+7 (___) ___-__-__" />
          </div>
          <div className="aw-field">
            <label className="aw-label">Предпочитаемый способ связи</label>
            <select className="aw-select" value={form.messenger_type} onChange={e => set('messenger_type', e.target.value)}>
              {MESSENGER_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>
        <div className="aw-row2">
          <div className="aw-field">
            <label className="aw-label">Мастерская / студия <span className="aw-opt">(необязательно)</span></label>
            <input className="aw-input" value={form.studio_location} onChange={e => set('studio_location', e.target.value)} placeholder="Адрес или район" />
          </div>
          <div className="aw-field">
            <label className="aw-label">Часовой пояс <span className="aw-opt">(необязательно)</span></label>
            <input className="aw-input" value={form.timezone} onChange={e => set('timezone', e.target.value)} placeholder="МСК (UTC+3)" />
          </div>
        </div>
      </div>
    </div>
  )

  const Step4 = () => (
    <div className="aw-step">
      <div className="aw-step__head">
        <h1 className="aw-step__title">Подтверждение</h1>
        <span className="aw-step__badge">4 из 4</span>
      </div>
      <p className="aw-step__sub">Добавьте обложку профиля и фотографии работ, затем опубликуйте профиль.</p>

      <div className="aw-card">
        <div className="aw-field" style={{ marginBottom: 0 }}>
          <label className="aw-label">Обложка профиля <span className="aw-opt">(необязательно)</span></label>
          <div className="aa-cover-upload" onClick={() => coverInputRef.current?.click()}>
            {form.cover
              ? <img src={form.cover.url} alt="" />
              : (
                <div className="aa-cover-upload__placeholder">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
                  <span>Загрузить обложку</span>
                </div>
              )
            }
            <input ref={coverInputRef} type="file" accept="image/*" className="aw-file-input" onChange={e => handleCover(e.target.files)} />
          </div>
        </div>
      </div>

      <div className="aw-card">
        <label className="aw-radio">
          <input type="checkbox" checked={form.agree} onChange={e => set('agree', e.target.checked)} />
          Я подтверждаю, что указанная информация верна
        </label>
        {errors.agree && <div className="aw-err">{errors.agree}</div>}
      </div>
    </div>
  )

  return (
    <MainLayout>
      <Head><title>Добавление художника | Стена с картинами</title></Head>
      <div className="aw">
        <div className="aw-layout">
          <aside className="aw-steps-sidebar">
            <div className="aw-steps-list">
              {STEPS.map(s => {
                const done = s.num < step
                const active = s.num === step
                return (
                  <div key={s.num} className={`aw-step-item${active ? ' aw-step-item--active' : ''}${done ? ' aw-step-item--done' : ''}`}>
                    <div className="aw-step-item__num">
                      {done
                        ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
                        : s.num
                      }
                    </div>
                    <div>
                      <div className="aw-step-item__label">{s.label}</div>
                      {done
                        ? <div className="aw-step-item__done">Заполнено</div>
                        : <div className="aw-step-item__sub">{s.sub}</div>
                      }
                    </div>
                  </div>
                )
              })}
            </div>
          </aside>

          <main className="aw-content">
            {step === 1 && Step1()}
            {step === 2 && Step2()}
            {step === 3 && Step3()}
            {step === 4 && Step4()}

            <div className="aw-footer">
              <div className="aw-footer__left">
                {step > 1
                  ? <button type="button" className="aw-footer__back" onClick={goBack}>← Назад</button>
                  : <div />
                }
              </div>
              <div className="aw-footer__nav">
                {step < 4 ? (
                  <button type="button" className="aw-footer__next" onClick={goNext}>Продолжить →</button>
                ) : (
                  <button type="button" className="aw-footer__finish" onClick={submit} disabled={submitting}>
                    {submitting ? 'Публикация…' : 'Опубликовать профиль →'}
                  </button>
                )}
              </div>
            </div>
          </main>

          {Sidebar()}
        </div>
      </div>
    </MainLayout>
  )
}

export async function getServerSideProps(context) {
  const session = await getSession(context.req, context.res)
  if (!session?.jwt) {
    return { redirect: { destination: '/auth/signin?callbackUrl=/add-artist', permanent: false } }
  }
  return { props: {} }
}
