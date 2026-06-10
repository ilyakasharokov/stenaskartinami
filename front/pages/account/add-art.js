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

// ── Step Indicator ─────────────────────────────────────────

function StepIndicator({ currentStep }) {
  const steps = [
    { key: 'upload', label: 'Изображение' },
    { key: 'details', label: 'Детали' },
    { key: 'success', label: 'Готово' },
  ]
  const currentIndex = steps.findIndex(s => s.key === currentStep)

  return (
    <div className="step-indicator">
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
                Автоматически заполнит название, технику, стиль и теги — на основе изображения. Всё можно будет отредактировать вручную.
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
          {fields.title && (
            <div className="ai-block__result-row">
              <span className="ai-block__result-label">Название</span>
              <span className="ai-block__result-value">«{fields.title}»</span>
              <span className="ai-block__result-check">✓</span>
            </div>
          )}
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

// ── Step 1: Upload + Crop ──────────────────────────────────

function UploadStep({ onNext }) {
  const [images, setImages] = useState([])
  const [quality, setQuality] = useState(null)
  const [checking, setChecking] = useState(false)
  const [cropIndex, setCropIndex] = useState(null)
  const [cropSrc, setCropSrc] = useState(null)
  const [crop, setCrop] = useState({})
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
    setCrop({})
    setCompletedCrop(null)
    setImgRef(null)
  }

  const rotateCW = async () => {
    const rotated = await rotateDataUrl(cropSrc)
    setCropSrc(rotated)
    setCrop({})
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
    <div className="upload-step">
      <h2 className="upload-step__title">Загрузите изображение работы</h2>
      <p className="upload-step__hint">
        Фото при хорошем дневном освещении, без бликов. Рекомендуемое разрешение — не менее {MIN_WIDTH}×{MIN_HEIGHT} пикселей.
        Чем лучше качество снимка, тем убедительнее выглядит работа.
      </p>

      <input
        ref={addMoreRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={handleAddMore}
      />
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
                <span className="upload-zone__icon">🖼</span>
                <strong className="upload-zone__heading">Кликните или перетащите изображение</strong>
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

      <div className="upload-step__actions">
        <button
          type="button"
          className="art-btn art-btn--dark"
          disabled={images.length === 0}
          onClick={() => onNext(finalImages)}
        >
          Продолжить →
        </button>
      </div>
    </div>
  )
}

// ── Step 2: Details ────────────────────────────────────────

function DetailsStep({ images, onImagesChange, sessionJwt, userId, initialArtist, onBack, onSuccess }) {
  const [fields, setFields] = useState({
    title: '', description: '', materials: '', price: '', width: '', height: '', depth: '',
  })
  const [unit, setUnit] = useState('см')
  const [artist, setArtist] = useState(initialArtist || { id: null, full_name: '' })
  const [styles, setStyles] = useState([])
  const [subjects, setSubjects] = useState([])
  const [mediums, setMediums] = useState([])
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
  const [uploading, setUploading] = useState(false)
  const [imageLoadingProcess, setImageLoadingProcess] = useState(null)
  const [errors, setErrors] = useState({})
  const [cropIndex, setCropIndex] = useState(null)
  const [cropSrc, setCropSrc] = useState(null)
  const [crop, setCrop] = useState({})
  const [completedCrop, setCompletedCrop] = useState(null)
  const [imgRef, setImgRef] = useState(null)

  const startCrop = (index) => {
    setCropIndex(index)
    setCropSrc(images[index].data_url)
    setCrop({})
    setCompletedCrop(null)
    setImgRef(null)
  }

  const rotateCW = async () => {
    const rotated = await rotateDataUrl(cropSrc)
    setCropSrc(rotated)
    setCrop({})
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
        body: JSON.stringify({ imageDataUrl: images[0].data_url }),
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
          title: data.title || f.title,
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
    if (!fields.description.trim()) errs.description = 'Добавьте описание'
    if (!fields.materials.trim()) errs.materials = 'Укажите материалы и технику'
    if (Object.keys(errs).length) { setErrors(errs); return }

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

    const imagesUploaded = await uploadImages()
    if (!imagesUploaded[0]?.id) {
      setUploading(false)
      setErrors(er => ({ ...er, upload: 'Ошибка загрузки изображения, попробуйте ещё раз' }))
      return
    }

    const year = date.getFullYear()
    const res = await fetch(API_HOST + '/arts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionJwt}` },
      body: JSON.stringify({
        Title: fields.title,
        Description: fields.description,
        Materials: fields.materials,
        Owners_price: parseInt(fields.price) || 0,
        width: fields.width,
        height: fields.height,
        Year: `${year}-01-01`,
        Artist: artistId,
        styles,
        subjects,
        mediums,
        user_uploader: userId,
        Pictures: imagesUploaded.map(p => p.id),
      }),
    })
    const json = normalizeStrapiResponse(await res.json())
    setUploading(false)
    onSuccess(json)
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
              <ArtistInput onArtistChange={setArtist} initialValue={initialArtist} />
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
                  <span className="dimensions-row__label">Ширина</span>
                  <input type="number" placeholder="80" value={fields.width} onChange={set('width')} min="0" />
                </div>
                <div className="dimensions-row__field">
                  <span className="dimensions-row__label">Высота</span>
                  <input type="number" placeholder="100" value={fields.height} onChange={set('height')} min="0" />
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
          </SectionCard>

          <SectionCard title="Цена" icon="💰">
            <Field label="Желаемая цена, ₽">
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

function SuccessStep({ result, onReset }) {
  return (
    <div className="success-step">
      <div className="success-step__icon">✓</div>
      <h2 className="success-step__title">
        {result?.Title ? `«${result.Title}»` : 'Работа'} отправлена!
      </h2>
      <p className="success-step__subtitle">
        Ваша работа принята на модерацию. Обычно это занимает 1–2 рабочих дня.
      </p>
      <button type="button" className="art-btn art-btn--primary" onClick={onReset}>
        Добавить ещё одну работу
      </button>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────

export default function AddArt({ sessionJwt, userId, initialArtist }) {
  const [step, setStep] = useState('upload')
  const [images, setImages] = useState([])
  const [result, setResult] = useState(null)

  const reset = () => { setStep('upload'); setImages([]); setResult(null) }

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
            onBack={() => setStep('upload')}
            onSuccess={json => { setResult(json); setStep('success') }}
          />
        )}
        {step === 'success' && (
          <SuccessStep result={result} onReset={reset} />
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

  return { props: { sessionJwt: session.jwt, userId: session.info?.id || null, initialArtist } }
}
