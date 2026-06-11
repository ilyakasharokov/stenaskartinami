import MainLayout from "@/components/layouts/MainLayout"
import { API_HOST } from "@/constants/constants"
import Head from 'next/head'
import { useState, useCallback, useMemo, useRef, useEffect, Fragment } from "react"
import ImageUploading from "react-images-uploading"
import ReactCrop from "react-image-crop"
import ArtistInput from "@/components/input/artist-input"
import YearInput from "@/components/input/year-input"
import Preloader from "@/components/preloader/preloader"
import MultiSelectInput from "@/components/input/multi-select-input"
import { normalizeStrapiResponse, fetchStrapi } from "@/utils/strapi"
import { getSession } from "@/lib/getSession"
import InteriorPhotoBlock from "@/components/input/interior-photo-block"

const MIN_WIDTH = 800
const MIN_HEIGHT = 600
const DESC_MAX = 2000

function getImageDimensions(dataUrl) {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => resolve(null)
    img.src = dataUrl
  })
}

function rotateDataUrl(dataUrl) {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.height
      canvas.height = img.width
      const ctx = canvas.getContext('2d')
      ctx.translate(canvas.width / 2, canvas.height / 2)
      ctx.rotate(Math.PI / 2)
      ctx.drawImage(img, -img.width / 2, -img.height / 2)
      resolve(canvas.toDataURL('image/jpeg', 0.92))
    }
    img.src = dataUrl
  })
}

function applyCrop(imgEl, completedCrop) {
  const scaleX = imgEl.naturalWidth / imgEl.width
  const scaleY = imgEl.naturalHeight / imgEl.height
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(completedCrop.width * scaleX)
  canvas.height = Math.round(completedCrop.height * scaleY)
  canvas.getContext('2d').drawImage(
    imgEl,
    completedCrop.x * scaleX, completedCrop.y * scaleY,
    completedCrop.width * scaleX, completedCrop.height * scaleY,
    0, 0, canvas.width, canvas.height
  )
  return canvas.toDataURL('image/jpeg', 0.92)
}

function formatRub(n) {
  return n.toLocaleString('ru-RU') + ' ₽'
}

function usePriceSuggestion(width, height, materials) {
  return useMemo(() => {
    const w = parseFloat(width)
    const h = parseFloat(height)
    if (!w || !h || w <= 0 || h <= 0) return null
    const area = w * h
    const hasOil = /масл/i.test(materials)
    const hasAcrylic = /акрил/i.test(materials)
    const rateMin = hasOil ? 3.5 : hasAcrylic ? 2.5 : 2
    const rateMax = hasOil ? 6 : hasAcrylic ? 4.5 : 3.5
    const min = Math.max(1000, Math.round(area * rateMin / 1000) * 1000)
    const max = Math.round(area * rateMax / 1000) * 1000
    if (min >= max) return null
    return { min, max }
  }, [width, height, materials])
}

// ── Icons ──────────────────────────────────────────────────

const CloudUploadIcon = () => (
  <svg className="upload-zone__icon-svg" width="52" height="42" viewBox="0 0 52 42" fill="none" aria-hidden="true">
    <path d="M37 28h3.5a10.5 10.5 0 000-21 10.3 10.3 0 00-10-8c-5.2 0-9.6 3.8-10.3 8.8A8 8 0 006.5 16a8 8 0 008 8H17" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M35 19.5L26 10.5 17 19.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="26" y1="10.5" x2="26" y2="38" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
)

const InfoIcon = () => (
  <svg className="upload-info-bar__icon" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
    <line x1="8" y1="7" x2="8" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="8" cy="5" r="0.8" fill="currentColor"/>
  </svg>
)

const BookmarkIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path d="M3 1.5h8a.5.5 0 01.5.5v9.5l-4.5-2.7L2.5 11.5V2a.5.5 0 01.5-.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
  </svg>
)

const PictureIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <rect x="1" y="1" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M1 9.5l3-3 2.5 2.5 2-2 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="4.5" cy="4.5" r="1" fill="currentColor"/>
  </svg>
)

const DownloadIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path d="M7 1v8M4 6l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M1 10v2a1 1 0 001 1h10a1 1 0 001-1v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

const ListIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path d="M1 3h12M1 7h12M1 11h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

// ── Step Indicator ─────────────────────────────────────────

function StepIndicator({ currentStep }) {
  const steps = [
    { key: 'upload', label: 'Изображение' },
    { key: 'details', label: 'Детали' },
    { key: 'success', label: 'Готово' },
  ]
  const currentIndex = steps.findIndex(s => s.key === currentStep)
  const progress = Math.round(((currentIndex + 1) / steps.length) * 100)

  return (
    <div className="step-indicator">
      <div className="step-indicator__steps">
        {steps.map((step, i) => (
          <Fragment key={step.key}>
            <div className={
              'step-indicator__step' +
              (i === currentIndex ? ' is-active' : '') +
              (i < currentIndex ? ' is-done' : '')
            }>
              <div className="step-indicator__dot">
                {i < currentIndex ? '✓' : i + 1}
              </div>
              <span className="step-indicator__label">{step.label}</span>
            </div>
            {i < steps.length - 1 && <div className="step-indicator__line" />}
          </Fragment>
        ))}
      </div>
      <div className="step-indicator__bar-row">
        <div className="step-indicator__bar">
          <div className="step-indicator__bar-fill" style={{ width: `${progress}%` }} />
        </div>
        <span className="step-indicator__bar-label">Шаг {currentIndex + 1} из {steps.length} • {progress}%</span>
      </div>
    </div>
  )
}

// ── AI Block ───────────────────────────────────────────────

const DAILY_LIMIT = 5;

