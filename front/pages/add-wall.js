import { useState, useRef, useCallback, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import MainLayout from '@/components/layouts/MainLayout'
import AddressInput from '@/components/ui/AddressInput'
import { getSession } from '@/lib/getSession'

const WALL_TYPE_ICONS = {
  cafe: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 8h1a4 4 0 0 1 0 8h-1"/>
      <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z"/>
      <path d="M6 2v2M10 2v2M14 2v2"/>
    </svg>
  ),
  gallery: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <path d="M21 15l-5-5L5 21"/>
    </svg>
  ),
  restaurant: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/>
      <path d="M7 2v20"/>
      <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/>
    </svg>
  ),
  bar: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 11l1-8H6l1 8"/>
      <path d="M6.5 11a6 6 0 0 0 5 5.9V20H9v2h6v-2h-2.5v-3.1A6 6 0 0 0 17.5 11"/>
    </svg>
  ),
  office: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2"/>
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
      <line x1="12" y1="12" x2="12" y2="12.01"/>
      <path d="M2 12h20"/>
    </svg>
  ),
  shop: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <path d="M16 10a4 4 0 0 1-8 0"/>
    </svg>
  ),
  other: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M8 12h.01M12 12h.01M16 12h.01"/>
    </svg>
  ),
}

const WALL_TYPES = [
  { value: 'cafe',       label: 'Кафе' },
  { value: 'gallery',    label: 'Галерея' },
  { value: 'restaurant', label: 'Ресторан' },
  { value: 'bar',        label: 'Бар' },
  { value: 'office',     label: 'Офис' },
  { value: 'shop',       label: 'Магазин' },
  { value: 'other',      label: 'Другое' },
]

const MOUNTING_TYPES = [
  { value: 'gvozdi',       label: 'Гвозди / саморезы' },
  { value: 'railing',      label: 'Рейлинговая система' },
  { value: 'shelves',      label: 'Полки' },
  { value: 'no_drilling',  label: 'Без сверления' },
  { value: 'discussed',    label: 'Обсуждается' },
]

const LIGHTING_TYPES = [
  { value: 'daylight',    label: 'Много дневного света' },
  { value: 'artificial',  label: 'Искусственный свет' },
  { value: 'spots',       label: 'Споты / направленный свет' },
  { value: 'dark',        label: 'Тёмное помещение' },
]

const WALL_COLORS = [
  { value: 'light',    label: 'Светлые стены' },
  { value: 'dark',     label: 'Тёмные стены' },
  { value: 'concrete', label: 'Бетон / серые тона' },
  { value: 'brick',    label: 'Кирпич' },
  { value: 'wood',     label: 'Дерево / натуральные материалы' },
  { value: 'bright',   label: 'Яркие цвета / акценты' },
  { value: 'other',    label: 'Другое' },
]

const SPOTS_COUNT = [
  { value: 'big',  label: 'Большое место' },
  { value: '2-3',  label: '2–3 средних места' },
  { value: '4-6',  label: '4–6 небольших работ' },
  { value: '6+',   label: 'Больше 6 работ' },
]

const PLACEMENT_TERMS = ['Комиссия с продажи', 'Аренда', 'Бесплатно', 'Другое']
const DURATIONS = ['1 месяц', '2 месяца', '3 месяца', '6 месяцев', '1 год', 'По договорённости']

const SAFETY = [
  { value: 'supervised', label: 'Под присмотром персонала' },
  { value: 'cameras',    label: 'Есть камеры видеонаблюдения' },
  { value: 'risk',       label: 'На свой риск' },
  { value: 'other',      label: 'Другое' },
]

const AMENITIES = [
  { value: 'wifi',       label: 'Wi-Fi' },
  { value: 'parking',    label: 'Парковка' },
  { value: 'accessible', label: 'Доступно для людей с ОВЗ' },
  { value: 'pets',       label: 'Можно с животными' },
  { value: 'other',      label: 'Другое' },
]

const STEPS = [
  { num: 1, label: 'Данные о стене и адрес',      sub: 'Расскажите о месте и укажите адрес' },
  { num: 2, label: 'Фотографии',                   sub: 'Добавьте фото интерьера и пространства' },
  { num: 3, label: 'Информация для подбора картин', sub: 'Размеры, освещение и другие важные детали' },
]

