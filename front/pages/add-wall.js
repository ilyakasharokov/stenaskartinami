import { useState, useRef, useCallback, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import MainLayout from '@/components/layouts/MainLayout'
import AddressInput from '@/components/ui/AddressInput'
import { getSession } from '@/lib/getSession'
import { useToast } from '@/components/ui/Toast'

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

const I = {
  nail:    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v14M8 6l4-4 4 4"/><path d="M10 20h4M12 16v4"/></svg>,
  rail:    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M3 12h18"/><circle cx="8" cy="18" r="2"/><circle cx="16" cy="18" r="2"/></svg>,
  shelf:   <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="4" rx="1"/><path d="M4 7v14M20 7v14M4 14h16"/></svg>,
  tape:    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="8" width="18" height="8" rx="2"/><path d="M7 8V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2"/></svg>,
  chat:    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  sun:     <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>,
  bulb:    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21h6M12 3a6 6 0 0 1 6 6c0 2.22-1.21 4.16-3 5.2V17a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-2.8A6 6 0 0 1 6 9a6 6 0 0 1 6-6z"/></svg>,
  spot:    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v1M12 8a4 4 0 0 1 0 8M18.36 5.64l-.7.7M15 12h1M6.34 6.34l-.7-.7M9 12H8M12 20v1M5.64 18.36l.7-.7M18.36 18.36l-.7-.7"/><circle cx="12" cy="12" r="3"/></svg>,
  moon:    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
  palette: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r="1"/><circle cx="17.5" cy="10.5" r="1"/><circle cx="8.5" cy="7.5" r="1"/><circle cx="6.5" cy="12.5" r="1"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c1.1 0 2-.9 2-2v-.5c0-.28-.22-.5-.5-.5H13c-.55 0-1-.45-1-1 0-.28.11-.53.29-.71L14 16c.55-.55.55-1.45 0-2S12.45 13.45 12 14l-.71.71C11.11 14.97 11 15.22 11 15.5c0 .55-.45 1-1 1H9c-.28 0-.5.22-.5.5V18c0 1.1.9 2 2 2"/></svg>,
  diamond: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2.7 10.3a2.41 2.41 0 0 0 0 3.41l7.59 7.59a2.41 2.41 0 0 0 3.41 0l7.59-7.59a2.41 2.41 0 0 0 0-3.41L13.7 2.71a2.41 2.41 0 0 0-3.41 0z"/></svg>,
  person:  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  camera:  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>,
  shield:  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  box:     <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.27 6.96 12 12.01l8.73-5.05M12 22.08V12"/></svg>,
  wifi:    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1" fill="currentColor"/></svg>,
  parking: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 17V7h4a3 3 0 0 1 0 6H9"/></svg>,
  access:  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="2"/><path d="M12 7v6l3 3M9 13l-3 5M15 13l3 5M9 9h6"/></svg>,
  paw:     <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/><path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z"/></svg>,
}

const MOUNTING_TYPES = [
  { value: 'gvozdi',      label: 'Гвозди / саморезы',    icon: I.nail },
  { value: 'railing',     label: 'Рейлинговая система',  icon: I.rail },
  { value: 'shelves',     label: 'Полки',                icon: I.shelf },
  { value: 'no_drilling', label: 'Без сверления',        icon: I.tape },
  { value: 'discussed',   label: 'Обсуждается',          icon: I.chat },
]

const LIGHTING_TYPES = [
  { value: 'daylight',   label: 'Много дневного света',    icon: I.sun },
  { value: 'artificial', label: 'Искусственный свет',      icon: I.bulb },
  { value: 'spots',      label: 'Споты / направленный свет', icon: I.spot },
  { value: 'dark',       label: 'Тёмное помещение',        icon: I.moon },
]

const WALL_COLORS = [
  { value: 'light',    label: 'Светлые стены',               icon: I.sun },
  { value: 'dark',     label: 'Тёмные стены',                icon: null },
  { value: 'concrete', label: 'Бетон / серые тона',          icon: I.diamond },
  { value: 'brick',    label: 'Кирпич',                      icon: null },
  { value: 'wood',     label: 'Дерево / натуральные материалы', icon: null },
  { value: 'bright',   label: 'Яркие цвета / акценты',       icon: I.palette },
  { value: 'other',    label: 'Другое',                       icon: I.diamond },
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
  { value: 'supervised', label: 'Под присмотром персонала',    icon: I.person },
  { value: 'cameras',    label: 'Есть камеры видеонаблюдения', icon: I.camera },
  { value: 'risk',       label: 'На свой риск',                icon: I.shield },
  { value: 'other',      label: 'Другое',                      icon: I.box },
]

const AMENITIES = [
  { value: 'wifi',       label: 'Wi-Fi',                   icon: I.wifi },
  { value: 'parking',    label: 'Парковка',                icon: I.parking },
  { value: 'accessible', label: 'Доступно для людей с ОВЗ', icon: I.access },
  { value: 'pets',       label: 'Можно с животными',       icon: I.paw },
  { value: 'other',      label: 'Другое',                  icon: I.box },
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
  const showToast = useToast()
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
      showToast('Ошибка при сохранении: ' + err.message, 'error')
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
          <img src="/images/add-wall-hint.png" alt="" className="aw-sidebar__img" />
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
            <div className="aw-toggles aw-toggles">
              {MOUNTING_TYPES.map(m => (
                <Toggle key={m.value} label={m.label} icon={m.icon}
                  active={form.mounting_type.includes(m.value)}
                  onClick={() => set('mounting_type', multiToggle(form.mounting_type, m.value))} />
              ))}
            </div>
            {errors.mounting_type && <div className="aw-err">{errors.mounting_type}</div>}
          </div>

          <div className="aw-field">
            <label className="aw-label">Освещение <span className="aw-req">*</span></label>
            <div className="aw-toggles aw-toggles">
              {LIGHTING_TYPES.map(l => (
                <Toggle key={l.value} label={l.label} icon={l.icon}
                  active={form.lighting.includes(l.value)}
                  onClick={() => set('lighting', multiToggle(form.lighting, l.value))} />
              ))}
            </div>
            {errors.lighting && <div className="aw-err">{errors.lighting}</div>}
          </div>

          <div className="aw-field">
            <label className="aw-label">Цвет стен / интерьер <span className="aw-req">*</span></label>
            <div className="aw-toggles aw-toggles">
              {WALL_COLORS.map(c => (
                <Toggle key={c.value} label={c.label} icon={c.icon}
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
            <div className="aw-toggles aw-toggles">
              {SAFETY.map(s => (
                <Toggle key={s.value} label={s.label} icon={s.icon}
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
                <Toggle key={a.value} label={a.label} icon={a.icon}
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
                {step > 1 ? (
                  <button type="button" className="aw-footer__back" onClick={goBack}>
                    ← Назад
                  </button>
                ) : <div />}
              </div>
              <div className="aw-footer__nav">
                {step < 3 ? (
                  <button type="button" className="aw-footer__next" onClick={goNext}>
                    Продолжить →
                  </button>
                ) : (
                  <div className="aw-footer__finish-wrap">
                    <button type="button" className="aw-footer__skip" onClick={() => submit(false)} disabled={submitting}>
                      Пропустить этот шаг →
                      <span>Можно будет редактировать позже</span>
                    </button>
                    <button type="button" className="aw-footer__finish" onClick={() => submit(true)} disabled={submitting}>
                      {submitting ? 'Сохранение…' : 'Завершить и перейти к публикации →'}
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