function AiBlock({ aiUsed, analyzing, aiError, aiSuggestions, fields, remaining, onAnalyze }) {
  const limitExceeded = remaining !== null && remaining <= 0;

  const counter = remaining !== null && (
    <span className="ai-block__counter">
      {remaining} из {DAILY_LIMIT} анализов сегодня
    </span>
  );

  if (analyzing) {
    return (
      <div className="ai-block">
        <div className="ai-block__header">
          <div className="ai-block__title">
            <span className="ai-block__spinner" />
            Анализирую изображение…
          </div>
        </div>
      </div>
    )
  }

  if (!aiUsed) {
    return (
      <div className="ai-block">
        <div className="ai-block__header">
          <div className="ai-block__title">
            <span>✦</span>
            ИИ-ассистент
          </div>
          {counter}
        </div>
        <div className="ai-block__body">
          {limitExceeded ? (
            <p className="ai-block__error">Лимит исчерпан — приходите завтра</p>
          ) : (
            <>
              <p className="ai-block__description">
                Автоматически заполнит технику, стиль и теги — на основе изображения. Всё можно будет отредактировать вручную.
              </p>
              <button type="button" className="ai-block__analyze-btn" onClick={onAnalyze}>
                <span>✦</span> Проанализировать с ИИ
              </button>
              {aiError && <p className="ai-block__error">{aiError}</p>}
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="ai-block">
      <div className="ai-block__header ai-block__header--done">
        <div className="ai-block__title">
          <span>✓</span>
          ИИ проанализировал изображение
        </div>
        <div className="ai-block__header-right">
          {counter}
          {!limitExceeded && (
            <button type="button" className="ai-block__rerun-btn" onClick={onAnalyze}>
              Повторить
            </button>
          )}
        </div>
      </div>
      <div className="ai-block__body">
        <div className="ai-block__results">
          {fields.materials && (
            <div className="ai-block__result-row">
              <span className="ai-block__result-label">Техника</span>
              <span className="ai-block__result-value">{fields.materials}</span>
              <span className="ai-block__result-check">✓</span>
            </div>
          )}
          {aiSuggestions?.style_names?.length > 0 && (
            <div className="ai-block__result-row">
              <span className="ai-block__result-label">Стиль</span>
              <span className="ai-block__result-value">{aiSuggestions.style_names.join(', ')}</span>
              <span className="ai-block__result-check">✓</span>
            </div>
          )}
          {aiSuggestions?.subject_names?.length > 0 && (
            <div className="ai-block__result-row">
              <span className="ai-block__result-label">Теги</span>
              <span className="ai-block__result-value">{aiSuggestions.subject_names.slice(0, 5).join(', ')}</span>
              <span className="ai-block__result-check">✓</span>
            </div>
          )}
        </div>
        <p className="ai-block__note">Проверьте данные и при необходимости отредактируйте</p>
        {aiError && <p className="ai-block__error">{aiError}</p>}
      </div>
    </div>
  )
}

// ── Section Card ───────────────────────────────────────────

function SectionCard({ title, icon, badge, children }) {
  return (
    <div className="art-section">
      <div className="art-section__header">
        {icon && <span className="art-section__icon">{icon}</span>}
        <h3 className="art-section__title">{title}</h3>
        {badge && <span className="art-section__badge">{badge}</span>}
      </div>
      <div className="art-section__body">
        {children}
      </div>
    </div>
  )
}

// ── Field wrapper ──────────────────────────────────────────

function Field({ label, required, error, hint, children }) {
  return (
    <div className={`art-field${error ? ' art-field--error' : ''}`}>
      {label && (
        <label className={`art-field__label${required ? ' art-field__label--required' : ''}`}>
          {label}
        </label>
      )}
      {children}
      {hint && !error && <p className="art-field__hint">{hint}</p>}
      {error && <p className="art-field__error-msg">{error}</p>}
    </div>
  )
}

// ── Photo Tips Sidebar ─────────────────────────────────────

function PhotoTipsSidebar() {
  const tips = [
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M19.07 4.93l-1.41 1.41M6.34 17.66l-1.41 1.41" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      ),
      title: 'Дневной свет',
      desc: 'Снимайте при естественном освещении для точной передачи цветов.',
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M4 19L20 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      ),
      title: 'Без бликов',
      desc: 'Избегайте бликов на глянцевых поверхностях и стекле.',
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="2" y="2" width="20" height="20" rx="2" stroke="currentColor" strokeWidth="1.5"/>
          <rect x="6" y="6" width="12" height="12" rx="1" stroke="currentColor" strokeWidth="1.5"/>
        </svg>
      ),
      title: 'Нейтральный фон',
      desc: 'Используйте простой фон без лишних предметов.',
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5"/>
          <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5"/>
          <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5"/>
          <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5"/>
        </svg>
      ),
      title: 'Высокое качество',
      desc: 'Минимум 1200 пикселей по длинной стороне.',
    },
  ]

  return (
    <div className="upload-sidebar">
      <div className="photo-tips">
        <h3 className="photo-tips__title">
          Советы по фотографии
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M6 1L7.4 4.4H11L8.3 6.6L9.4 10L6 7.8L2.6 10L3.7 6.6L1 4.4H4.6L6 1Z" fill="currentColor"/>
          </svg>
        </h3>
        <div className="photo-tips__list">
          {tips.map((tip, i) => (
            <div key={i} className="photo-tip">
              <div className="photo-tip__icon">{tip.icon}</div>
              <div className="photo-tip__body">
                <strong className="photo-tip__title">{tip.title}</strong>
                <p className="photo-tip__desc">{tip.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Trust Bar ──────────────────────────────────────────────

function TrustBar() {
  const items = [
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
          <path d="M11 2L3 6V11C3 15.4 6.5 19.5 11 20.5C15.5 19.5 19 15.4 19 11V6L11 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
        </svg>
      ),
      title: 'Безопасность',
      desc: 'Ваши работы защищены и не будут опубликованы без вашего согласия.',
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
          <circle cx="11" cy="11" r="9" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M7 11L10 14L15 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      title: 'Контроль',
      desc: 'Вы сами решаете, какую информацию показывать коллекционерам.',
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
          <circle cx="11" cy="11" r="9" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M11 6V11.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      title: 'Быстрая модерация',
      desc: 'Обычно проверяем работы в течение 1–2 рабочих дней.',
    },
  ]

  return (
    <div className="upload-trust-bar">
      {items.map((item, i) => (
        <div key={i} className="trust-item">
          <div className="trust-item__icon">{item.icon}</div>
          <div>
            <strong className="trust-item__title">{item.title}</strong>
            <p className="trust-item__desc">{item.desc}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Step 1: Upload + Crop ──────────────────────────────────

function UploadStep({ onNext }) {
  const [images, setImages] = useState([])
  const [quality, setQuality] = useState(null)
  const [checking, setChecking] = useState(false)
  const [cropIndex, setCropIndex] = useState(null)
  const [cropSrc, setCropSrc] = useState(null)
  const [crop, setCrop] = useState(undefined)
  const [completedCrop, setCompletedCrop] = useState(null)
  const [imgRef, setImgRef] = useState(null)
  const [croppedImages, setCroppedImages] = useState([])
  const addMoreRef = useRef(null)

  const handleAddMore = async (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    const newImages = await Promise.all(files.map(file => new Promise(resolve => {
      const reader = new FileReader()
      reader.onload = ev => resolve({ data_url: ev.target.result, file })
      reader.readAsDataURL(file)
    })))
    setImages(prev => [...prev, ...newImages].slice(0, 5))
    e.target.value = ''
  }

  const handleChange = useCallback(async (list) => {
    setImages(list)
    setCroppedImages([])
    setQuality(null)
    if (!list[0]?.data_url) return
    setChecking(true)
    const dims = await getImageDimensions(list[0].data_url)
    setChecking(false)
    if (dims) setQuality({ ok: dims.width >= MIN_WIDTH && dims.height >= MIN_HEIGHT, ...dims })
  }, [])

  const startCrop = (index) => {
    setCropIndex(index)
    setCropSrc(croppedImages[index] || images[index].data_url)
    setCrop(undefined)
    setCompletedCrop(null)
    setImgRef(null)
  }

  const rotateCW = async () => {
    const rotated = await rotateDataUrl(cropSrc)
    setCropSrc(rotated)
    setCrop(undefined)
    setCompletedCrop(null)
  }

  const confirmCrop = () => {
    const dataUrl = completedCrop?.width && completedCrop?.height && imgRef
      ? applyCrop(imgRef, completedCrop)
      : cropSrc
    setCroppedImages(prev => { const n = [...prev]; n[cropIndex] = dataUrl; return n })
    setCropIndex(null)
  }

  const finalImages = images.map((img, i) => ({ ...img, data_url: croppedImages[i] || img.data_url }))

  if (cropIndex !== null && cropSrc) {
    return (
      <div className="crop-modal">
        <div className="crop-modal__header">
          <span>Обрежьте изображение</span>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button type="button" className="crop-rotate-btn" onClick={rotateCW}>↻ 90°</button>
            <button type="button" className="art-btn art-btn--ghost" onClick={() => setCropIndex(null)}>
              Пропустить
            </button>
          </div>
        </div>
        <div className="crop-modal__canvas">
          <ReactCrop crop={crop} onChange={c => setCrop(c)} onComplete={c => setCompletedCrop(c)}>
            <img
              src={cropSrc}
              onLoad={e => setImgRef(e.currentTarget)}
              style={{ maxHeight: 480, maxWidth: '100%', display: 'block' }}
              alt=""
            />
          </ReactCrop>
        </div>
        <div className="crop-modal__controls">
          <button type="button" className="art-btn art-btn--primary" onClick={confirmCrop}>
            Применить кадрирование
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <input
        ref={addMoreRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={handleAddMore}
      />
      <div className="upload-layout">
        <div className="upload-card">
          <div className="upload-card__header">
            <h2 className="upload-card__title">Загрузите изображение работы</h2>
            <p className="upload-card__subtitle">
              Хорошее фото помогает вашей работе выделиться и увеличивает шансы на успешную публикацию.
            </p>
          </div>
          <div className="upload-card__body">
            <ImageUploading
              value={images}
              onChange={handleChange}
              maxNumber={5}
              dataURLKey="data_url"
              maxFileSize={10485760}
            >
              {({ imageList, onImageUpload, onImageRemove, isDragging, dragProps }) => (
                <>
                  {imageList.length === 0 ? (
                    <div
                      className={`upload-zone${isDragging ? ' is-dragging' : ''}`}
                      onClick={onImageUpload}
                      {...dragProps}
                    >
                      <CloudUploadIcon />
                      <strong className="upload-zone__heading">Перетащите изображение сюда</strong>
                      <span className="upload-zone__or">или нажмите, чтобы выбрать файл</span>
                      <span className="upload-zone__sub">JPG, PNG · до 10 МБ · до 5 фото</span>
                    </div>
                  ) : (
                    <div className="upload-preview-grid">
                      {imageList.map((img, i) => (
                        <div key={i} className="upload-preview-item">
                          <img src={croppedImages[i] || img.data_url} alt="" />
                          <div className="upload-preview-item__overlay">
                            <button
                              type="button"
                              className="upload-preview-item__btn"
                              onClick={() => startCrop(i)}
                              title="Кадрировать"
                            >✂</button>
                            <button
                              type="button"
                              className="upload-preview-item__btn upload-preview-item__btn--danger"
                              onClick={() => onImageRemove(i)}
                              title="Удалить"
                            >×</button>
                          </div>
                        </div>
                      ))}
                      {imageList.length < 5 && (
                        <div
                          className="upload-preview-item upload-preview-item--add"
                          onClick={() => addMoreRef.current?.click()}
                        >
                          + ещё фото
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </ImageUploading>

            {images.length === 0 && (
              <div className="upload-info-bar">
                <InfoIcon />
                <span>Рекомендуемое разрешение — не менее 1200×900 пикселей.</span>
              </div>
            )}
            {checking && (
              <div className="quality-badge quality-badge--checking">Проверяем качество…</div>
            )}
            {quality && (
              <div className={`quality-badge quality-badge--${quality.ok ? 'ok' : 'warn'}`}>
                {quality.ok
                  ? `✓ Отличное качество — ${quality.width}×${quality.height} px`
                  : `⚠ Низкое разрешение — ${quality.width}×${quality.height} px. Можно продолжить.`}
              </div>
            )}
          </div>
          <div className="upload-card__actions">
            <button
              type="button"
              className="art-btn art-btn--secondary"
              disabled
              title="Функция сохранения черновика — скоро"
            >
              <BookmarkIcon /> Сохранить черновик
            </button>
            <button
              type="button"
              className="art-btn art-btn--primary"
              disabled={images.length === 0}
              onClick={() => onNext(finalImages)}
            >
              <PictureIcon /> Продолжить →
            </button>
          </div>
        </div>
        <PhotoTipsSidebar />
      </div>
      <TrustBar />
    </>
  )
}

// ── Step 2: Details ────────────────────────────────────────

function DetailsStep({ images, onImagesChange, sessionJwt, userId, initialArtist, isModerator, onBack, onSuccess }) {
  const [fields, setFields] = useState({
    title: '', description: '', materials: '', price: '', width: '', height: '', depth: '',
  })
  const [unit, setUnit] = useState('см')
  const [artist, setArtist] = useState(initialArtist || { id: null, full_name: '' })
  const [styles, setStyles] = useState({ ids: [], custom: [] })
  const [subjects, setSubjects] = useState({ ids: [], custom: [] })
  const [mediums, setMediums] = useState({ ids: [], custom: [] })
  const [availableOptions, setAvailableOptions] = useState({ styles: [], subjects: [], mediums: [] })

  useEffect(() => {
    Promise.all([
      fetchStrapi(API_HOST + '/styles?pagination[limit]=200'),
      fetchStrapi(API_HOST + '/subjects?pagination[limit]=200'),
      fetchStrapi(API_HOST + '/mediums?pagination[limit]=200'),
    ]).then(([s, sub, m]) => {
      setAvailableOptions({
        styles: (s || []).map(x => x.Title).filter(Boolean),
        subjects: (sub || []).map(x => x.Title).filter(Boolean),
        mediums: (m || []).map(x => x.title).filter(Boolean),
      })
    }).catch(() => {})
  }, [])
  const [date, setDate] = useState(new Date())
  const [aiUsed, setAiUsed] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [aiError, setAiError] = useState('')
  const [aiSuggestions, setAiSuggestions] = useState(null)
  const [aiRemaining, setAiRemaining] = useState(null)

  useEffect(() => {
    fetch('/api/ai/analyze-art')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.remaining !== undefined) setAiRemaining(d.remaining) })
      .catch(() => {})
  }, [])
  const [interiorDataUrl, setInteriorDataUrl] = useState(null)
  const [interiorLoading, setInteriorLoading] = useState(false)
  const [interiorRemaining, setInteriorRemaining] = useState(null)

  useEffect(() => {
    fetch('/api/ai/generate-interior')
      .then(r => r.json())
      .then(d => { if (d?.remaining !== undefined) setInteriorRemaining(d.remaining) })
      .catch(() => {})
  }, [])

  const [uploading, setUploading] = useState(false)
  const [imageLoadingProcess, setImageLoadingProcess] = useState(null)
  const [errors, setErrors] = useState({})
  const [cropIndex, setCropIndex] = useState(null)
  const [cropSrc, setCropSrc] = useState(null)
  const [crop, setCrop] = useState(undefined)
  const [completedCrop, setCompletedCrop] = useState(null)
  const [imgRef, setImgRef] = useState(null)

  const startCrop = (index) => {
    setCropIndex(index)
    setCropSrc(images[index].data_url)
    setCrop(undefined)
    setCompletedCrop(null)
    setImgRef(null)
  }

  const rotateCW = async () => {
    const rotated = await rotateDataUrl(cropSrc)
    setCropSrc(rotated)
    setCrop(undefined)
    setCompletedCrop(null)
  }

  const confirmCrop = () => {
    const dataUrl = completedCrop?.width && completedCrop?.height && imgRef
      ? applyCrop(imgRef, completedCrop)
      : cropSrc
    onImagesChange(images.map((img, i) => i === cropIndex ? { ...img, data_url: dataUrl } : img))
    setCropIndex(null)
  }

  const removeImage = (index) => {
    onImagesChange(images.filter((_, i) => i !== index))
  }

  const detailsAddMoreRef = useRef(null)
  const handleDetailsAddMore = async (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    const newImages = await Promise.all(files.map(file => new Promise(resolve => {
      const reader = new FileReader()
      reader.onload = ev => resolve({ data_url: ev.target.result, file })
      reader.readAsDataURL(file)
    })))
    onImagesChange([...images, ...newImages].slice(0, 5))
    e.target.value = ''
  }

  const set = key => e => setFields(f => ({ ...f, [key]: e.target.value }))
  const priceSuggestion = usePriceSuggestion(fields.width, fields.height, fields.materials)
  const descLen = fields.description.length

  const analyzeWithAI = async () => {
    setAnalyzing(true)
    setAiError('')
    try {
      const res = await fetch('/api/ai/analyze-art', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageDataUrl: images[0].data_url,
          availableStyles: availableOptions.styles,
          availableSubjects: availableOptions.subjects,
          availableMediums: availableOptions.mediums,
        }),
      })
      if (!res.ok) throw new Error('Ошибка сервера')
      const data = await res.json()
      if (data._remaining !== undefined) setAiRemaining(data._remaining)
      if (data.remaining !== undefined) setAiRemaining(data.remaining)
      if (data._limitExceeded) {
        setAiRemaining(0)
      } else if (data._error) {
        setAiError(data._error)
      } else {
        setFields(f => ({
          ...f,
          description: data.description || f.description,
          materials: data.materials || f.materials,
        }))
        setAiSuggestions({
          style_names: data.style_names || [],
          subject_names: data.subject_names || [],
          medium_names: data.medium_names || [],
        })
        setAiUsed(true)
      }
    } catch (e) {
      setAiError('Ошибка ИИ — заполните поля самостоятельно')
    }
    setAnalyzing(false)
  }

  async function generateInterior() {
    if (interiorLoading || interiorRemaining === 0) return
    setInteriorLoading(true)
    try {
      const res = await fetch('/api/ai/generate-interior', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: fields.title,
          styles: styles.ids.length ? styles.ids.join(', ') : '',
          materials: fields.materials,
          description: fields.description,
        }),
      })
      const data = await res.json()
      if (data._limitExceeded) { setInteriorRemaining(0); return }
      if (data._error) { alert(data._error); return }
      if (data.image) {
        setInteriorDataUrl(`data:image/jpeg;base64,${data.image}`)
        if (data.remaining !== undefined) setInteriorRemaining(data.remaining)
      }
    } catch {
      alert('Ошибка генерации, попробуйте ещё раз')
    } finally {
      setInteriorLoading(false)
    }
  }

  async function uploadImages() {
    const uploaded = []
    for (let i = 0; i < images.length; i++) {
      const fd = new FormData()
      const blob = await (await fetch(images[i].data_url)).blob()
      fd.append('files', blob, images[i].file?.name || `image_${i}.jpg`)
      setImageLoadingProcess({ index: i, length: images.length })
      const res = await fetch(API_HOST + '/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${sessionJwt}` },
        body: fd,
      })
      const image = normalizeStrapiResponse(await res.json())
      const first = Array.isArray(image) ? image[0] : image
      if (first) uploaded.push(first)
    }
    return uploaded
  }

  async function handleSubmit(e) {
    if (e?.preventDefault) e.preventDefault()

    const errs = {}
    if (!fields.title.trim()) errs.title = 'Укажите название работы'
    if (!artist.id && !artist.full_name?.trim()) errs.artist = 'Укажите художника'
    if (!fields.description.trim()) errs.description = 'Добавьте описание'
    if (!fields.materials.trim()) errs.materials = 'Укажите материалы и технику'
    if (!fields.width) errs.width = 'Укажите ширину'
    if (!fields.height) errs.height = 'Укажите высоту'
    if (!fields.price) errs.price = 'Укажите желаемую цену'
    if (Object.keys(errs).length) {
      setErrors(errs)
      setTimeout(() => {
        document.querySelector('.art-field--error')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 0)
      return
    }

    setUploading(true)

    let artistId = artist.id
    if (!artistId && artist.full_name?.trim()) {
      const r = await fetch(API_HOST + '/artists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionJwt}` },
        body: JSON.stringify({ data: { full_name: artist.full_name } }),
      })
      const a = normalizeStrapiResponse(await r.json())
      artistId = a?.id || null
    }

    async function createCustomEntries(endpoint, nameField, names) {
      const ids = []
      for (const name of names) {
        try {
          const r = await fetch(API_HOST + `/${endpoint}?status=draft`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionJwt}` },
            body: JSON.stringify({ data: { [nameField]: name } }),
          })
          const item = normalizeStrapiResponse(await r.json())
          if (item?.id) ids.push(item.id)
        } catch {}
      }
      return ids
    }

    const [customStyleIds, customSubjectIds, customMediumIds] = await Promise.all([
      createCustomEntries('styles', 'Title', styles.custom),
      createCustomEntries('subjects', 'Title', subjects.custom),
      createCustomEntries('mediums', 'title', mediums.custom),
    ])

    const allStyles = [...styles.ids, ...customStyleIds]
    const allSubjects = [...subjects.ids, ...customSubjectIds]
    const allMediums = [...mediums.ids, ...customMediumIds]

    const imagesUploaded = await uploadImages()
    if (!imagesUploaded[0]?.id) {
      setUploading(false)
      setErrors(er => ({ ...er, upload: 'Ошибка загрузки изображения, попробуйте ещё раз' }))
      return
    }

    // Upload interior photo if generated
    let interiorPhotoId = null
    if (interiorDataUrl) {
      try {
        const blob = await (await fetch(interiorDataUrl)).blob()
        const fd = new FormData()
        fd.append('files', blob, 'interior.jpg')
        const upRes = await fetch(API_HOST + '/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${sessionJwt}` },
          body: fd,
        })
        const upData = normalizeStrapiResponse(await upRes.json())
        const upFirst = Array.isArray(upData) ? upData[0] : upData
        if (upFirst?.id) interiorPhotoId = upFirst.id
      } catch {}
    }

    const year = date.getFullYear()
    const artData = {
      Title: fields.title,
      Description: fields.description,
      Materials: fields.materials,
      Owners_price: parseInt(fields.price) || 0,
      width: fields.width || null,
      height: fields.height || null,
      Year: `${year}-01-01`,
      styles: allStyles,
      subjects: allSubjects,
      mediums: allMediums,
      Pictures: imagesUploaded.map(p => p.id),
    }
    if (artistId) artData.Artist = artistId
    if (interiorPhotoId) artData.interior_photo = interiorPhotoId

    const res = await fetch(
      `${API_HOST}/arts?populate[0]=styles&populate[1]=subjects&populate[2]=mediums&populate[3]=Artist&populate[4]=Pictures`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionJwt}` },
        body: JSON.stringify({ data: artData }),
      }
    )
    const resJson = await res.json()
    setUploading(false)
    if (!res.ok || resJson?.error) {
      const msg = resJson?.error?.message || 'Ошибка сохранения работы'
      setErrors(er => ({ ...er, upload: msg }))
      return
    }
    onSuccess(normalizeStrapiResponse(resJson), {
      imageDataUrl: images[0]?.data_url,
      artist,
      date,
      unit,
    })
  }

  return (
    <>
      {uploading && (
        <div className="overlay">
          <Preloader>
            <div className="preloader__text">Загружаем картину…</div>
            {imageLoadingProcess && (
              <div>
                изображение {Math.min(imageLoadingProcess.index + 1, imageLoadingProcess.length)} из {imageLoadingProcess.length}
              </div>
            )}
          </Preloader>
        </div>
      )}

      <div className="details-step">
        {/* ── Left: artwork hero ── */}
        {cropIndex !== null && cropSrc ? (
          <div className="crop-modal">
            <div className="crop-modal__header">
              <span>Обрежьте изображение</span>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <button type="button" className="crop-rotate-btn" onClick={rotateCW}>↻ 90°</button>
                <button type="button" className="art-btn art-btn--ghost" onClick={() => setCropIndex(null)}>
                  Пропустить
                </button>
              </div>
            </div>
            <div className="crop-modal__canvas">
              <ReactCrop crop={crop} onChange={c => setCrop(c)} onComplete={c => setCompletedCrop(c)}>
                <img
                  src={cropSrc}
                  onLoad={e => setImgRef(e.currentTarget)}
                  style={{ maxHeight: 480, maxWidth: '100%', display: 'block' }}
                  alt=""
                />
              </ReactCrop>
            </div>
            <div className="crop-modal__controls">
              <button type="button" className="art-btn art-btn--primary" onClick={confirmCrop}>
                Применить кадрирование
              </button>
            </div>
          </div>
        ) : (
          <div className="art-preview-hero">
            <input
              ref={detailsAddMoreRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={handleDetailsAddMore}
            />
            <div className="art-preview-hero__image-wrap">
              <img src={images[0]?.data_url} alt="Предпросмотр работы" />
              {aiUsed && <span className="art-preview-hero__ai-badge">✦ AI</span>}
              <div className="upload-preview-item__overlay">
                <button type="button" className="upload-preview-item__btn" onClick={() => startCrop(0)} title="Кадрировать">✂</button>
                {images.length > 1 && (
                  <button type="button" className="upload-preview-item__btn upload-preview-item__btn--danger" onClick={() => removeImage(0)} title="Удалить">×</button>
                )}
              </div>
            </div>
            {(images.length > 1 || images.length < 5) && (
              <div className="upload-preview-grid upload-preview-grid--small">
                {images.slice(1).map((img, i) => (
                  <div key={i + 1} className="upload-preview-item">
                    <img src={img.data_url} alt="" />
                    <div className="upload-preview-item__overlay">
                      <button type="button" className="upload-preview-item__btn" onClick={() => startCrop(i + 1)} title="Кадрировать">✂</button>
                      <button type="button" className="upload-preview-item__btn upload-preview-item__btn--danger" onClick={() => removeImage(i + 1)} title="Удалить">×</button>
                    </div>
                  </div>
                ))}
                {images.length < 5 && (
                  <div className="upload-preview-item upload-preview-item--add" onClick={() => detailsAddMoreRef.current?.click()}>
                    + ещё
                  </div>
                )}
              </div>
            )}
            <button type="button" className="art-preview-hero__change-btn" onClick={onBack}>
              ← Изменить изображение
            </button>
          </div>
        )}

        {/* ── Right: form ── */}
        <form className="details-form" onSubmit={handleSubmit}>

          <AiBlock
            aiUsed={aiUsed}
            analyzing={analyzing}
            aiError={aiError}
            aiSuggestions={aiSuggestions}
            fields={fields}
            remaining={aiRemaining}
            onAnalyze={analyzeWithAI}
          />

          <SectionCard title="Информация о работе" icon="🎨">
            <Field label="Название" required error={errors.title}>
              <input
                type="text"
                placeholder="Например, «Осенний пейзаж»"
                value={fields.title}
                onChange={set('title')}
              />
            </Field>

            <div className="art-fields-row">
              <Field required error={errors.artist}>
                <ArtistInput onArtistChange={setArtist} initialValue={initialArtist} />
              </Field>
              <YearInput onChange={setDate} />
            </div>
          </SectionCard>

          <SectionCard title="Физические характеристики" icon="📐">
            <Field label="Материалы и техника" required error={errors.materials}>
              <input
                type="text"
                placeholder="Холст, масло"
                value={fields.materials}
                onChange={set('materials')}
              />
            </Field>

            <div>
              <div className="dimensions-row">
                <div className="dimensions-row__field">
                  <span className="dimensions-row__label">Ширина *</span>
                  <input type="number" placeholder="80" value={fields.width} onChange={set('width')} min="0" className={errors.width ? 'input--error' : ''} />
                  {errors.width && <p className="art-field__error-msg">{errors.width}</p>}
                </div>
                <div className="dimensions-row__field">
                  <span className="dimensions-row__label">Высота *</span>
                  <input type="number" placeholder="100" value={fields.height} onChange={set('height')} min="0" className={errors.height ? 'input--error' : ''} />
                  {errors.height && <p className="art-field__error-msg">{errors.height}</p>}
                </div>
                <div className="dimensions-row__field">
                  <span className="dimensions-row__label">
                    Глубина <span className="dimensions-row__optional">(необяз.)</span>
                  </span>
                  <input type="number" placeholder="3" value={fields.depth} onChange={set('depth')} min="0" />
                </div>
                <div className="dimensions-unit">
                  <span className="dimensions-row__label">Ед.</span>
                  <select value={unit} onChange={e => setUnit(e.target.value)}>
                    <option value="см">см</option>
                    <option value="мм">мм</option>
                    <option value="м">м</option>
                    <option value="дюйм">дюйм</option>
                  </select>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Описание" icon="✏️">
            <Field label="О работе" required error={errors.description}>
              <div className="art-textarea-wrap">
                <textarea
                  placeholder="Расскажите историю этой работы — что вдохновило, какой техникой создана, что хотелось передать…"
                  value={fields.description}
                  onChange={set('description')}
                  rows={5}
                  maxLength={DESC_MAX}
                />
                <span className={
                  'art-char-counter' +
                  (descLen > DESC_MAX * 0.9 ? ' art-char-counter--warn' : '') +
                  (descLen >= DESC_MAX ? ' art-char-counter--over' : '')
                }>
                  {descLen} / {DESC_MAX}
                </span>
              </div>
            </Field>
          </SectionCard>

          <SectionCard title="Классификация" icon="🏷️" badge={aiUsed ? '✦ AI' : null}>
            <MultiSelectInput
              endpoint="styles"
              label="Стиль"
              onChange={setStyles}
              aiNames={aiSuggestions?.style_names || []}
            />
            <MultiSelectInput
              endpoint="subjects"
              label="Теги"
              onChange={setSubjects}
              aiNames={aiSuggestions?.subject_names || []}
            />
            <MultiSelectInput
              endpoint="mediums"
              label="Техника"
              titleField="title"
              onChange={setMediums}
              aiNames={aiSuggestions?.medium_names || []}
            />
            {(styles.custom.length > 0 || subjects.custom.length > 0 || mediums.custom.length > 0) && (
              <p className="ms-moderation-note">
                Ваши варианты будут добавлены после проверки модератором
              </p>
            )}
          </SectionCard>

          {isModerator && (
            <SectionCard title="Фото в интерьере" icon="🛋️">
              <InteriorPhotoBlock
                dataUrl={interiorDataUrl}
                loading={interiorLoading}
                remaining={interiorRemaining}
                onGenerate={generateInterior}
                onRemove={() => setInteriorDataUrl(null)}
              />
            </SectionCard>
          )}

          <SectionCard title="Цена" icon="💰">
            <Field label="Желаемая цена, ₽" required error={errors.price}>
              <input
                type="number"
                placeholder="15000"
                value={fields.price}
                onChange={set('price')}
                min="0"
              />
            </Field>
            {priceSuggestion && (
              <div className="price-suggestion">
                <span className="price-suggestion__icon">💡</span>
                <div className="price-suggestion__body">
                  <span className="price-suggestion__label">Рекомендуемый диапазон</span>
                  <strong className="price-suggestion__range">
                    {formatRub(priceSuggestion.min)} — {formatRub(priceSuggestion.max)}
                  </strong>
                  <span className="price-suggestion__note">На основе размера и техники</span>
                </div>
              </div>
            )}
          </SectionCard>

          {errors.upload && <div className="art-error-banner">{errors.upload}</div>}
        </form>
      </div>

      {/* Sticky action bar — fixed, outside the two-column grid */}
      <div className="art-action-bar">
        <div className="art-action-bar__inner">
          <div className="art-action-bar__secondary">
            <button type="button" className="art-btn art-btn--ghost" onClick={onBack}>
              ← Назад
            </button>
            <button
              type="button"
              className="art-btn art-btn--secondary"
              disabled
              title="Функция сохранения черновика — скоро"
            >
              Сохранить черновик
            </button>
          </div>
          <div className="art-action-bar__primary">
            <button
              type="button"
              className="art-btn art-btn--primary"
              onClick={handleSubmit}
            >
              Отправить на модерацию →
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Success ────────────────────────────────────────────────

function SuccessStep({ result, meta, onReset }) {
  const now = useMemo(() => new Date(), [])
  const timeStr = now.toLocaleString('ru-RU', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).replace(' г.', '')

  const styleNames = (result?.styles || []).map(s => s.Title || s.title).filter(Boolean)
  const subjectNames = (result?.subjects || []).map(s => s.Title || s.title).filter(Boolean)
  const dimensions = [result?.width, result?.height].filter(Boolean).join(' × ')
  const artistName = result?.Artist?.full_name || meta?.artist?.full_name || ''
  const price = result?.Owners_price
  const materials = result?.Materials || ''
  const description = result?.Description || ''
  const dateStr = meta?.date
    ? meta.date.toLocaleDateString('ru-RU')
    : result?.Year
      ? new Date(result.Year).getFullYear().toString()
      : ''

  const handleDownload = () => {
    if (!meta?.imageDataUrl) return
    const a = document.createElement('a')
    a.href = meta.imageDataUrl
    a.download = `${result?.Title || 'artwork'}.jpg`
    a.click()
  }

  const timelineItems = [
    { label: 'Изображение загружено', done: true },
    { label: 'Детали заполнены', done: true },
    { label: 'На модерации', done: false, num: 3 },
  ]

  return (
    <>
      <div className="success-layout">
        {/* ── Main content ── */}
        <div className="success-main">
          {/* Header */}
          <div className="success-header">
            <div className="success-header__check">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
                <path d="M4 11L9 16L18 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="success-header__text">
              <h2 className="success-header__title">Ваша работа отправлена на модерацию!</h2>
              <p className="success-header__subtitle">
                Спасибо! Мы проверим вашу работу в течение 1–2 рабочих дней.<br/>
                Вы получите уведомление на email и в личном кабинете.
              </p>
            </div>
            {meta?.imageDataUrl && (
              <button type="button" className="art-btn art-btn--secondary success-header__download" onClick={handleDownload}>
                <DownloadIcon /> Скачать превью
              </button>
            )}
          </div>

          {/* Art card */}
          <div className="success-art-card">
            {meta?.imageDataUrl && (
              <div className="success-art-card__img">
                <img src={meta.imageDataUrl} alt={result?.Title || ''} />
              </div>
            )}
            <div className="success-art-card__details">
              <div className="success-art-grid">
                {result?.Title && (
                  <div className="success-art-field">
                    <span className="success-art-field__label">Название работы</span>
                    <span className="success-art-field__value">{result.Title}</span>
                  </div>
                )}
                {artistName && (
                  <div className="success-art-field">
                    <span className="success-art-field__label">Художник</span>
                    <span className="success-art-field__value">{artistName}</span>
                  </div>
                )}
                {dateStr && (
                  <div className="success-art-field">
                    <span className="success-art-field__label">Дата создания</span>
                    <span className="success-art-field__value">{dateStr}</span>
                  </div>
                )}
                {dimensions && (
                  <div className="success-art-field">
                    <span className="success-art-field__label">Размеры</span>
                    <span className="success-art-field__value">{dimensions} {meta?.unit || 'см'}</span>
                  </div>
                )}
                {materials && (
                  <div className="success-art-field">
                    <span className="success-art-field__label">Материалы и техника</span>
                    <span className="success-art-field__value">{materials}</span>
                  </div>
                )}
                {price > 0 && (
                  <div className="success-art-field">
                    <span className="success-art-field__label">Желаемая цена</span>
                    <span className="success-art-field__value">{formatRub(price)}</span>
                  </div>
                )}
              </div>
              {styleNames.length > 0 && (
                <div className="success-art-tags">
                  <span className="success-art-field__label">Стиль</span>
                  <div className="success-art-tags__list">
                    {styleNames.map((s, i) => <span key={i} className="success-tag">{s}</span>)}
                  </div>
                </div>
              )}
              {subjectNames.length > 0 && (
                <div className="success-art-tags">
                  <span className="success-art-field__label">Теги</span>
                  <div className="success-art-tags__list">
                    {subjectNames.map((s, i) => <span key={i} className="success-tag">{s}</span>)}
                  </div>
                </div>
              )}
              {description && (
                <div className="success-art-desc">
                  <span className="success-art-field__label">Описание</span>
                  <p className="success-art-desc__text">{description}</p>
                </div>
              )}
            </div>
            <div className="success-next">
              <div className="success-next__icon">
                <svg width="18" height="18" viewBox="0 0 22 22" fill="none" aria-hidden="true">
                  <path d="M11 2L3 6V11C3 15.4 6.5 19.5 11 20.5C15.5 19.5 19 15.4 19 11V6L11 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <strong className="success-next__title">Что дальше?</strong>
                <p className="success-next__text">
                  После проверки модератором работа станет доступна на сайте. Мы уведомим вас о результате.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Sidebar ── */}
        <div className="success-sidebar">
          <div className="success-status-card">
            <h3 className="success-sidebar__title">Статус работы</h3>
            <div className="success-status-badge">
              <svg width="16" height="16" viewBox="0 0 22 22" fill="none" aria-hidden="true">
                <circle cx="11" cy="11" r="9" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M11 6V11.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <div>
                <strong>На модерации</strong>
                <span>Обычно занимает 1–2 рабочих дня</span>
              </div>
            </div>
            <div className="success-timeline">
              {timelineItems.map((item, i) => (
                <div key={i} className={`success-timeline__item${item.done ? ' is-done' : ' is-current'}`}>
                  <div className="success-timeline__dot">
                    {item.done
                      ? <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      : item.num
                    }
                  </div>
                  <div className="success-timeline__content">
                    <strong>{item.label}</strong>
                    <span>{timeStr}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="success-recommendations">
            <h3 className="success-sidebar__title">Рекомендации</h3>
            <ul className="success-rec-list">
              {[
                {
                  icon: <svg width="18" height="18" viewBox="0 0 22 22" fill="none" aria-hidden="true"><rect x="3" y="3" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M7 8h8M7 12h8M7 16h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
                  text: 'Следите за статусом работы в личном кабинете',
                },
                {
                  icon: <svg width="18" height="18" viewBox="0 0 22 22" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="9" stroke="currentColor" strokeWidth="1.5"/><path d="M11 7v8M7 11h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
                  text: 'Вы можете добавить ещё одну работу прямо сейчас',
                },
                {
                  icon: <svg width="18" height="18" viewBox="0 0 22 22" fill="none" aria-hidden="true"><circle cx="11" cy="8" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M5 19c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
                  text: 'Привяжите соцсети, чтобы увеличить охват вашей работы',
                },
              ].map((item, i) => (
                <li key={i} className="success-rec-item">
                  <div className="success-rec-item__icon">{item.icon}</div>
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>
            <a href="/account" className="art-btn art-btn--secondary" style={{ width: '100%', justifyContent: 'center' }}>
              Перейти в профиль
            </a>
          </div>
        </div>
      </div>

      <div className="art-action-bar">
        <div className="art-action-bar__inner">
          <div className="art-action-bar__secondary">
            <button type="button" className="art-btn art-btn--secondary" onClick={onReset}>
              <DownloadIcon /> Добавить ещё одну работу
            </button>
            <a href="/account/my-arts" className="art-btn art-btn--secondary">
              <ListIcon /> Перейти в мои работы
            </a>
          </div>
          <a href="/" className="art-btn art-btn--primary">На главную</a>
        </div>
      </div>
    </>
  )
}

// ── Main ───────────────────────────────────────────────────

export default function AddArt({ sessionJwt, userId, initialArtist, isModerator }) {
  const [step, setStep] = useState('upload')
  const [images, setImages] = useState([])
  const [result, setResult] = useState(null)
  const [resultMeta, setResultMeta] = useState(null)

  const reset = () => { setStep('upload'); setImages([]); setResult(null); setResultMeta(null) }

  return (
    <MainLayout>
      <Head><title>Добавить картину | Стена с картинами</title></Head>
      <div className="form-page add-art-page">
        <h1>Добавить картину</h1>
        <StepIndicator currentStep={step} />

        {step === 'upload' && (
          <UploadStep onNext={imgs => { setImages(imgs); setStep('details') }} />
        )}
        {step === 'details' && (
          <DetailsStep
            images={images}
            onImagesChange={setImages}
            sessionJwt={sessionJwt}
            userId={userId}
            initialArtist={initialArtist}
            isModerator={isModerator}
            onBack={() => setStep('upload')}
            onSuccess={(json, meta) => { setResult(json); setResultMeta(meta); setStep('success') }}
          />
        )}
        {step === 'success' && (
          <SuccessStep result={result} meta={resultMeta} onReset={reset} />
        )}
      </div>
    </MainLayout>
  )
}

export async function getServerSideProps(context) {
  const session = await getSession(context.req, context.res)
  if (!session?.jwt) {
    return { redirect: { destination: '/auth/signin?callbackUrl=/account/add-art', permanent: false } }
  }

  let initialArtist = null
  const email = session.info?.email
  if (email) {
    try {
      const { STRAPI_SERVER_URL } = process.env
      const base = STRAPI_SERVER_URL || process.env.NEXT_PUBLIC_API_URL
      const res = await fetch(
        `${base}/artists?filters[email][$eqi]=${encodeURIComponent(email)}&pagination[limit]=1`,
        { headers: { Authorization: `Bearer ${session.jwt}` } }
      )
      if (res.ok) {
        const data = await res.json()
        const first = data?.data?.[0]
        if (first) initialArtist = { id: first.id, full_name: first.full_name || first.attributes?.full_name || '' }
      }
    } catch {}
  }

  return { props: { sessionJwt: session.jwt, userId: session.info?.id || null, initialArtist, isModerator: !!session.info?.isModerator } }
}