const STORAGE_KEY = 'add-wall-draft'

const initState = () => {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        return { ...parsed, photos: [] }
      }
    } catch {}
  }
  return {
    title: '', wall_type: '', description: '',
    country: 'Россия', city_name: 'Москва', address: '', coords: null,
    additional_landmarks: '', contact_person: '', phone: '', email: '',
    photos: [], photoIds: [],
    zone_width: '300', zone_height: '180',
    spots_count: '4-6', spots_comment: '',
    mounting_type: [], lighting: [], wall_color: [],
    placement_terms: 'Комиссия с продажи', placement_duration: '3 месяца',
    renewability: 'yes', safety: [], additional_info: '',
    amenities: [], styles_themes: [],
  }
}

function Toggle({ label, icon, active, onClick }) {
  return (
    <button
      type="button"
      className={`aw-toggle${active ? ' aw-toggle--active' : ''}`}
      onClick={onClick}
    >
      {icon && <span className="aw-toggle__icon">{icon}</span>}
      <span>{label}</span>
    </button>
  )
}

function multiToggle(arr, val) {
  return arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val]
}

function ZonePreview({ width, height }) {
  const w = Math.max(Number(width) || 300, 1)
  const h = Math.max(Number(height) || 180, 1)
  const maxW = 160, maxH = 110
  const scale = Math.min(maxW / w, maxH / h)
  const sw = Math.round(w * scale)
  const sh = Math.round(h * scale)
  return (
    <div className="aw-zone-preview">
      <svg width={maxW + 40} height={maxH + 30} viewBox={`0 0 ${maxW + 40} ${maxH + 30}`}>
        <line x1="20" y1={maxH + 20} x2={20 + maxW} y2={maxH + 20} stroke="#ccc" strokeWidth="1" />
        <text x={20 + maxW / 2} y={maxH + 28} textAnchor="middle" fontSize="10" fill="#888">{w} см</text>
        <line x1={maxW + 25} y1="10" x2={maxW + 25} y2={10 + maxH} stroke="#ccc" strokeWidth="1" />
        <text x={maxW + 35} y={10 + maxH / 2} textAnchor="middle" fontSize="10" fill="#888" transform={`rotate(90, ${maxW + 35}, ${10 + maxH / 2})`}>{h} см</text>
        <rect
          x={20 + (maxW - sw) / 2}
          y={10 + (maxH - sh) / 2}
          width={sw} height={sh}
          fill="rgba(220,58,15,0.08)"
          stroke="#dc3a0f"
          strokeWidth="1.5"
          strokeDasharray="5,3"
          rx="2"
        />
      </svg>
    </div>
  )
}

export default function AddWall() {
  const router = useRouter()
  const { data: session } = useSession()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(initState)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [uploadingPhotos, setUploadingPhotos] = useState(false)
  const fileInputRef = useRef(null)

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }))

  useEffect(() => {
    try {
      const { photos, photoIds, ...rest } = form
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rest))
    } catch {}
  }, [form])

  const handleFiles = useCallback(async (files) => {
    const allowed = [...files].filter(f => f.type.startsWith('image/'))
    if (!allowed.length) return
    const remaining = 10 - form.photos.length
    const toAdd = allowed.slice(0, remaining)
    const previews = toAdd.map(f => ({ file: f, url: URL.createObjectURL(f) }))
    setForm(f => ({ ...f, photos: [...f.photos, ...previews] }))
  }, [form.photos.length])

  const removePhoto = (idx) => {
    setForm(f => ({ ...f, photos: f.photos.filter((_, i) => i !== idx) }))
  }

  const validateStep = (s) => {
    const e = {}
    if (s === 1) {
      if (!form.title.trim())          e.title = 'Укажите название'
      if (!form.wall_type)             e.wall_type = 'Выберите тип стены'
      if (!form.description.trim())    e.description = 'Добавьте описание'
      if (!form.address.trim())        e.address = 'Укажите адрес'
      if (!form.contact_person.trim()) e.contact_person = 'Укажите контактное лицо'
      if (!form.phone.trim())          e.phone = 'Укажите телефон'
    }
    if (s === 3) {
      if (!form.spots_count)           e.spots_count = 'Выберите количество мест'
      if (!form.mounting_type.length)  e.mounting_type = 'Выберите тип крепления'
      if (!form.lighting.length)       e.lighting = 'Выберите освещение'
      if (!form.wall_color.length)     e.wall_color = 'Выберите цвет стен'
      if (!form.safety.length)         e.safety = 'Выберите ответственность'
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

  const submit = async (publish = false) => {
    if (!session?.jwt) {
      router.push('/auth/signin')
      return
    }
    const e1 = validateStep(1)
    if (Object.keys(e1).length) { setErrors(e1); setStep(1); return }
    if (publish) {
      const e3 = validateStep(3)
      if (Object.keys(e3).length) { setErrors(e3); return }
    }
    setSubmitting(true)
    try {
      const jwt = session.jwt
      let imageIds = []
      if (form.photos.length) {
        setUploadingPhotos(true)
        imageIds = await Promise.all(form.photos.map(async (p) => {
          const fd = new FormData()
          fd.append('files', p.file)
          const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/upload`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${jwt}` },
            body: fd,
          })
          const arr = await r.json()
          return arr[0]?.id
        }))
        setUploadingPhotos(false)
      }

      const slug = form.title.toLowerCase()
        .replace(/[^a-zа-яё0-9\s]/gi, '')
        .trim().replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 80)

      const body = {
        data: {
          ...(publish ? { status: 'published' } : {}),
          Title: form.title,
          Description: form.description,
          slug,
          Address: form.address,
          Coordinates: form.coords ? { center: form.coords } : null,
          Phone: form.phone,
          Images: imageIds.filter(Boolean),
          wall_type: form.wall_type,
          contact_person: form.contact_person,
          email: form.email || null,
          city_name: form.city_name,
          additional_landmarks: form.additional_landmarks || null,
          zone_width: Number(form.zone_width) || null,
          zone_height: Number(form.zone_height) || null,
          spots_count: form.spots_count || null,
          spots_comment: form.spots_comment || null,
          mounting_type: form.mounting_type,
          lighting: form.lighting,
          wall_color: form.wall_color,
          placement_terms: form.placement_terms,
          placement_duration: form.placement_duration,
          renewability: form.renewability,
          safety: form.safety,
          additional_info: form.additional_info || null,
          amenities: form.amenities,
          styles_themes: form.styles_themes,
        },
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/walls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
        body: JSON.stringify(body),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      localStorage.removeItem(STORAGE_KEY)
      router.push('/account/profile?tab=walls')
    } catch (err) {
      alert('Ошибка при сохранении: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const Sidebar = () => {
    const items = step === 1
      ? ['Художники поймут, подходит ли им ваше место для размещения работ', 'Посетители смогут найти и посетить вашу стену', 'Система будет рекомендовать подходящие картины для вашей стены']
      : step === 2
      ? ['Художники смогут лучше понять атмосферу и стиль пространства', 'Мы сможем рекомендовать более подходящие картины', 'Посетители увидят, как выглядит место']
      : ['Художники понимают, подойдут ли их работы для вашего пространства', 'Система будет рекомендовать подходящие картины', 'Посетители увидят работы, которые смотрятся гармонично']

    const title = step === 1 ? 'Зачем нужна эта информация?' : step === 2 ? 'Почему важны фотографии?' : 'Как это помогает?'

    return (
      <div className="aw-sidebar">
        <div className="aw-sidebar__img-wrap">
          <img src="/images/photo-tips-example-2.jpg" alt="" className="aw-sidebar__img" />
        </div>
        <div className="aw-sidebar__why">
          <div className="aw-sidebar__why-title">{title}</div>
          <ul className="aw-sidebar__check-list">
            {items.map((item, i) => (
              <li key={i}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="8" fill="#e8f5e9"/>
                  <path d="M4.5 8l2.5 2.5 4.5-4.5" stroke="#2e7d32" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </div>
        {step === 3 && form.spots_count && (
          <div className="aw-sidebar__summary-card">
            <div className="aw-sidebar__why-title">Параметры зоны</div>
            <div className="aw-summary-row"><span>Размер:</span><span>{form.zone_width} × {form.zone_height} см</span></div>
            {form.lighting[0] && <div className="aw-summary-row"><span>Освещение:</span><span>{LIGHTING_TYPES.find(l => l.value === form.lighting[0])?.label}</span></div>}
            {form.wall_color[0] && <div className="aw-summary-row"><span>Стены:</span><span>{WALL_COLORS.find(c => c.value === form.wall_color[0])?.label}</span></div>}
          </div>
        )}
      </div>
    )
  }

  const Step1 = () => (
    <div className="aw-step">
      <div className="aw-step__head">
        <h1 className="aw-step__title">Основная информация</h1>
        <span className="aw-step__badge">1 из 3</span>
      </div>
      <p className="aw-step__sub">Расскажите, что это за место и где оно находится.</p>

      <div className="aw-s1-grid">
        {/* Left: name + type + description */}
        <div className="aw-s1-left">
          <div className="aw-field">
            <label className="aw-label">Название стены <span className="aw-req">*</span></label>
            <input className={`aw-input${errors.title ? ' aw-input--err' : ''}`} value={form.title}
              maxLength={100}
              onChange={e => set('title', e.target.value)} placeholder="Например: Кафе «Свет»" />
            <div className="aw-counter aw-counter--right">{form.title.length} / 100</div>
            {errors.title && <div className="aw-err">{errors.title}</div>}
          </div>

          <div className="aw-field">
            <label className="aw-label">Тип пространства <span className="aw-req">*</span></label>
            <div className="aw-types-grid">
              {WALL_TYPES.map(t => (
                <Toggle key={t.value} label={t.label} icon={WALL_TYPE_ICONS[t.value]}
                  active={form.wall_type === t.value}
                  onClick={() => set('wall_type', t.value)} />
              ))}
            </div>
            {errors.wall_type && <div className="aw-err">{errors.wall_type}</div>}
          </div>

          <div className="aw-field">
            <label className="aw-label">Краткое описание <span className="aw-req">*</span></label>
            <textarea className={`aw-textarea${errors.description ? ' aw-textarea--err' : ''}`}
              value={form.description} maxLength={500}
              onChange={e => set('description', e.target.value)}
              placeholder="Опишите атмосферу места, концепцию, аудиторию и особенности пространства…"
              rows={5} />
            <div className="aw-counter aw-counter--right">{form.description.length} / 500</div>
            {errors.description && <div className="aw-err">{errors.description}</div>}
          </div>
        </div>

        {/* Right: address + map + landmarks */}
        <div className="aw-s1-right">
          <div className="aw-field">
            <label className="aw-label">Адрес <span className="aw-req">*</span></label>
            <AddressInput
              value={form.address}
              onChange={v => set('address', v)}
              onSelect={(addr, coords) => setForm(f => ({ ...f, address: addr, coords }))}
              placeholder="Москва, ул. Петровка, 20, стр. 1"
              error={errors.address}
              showMap={true}
            />
            {errors.address && <div className="aw-err">{errors.address}</div>}
          </div>

          <div className="aw-field">
            <label className="aw-label">Особенности входа <span className="aw-opt">(необязательно)</span></label>
            <textarea className="aw-textarea aw-textarea--sm" value={form.additional_landmarks}
              onChange={e => set('additional_landmarks', e.target.value)}
              placeholder="Например: вход со стороны двора, 2 этаж, домофон 42" rows={2} />
          </div>
        </div>
      </div>

      {/* Contacts — always open */}
      <div className="aw-contacts-section">
        <div className="aw-section-title">Контакты</div>
        <div className="aw-row3">
          <div className="aw-field">
            <label className="aw-label">Контактное лицо <span className="aw-req">*</span></label>
            <input className={`aw-input${errors.contact_person ? ' aw-input--err' : ''}`}
              value={form.contact_person} onChange={e => set('contact_person', e.target.value)}
              placeholder="Имя или должность" />
            {errors.contact_person && <div className="aw-err">{errors.contact_person}</div>}
          </div>
          <div className="aw-field">
            <label className="aw-label">Телефон <span className="aw-req">*</span></label>
            <input className={`aw-input${errors.phone ? ' aw-input--err' : ''}`}
              value={form.phone} onChange={e => set('phone', e.target.value)}
              placeholder="+7 (___) ___-__-__" type="tel" />
            {errors.phone && <div className="aw-err">{errors.phone}</div>}
          </div>
          <div className="aw-field">
            <label className="aw-label">Email <span className="aw-opt">(необязательно)</span></label>
            <input className="aw-input" value={form.email} onChange={e => set('email', e.target.value)}
              placeholder="example@mail.ru" type="email" />
          </div>
        </div>
      </div>
    </div>
  )

  const Step2 = () => (
    <div className="aw-step">
      <div className="aw-step__head">
        <h1 className="aw-step__title">Фотографии пространства</h1>
        <span className="aw-step__badge">2 из 3</span>
      </div>
      <p className="aw-step__sub">Добавьте фотографии интерьера и зоны, где будут размещаться картины. Рекомендуем загрузить минимум 3–5 фото.</p>

      <div className="aw-card">
        <div
          className={`aw-dropzone${dragOver ? ' aw-dropzone--over' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M12 8v8M8 12h8" />
          </svg>
          <div className="aw-dropzone__title">Загрузить фотографии</div>
          <div className="aw-dropzone__sub">Перетащите файлы сюда или выберите на компьютере</div>
          <div className="aw-dropzone__hint">JPG, PNG — до 10 МБ на файл</div>
          <input ref={fileInputRef} type="file" multiple accept="image/*" className="aw-file-input"
            onChange={e => handleFiles(e.target.files)} />
        </div>

        <div className="aw-photos-head">Загруженные фото ({form.photos.length} из 10)</div>
        <div className="aw-photos-grid">
          {form.photos.map((p, i) => (
            <div key={i} className="aw-photo-thumb">
              <img src={p.url} alt="" />
              <button type="button" className="aw-photo-thumb__remove" onClick={() => removePhoto(i)}>×</button>
            </div>
          ))}
          {Array.from({ length: Math.max(0, Math.min(6 - form.photos.length, 6)) }).map((_, i) => (
            <div key={`ph-${i}`} className="aw-photo-thumb aw-photo-thumb--empty">
              {i === Math.max(0, 6 - form.photos.length) - 1 && form.photos.length < 10
                ? <button type="button" className="aw-photo-thumb__add" onClick={() => fileInputRef.current?.click()}>+</button>
                : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
              }
            </div>
          ))}
        </div>

        <div className="aw-what-to-shoot">
          <div className="aw-what-to-shoot__icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
            </svg>
          </div>
          <div>
            <div className="aw-what-to-shoot__title">Что снять?</div>
            <ul className="aw-what-to-shoot__list">
              <li>Общий вид пространства</li>
              <li>Зону, где планируется размещение картин</li>
              <li>Освещение и источник света</li>
              <li>Интерьер, детали, которые важны для атмосферы</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )

  const Step3 = () => (
    <div className="aw-step">
      <div className="aw-step__head">
        <h1 className="aw-step__title">Информация для подбора картин</h1>
        <span className="aw-step__badge">3 из 3</span>
      </div>
      <p className="aw-step__sub">Укажите параметры пространства, чтобы художники могли подобрать подходящие работы.</p>

      <div className="aw-card">
        <div className="aw-row2">
          <div className="aw-field">
            <label className="aw-label">Размер доступной зоны для картин <span className="aw-req">*</span></label>
            <div className="aw-zone-inputs">
              <div className="aw-zone-input-wrap">
                <label className="aw-zone-label">Ширина (см)</label>
                <input className="aw-input" type="number" value={form.zone_width} min="1" max="2000"
                  onChange={e => set('zone_width', e.target.value)} />
              </div>
              <div className="aw-zone-input-wrap">
                <label className="aw-zone-label">Высота (см)</label>
                <input className="aw-input" type="number" value={form.zone_height} min="1" max="1000"
                  onChange={e => set('zone_height', e.target.value)} />
              </div>
              <ZonePreview width={form.zone_width} height={form.zone_height} />
            </div>
          </div>

          <div className="aw-field">
            <label className="aw-label">Количество мест для картин <span className="aw-req">*</span></label>
            <div className="aw-toggles aw-toggles--wrap">
              {SPOTS_COUNT.map(s => (
                <Toggle key={s.value} label={s.label} active={form.spots_count === s.value}
                  onClick={() => set('spots_count', s.value)} />
              ))}
            </div>
            {errors.spots_count && <div className="aw-err">{errors.spots_count}</div>}
            <div className="aw-field" style={{ marginTop: 12 }}>
              <label className="aw-label aw-label--sm">Комментарий <span className="aw-opt">(необязательно)</span></label>
              <input className="aw-input" value={form.spots_comment}
                onChange={e => set('spots_comment', e.target.value)}
                placeholder="Например: можно менять экспозицию" />
            </div>
          </div>
        </div>

        <div className="aw-row3">
          <div className="aw-field">
            <label className="aw-label">Тип крепления <span className="aw-req">*</span></label>
            <div className="aw-toggles aw-toggles--col">
              {MOUNTING_TYPES.map(m => (
                <Toggle key={m.value} label={m.label}
                  active={form.mounting_type.includes(m.value)}
                  onClick={() => set('mounting_type', multiToggle(form.mounting_type, m.value))} />
              ))}
            </div>
            {errors.mounting_type && <div className="aw-err">{errors.mounting_type}</div>}
          </div>

          <div className="aw-field">
            <label className="aw-label">Освещение <span className="aw-req">*</span></label>
            <div className="aw-toggles aw-toggles--col">
              {LIGHTING_TYPES.map(l => (
                <Toggle key={l.value} label={l.label}
                  active={form.lighting.includes(l.value)}
                  onClick={() => set('lighting', multiToggle(form.lighting, l.value))} />
              ))}
            </div>
            {errors.lighting && <div className="aw-err">{errors.lighting}</div>}
          </div>

          <div className="aw-field">
            <label className="aw-label">Цвет стен / интерьер <span className="aw-req">*</span></label>
            <div className="aw-toggles aw-toggles--col">
              {WALL_COLORS.map(c => (
                <Toggle key={c.value} label={c.label}
                  active={form.wall_color.includes(c.value)}
                  onClick={() => set('wall_color', multiToggle(form.wall_color, c.value))} />
              ))}
            </div>
            {errors.wall_color && <div className="aw-err">{errors.wall_color}</div>}
          </div>
        </div>

        <div className="aw-row3">
          <div className="aw-field">
            <label className="aw-label">Условия размещения работ <span className="aw-req">*</span></label>
            <select className="aw-select" value={form.placement_terms}
              onChange={e => set('placement_terms', e.target.value)}>
              {PLACEMENT_TERMS.map(t => <option key={t}>{t}</option>)}
            </select>
            <div className="aw-field" style={{ marginTop: 12 }}>
              <label className="aw-label aw-label--sm">Дополнительно</label>
              <textarea className="aw-textarea aw-textarea--sm" value={form.additional_info}
                maxLength={300} rows={3}
                onChange={e => set('additional_info', e.target.value)}
                placeholder="Опишите условия подробнее (необязательно)" />
              <div className="aw-counter">{form.additional_info.length} / 300</div>
            </div>
          </div>

          <div className="aw-field">
            <label className="aw-label">Срок размещения <span className="aw-req">*</span></label>
            <select className="aw-select" value={form.placement_duration}
              onChange={e => set('placement_duration', e.target.value)}>
              {DURATIONS.map(d => <option key={d}>{d}</option>)}
            </select>
            <div className="aw-field" style={{ marginTop: 12 }}>
              <label className="aw-label aw-label--sm">Возможность продления</label>
              <div className="aw-radios">
                {[['yes', 'Да'], ['no', 'Нет'], ['negotiable', 'По договорённости']].map(([v, l]) => (
                  <label key={v} className="aw-radio">
                    <input type="radio" name="renewability" value={v}
                      checked={form.renewability === v} onChange={() => set('renewability', v)} />
                    {l}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="aw-field">
            <label className="aw-label">Ответственность за сохранность <span className="aw-req">*</span></label>
            <div className="aw-toggles aw-toggles--col">
              {SAFETY.map(s => (
                <Toggle key={s.value} label={s.label}
                  active={form.safety.includes(s.value)}
                  onClick={() => set('safety', multiToggle(form.safety, s.value))} />
              ))}
            </div>
            {errors.safety && <div className="aw-err">{errors.safety}</div>}
          </div>
        </div>

        <div className="aw-row2">
          <div className="aw-field">
            <label className="aw-label">Дополнительные удобства <span className="aw-opt">(необязательно)</span></label>
            <div className="aw-toggles aw-toggles--wrap">
              {AMENITIES.map(a => (
                <Toggle key={a.value} label={a.label}
                  active={form.amenities.includes(a.value)}
                  onClick={() => set('amenities', multiToggle(form.amenities, a.value))} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const LeftHint = () => {
    if (step === 1) return (
      <div className="aw-steps__hint">
        <div className="aw-steps__hint-icon">💡</div>
        <div>
          <div className="aw-steps__hint-title">Обязательные поля отмечены звёздочкой *</div>
          <div className="aw-steps__hint-text">Остальное можно будет добавить позже</div>
        </div>
      </div>
    )
    if (step === 2) return (
      <div className="aw-steps__hint">
        <div className="aw-steps__hint-icon">💡</div>
        <div>
          <div className="aw-steps__hint-title">Совет</div>
          <div className="aw-steps__hint-text">Хорошие фотографии помогут художникам лучше понять пространство и предложить подходящие работы.</div>
        </div>
      </div>
    )
    return (
      <>
        <div className="aw-steps__hint">
          <div className="aw-steps__hint-icon">💡</div>
          <div>
            <div className="aw-steps__hint-title">Почему это важно?</div>
            <div className="aw-steps__hint-text">Эта информация помогает художникам понять, подойдут ли их работы. Чем больше деталей — тем точнее подбор картин.</div>
          </div>
        </div>
        <div className="aw-steps__skip-hint">
          <div className="aw-steps__skip-title">Не хотите заполнять сейчас?</div>
          <div className="aw-steps__skip-text">Вы сможете добавить или изменить эту информацию позже в настройках стены.</div>
          <button type="button" className="aw-steps__skip-btn" onClick={() => submit(false)}>
            Пропустить этот шаг →
          </button>
        </div>
      </>
    )
  }

  return (
    <MainLayout>
      <Head><title>Добавление стены | Стена с картинами</title></Head>
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
                        ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
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
            {LeftHint()}
          </aside>

          <main className="aw-content">
            {step === 1 && Step1()}
            {step === 2 && Step2()}
            {step === 3 && Step3()}

            <div className="aw-footer">
              <div className="aw-footer__left">
                <button type="button" className="aw-footer__cancel" onClick={() => router.push('/')}>
                  Отмена
                </button>
                <button type="button" className="aw-footer__draft" onClick={() => submit(false)} disabled={submitting}>
                  Сохранить черновик
                </button>
              </div>
              <div className="aw-footer__nav">
                {step > 1 && (
                  <button type="button" className="aw-footer__back" onClick={goBack}>
                    ← Назад
                  </button>
                )}
                {step < 3 ? (
                  <button type="button" className="aw-footer__next btn" onClick={goNext}>
                    Продолжить →
                  </button>
                ) : (
                  <div className="aw-footer__finish-wrap">
                    <button type="button" className="aw-footer__skip" onClick={() => submit(false)} disabled={submitting}>
                      Пропустить этот шаг →<br />
                      <span>Можно будет добавить позже</span>
                    </button>
                    <button type="button" className="aw-footer__finish btn" onClick={() => submit(true)} disabled={submitting}>
                      {submitting ? 'Сохранение…' : 'Завершить и опубликовать →'}
                    </button>
                  </div>
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
    return { redirect: { destination: '/auth/signin?callbackUrl=/add-wall', permanent: false } }
  }
  return { props: {} }
}
