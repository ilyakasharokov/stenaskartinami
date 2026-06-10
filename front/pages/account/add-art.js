import MainLayout from "@/components/layouts/MainLayout"
import { API_HOST } from "@/constants/constants"
import Head from 'next/head'
import { useState, useCallback } from "react"
import ImageUploading from "react-images-uploading"
import Cropper from "react-easy-crop"
import ArtistInput from "@/components/input/artist-input"
import YearInput from "@/components/input/year-input"
import Preloader from "@/components/preloader/preloader"
import MultiSelectInput from "@/components/input/multi-select-input"
import { normalizeStrapiResponse, fetchStrapi } from "@/utils/strapi"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"

const MIN_WIDTH = 800
const MIN_HEIGHT = 600

const ASPECT_OPTIONS = [
  { label: '⬜ Свободно', value: null },
  { label: '1:1', value: 1 },
  { label: '4:3', value: 4/3 },
  { label: '3:4', value: 3/4 },
  { label: '16:9', value: 16/9 },
]

function getImageDimensions(dataUrl) {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => resolve(null)
    img.src = dataUrl
  })
}

async function getCroppedDataUrl(imageSrc, pixelCrop, rotation = 0) {
  const image = await new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = imageSrc
  })

  const rad = (rotation * Math.PI) / 180
  const sin = Math.abs(Math.sin(rad))
  const cos = Math.abs(Math.cos(rad))
  const bboxW = Math.round(image.width * cos + image.height * sin)
  const bboxH = Math.round(image.width * sin + image.height * cos)

  const canvas = document.createElement('canvas')
  canvas.width = bboxW
  canvas.height = bboxH
  const ctx = canvas.getContext('2d')
  ctx.translate(bboxW / 2, bboxH / 2)
  ctx.rotate(rad)
  ctx.drawImage(image, -image.width / 2, -image.height / 2)

  const rotated = document.createElement('canvas')
  rotated.width = pixelCrop.width
  rotated.height = pixelCrop.height
  rotated.getContext('2d').drawImage(canvas, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height)
  return rotated.toDataURL('image/jpeg', 0.92)
}

// ── Step 1: Upload + Crop ──────────────────────────────────────────
function UploadStep({ onNext }) {
  const [images, setImages] = useState([])
  const [quality, setQuality] = useState(null)
  const [checking, setChecking] = useState(false)
  const [cropIndex, setCropIndex] = useState(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [aspect, setAspect] = useState(null)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [croppedImages, setCroppedImages] = useState([])

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
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setRotation(0)
    setAspect(null)
    setCroppedAreaPixels(null)
  }

  const confirmCrop = async () => {
    const dataUrl = await getCroppedDataUrl(images[cropIndex].data_url, croppedAreaPixels, rotation)
    setCroppedImages(prev => {
      const next = [...prev]
      next[cropIndex] = dataUrl
      return next
    })
    setCropIndex(null)
  }

  const skipCrop = () => setCropIndex(null)

  const rotateCW = () => setRotation(r => (r + 90) % 360)

  const finalImages = images.map((img, i) => ({
    ...img,
    data_url: croppedImages[i] || img.data_url,
  }))

  if (cropIndex !== null && images[cropIndex]) {
    return (
      <div className="crop-modal">
        <div className="crop-modal__header">
          <span>Обрежьте изображение</span>
          <button className="login-page__link-btn" onClick={skipCrop}>Пропустить</button>
        </div>

        <div className="crop-modal__aspect-btns">
          {ASPECT_OPTIONS.map(opt => (
            <button
              key={opt.label}
              type="button"
              className={`crop-aspect-btn${aspect === opt.value ? ' active' : ''}`}
              onClick={() => { setAspect(opt.value); setCrop({ x: 0, y: 0 }); setCroppedAreaPixels(null) }}
            >
              {opt.label}
            </button>
          ))}
          <button type="button" className="crop-aspect-btn crop-rotate-btn" onClick={rotateCW} title="Повернуть по часовой стрелке">
            ↻ 90°
          </button>
        </div>

        <div className="crop-modal__canvas">
          <Cropper
            image={images[cropIndex].data_url}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspect || undefined}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
          />
        </div>
        <div className="crop-modal__controls">
          <input type="range" min={1} max={3} step={0.05} value={zoom} onChange={e => setZoom(Number(e.target.value))} />
          <button className="btn" onClick={confirmCrop} disabled={!croppedAreaPixels}>Применить</button>
        </div>
      </div>
    )
  }

  return (
    <div className="add-art-step">
      <h2 className="add-art-step__title">Шаг 1 — Загрузите изображение</h2>
      <p className="add-art-step__hint">
        Фото при хорошем дневном освещении, без бликов. Рекомендуемое разрешение — не менее {MIN_WIDTH}×{MIN_HEIGHT} пикселей.
      </p>

      <ImageUploading value={images} onChange={handleChange} maxNumber={5} dataURLKey="data_url" maxFileSize={10485760}>
        {({ imageList, onImageUpload, onImageRemove, isDragging, dragProps }) => (
          <div className={`upload__image-wrapper${isDragging ? ' dragging' : ''}`}>
            {imageList.length === 0 ? (
              <div className="upload__image-btn" onClick={onImageUpload} {...dragProps}>
                <img className="upload__logo" src="/images/square_logo.png" alt="" />
                <strong>Кликните или перетащите изображение</strong>
                <span>JPG, PNG · до 10 МБ</span>
              </div>
            ) : (
              <div className="upload__preview-list">
                {imageList.map((img, i) => (
                  <div key={i} className="upload__preview-item">
                    <img src={croppedImages[i] || img.data_url} alt="" />
                    <div className="upload__preview-actions">
                      <button type="button" className="upload__crop-btn" onClick={() => startCrop(i)} title="Обрезать">✂</button>
                      <button type="button" className="upload__remove-btn" onClick={() => onImageRemove(i)}>×</button>
                    </div>
                  </div>
                ))}
                {imageList.length < 5 && (
                  <div className="upload__add-more" onClick={onImageUpload} {...dragProps}>+ ещё</div>
                )}
              </div>
            )}
          </div>
        )}
      </ImageUploading>

      {checking && <p className="add-art-quality add-art-quality--checking">Проверяем качество…</p>}
      {quality && (
        <div className={`add-art-quality add-art-quality--${quality.ok ? 'ok' : 'warn'}`}>
          {quality.ok
            ? `✓ Качество подходит (${quality.width}×${quality.height} px)`
            : `⚠ Низкое разрешение (${quality.width}×${quality.height} px). Рекомендуем фото получше, но можно продолжить.`}
        </div>
      )}

      <div className="add-art-step__actions">
        <button className="btn" disabled={images.length === 0} onClick={() => onNext(finalImages)}>
          Далее →
        </button>
      </div>
    </div>
  )
}

// ── Step 2: Fill details ───────────────────────────────────────────
function DetailsStep({ images, sessionJwt, userId, initialArtist, onSuccess }) {
  const [fields, setFields] = useState({ title: '', description: '', materials: '', price: '', width: '', height: '' })
  const [artist, setArtist] = useState(initialArtist || { id: null, full_name: '' })
  const [styles, setStyles] = useState([])
  const [subjects, setSubjects] = useState([])
  const [mediums, setMediums] = useState([])
  const [date, setDate] = useState(new Date())
  const [aiUsed, setAiUsed] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [aiError, setAiError] = useState('')
  const [aiSuggestions, setAiSuggestions] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [imageLoadingProcess, setImageLoadingProcess] = useState(null)
  const [errors, setErrors] = useState({})

  const set = (key) => (e) => setFields(f => ({ ...f, [key]: e.target.value }))

  const analyzeWithAI = async () => {
    setAnalyzing(true)
    setAiError('')
    try {
      const res = await fetch('/api/ai/analyze-art', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageDataUrl: images[0].data_url }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Ошибка сервера') }
      const data = await res.json()
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
    } catch (e) {
      setAiError(e.message || 'Не удалось проанализировать изображение')
    }
    setAnalyzing(false)
  }

  async function uploadImages() {
    const uploaded = []
    for (let i = 0; i < images.length; i++) {
      const fd = new FormData()
      const dataUrl = images[i].data_url
      const blob = await (await fetch(dataUrl)).blob()
      fd.append('files', blob, (images[i].file?.name) || `image_${i}.jpg`)
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
    e.preventDefault()
    const errs = {}
    if (!fields.title.trim()) errs.title = true
    if (!fields.description.trim()) errs.description = true
    if (!fields.materials.trim()) errs.materials = true
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
      setErrors(er => ({ ...er, upload: true }))
      return
    }

    const year = date.getFullYear()
    const res = await fetch(API_HOST + '/artsd', {
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
    <div className="add-art-step">
      {uploading && (
        <div className="overlay">
          <Preloader>
            <div className="preloader__text">Загружаем картину…</div>
            {imageLoadingProcess && (
              <div>изображение {Math.min(imageLoadingProcess.index + 1, imageLoadingProcess.length)} из {imageLoadingProcess.length}</div>
            )}
          </Preloader>
        </div>
      )}

      <div className="add-art-details">
        <div className="add-art-details__preview">
          <img src={images[0]?.data_url} alt="" />
          {images.length > 1 && <div className="add-art-details__more-count">+{images.length - 1} фото</div>}
        </div>

        <div className="add-art-details__form">
          <h2 className="add-art-step__title">Шаг 2 — Заполните информацию</h2>

          {!aiUsed && (
            <div className="add-art-ai-block">
              <button type="button" className="btn btn--outline add-art-ai-btn" onClick={analyzeWithAI} disabled={analyzing}>
                {analyzing ? 'Анализирую…' : '✦ Заполнить с помощью ИИ'}
              </button>
              <span className="add-art-ai-hint">Поля и категории заполнятся автоматически — один раз</span>
              {aiError && <div className="login-page__error" style={{width:'100%'}}>{aiError}</div>}
            </div>
          )}
          {aiUsed && (
            <div className="add-art-ai-used">✓ ИИ заполнил поля — проверьте и при необходимости отредактируйте</div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-input">
              <label>Название работы *</label>
              <input type="text" placeholder="Чёрный квадрат" value={fields.title} onChange={set('title')} className={errors.title ? 'input--error' : ''} />
            </div>

            <div className="form-group-input">
              <ArtistInput onArtistChange={setArtist} initialValue={initialArtist} />
              <YearInput onChange={setDate} />
            </div>

            <div className="form-group-input">
              <div className="form-input">
                <label>Материалы и техника *</label>
                <input type="text" placeholder="Холст, масло" value={fields.materials} onChange={set('materials')} className={errors.materials ? 'input--error' : ''} />
              </div>
              <div className="form-input">
                <label>Размеры, см</label>
                <div className="form-input__group">
                  <input type="number" placeholder="100" value={fields.width} onChange={set('width')} />
                  <div className="form-input__spacer">×</div>
                  <input type="number" placeholder="100" value={fields.height} onChange={set('height')} />
                </div>
              </div>
            </div>

            <div className="form-input">
              <label>Описание *</label>
              <textarea placeholder="Расскажите об этой работе…" value={fields.description} onChange={set('description')} className={errors.description ? 'input--error' : ''} rows={4} />
            </div>

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

            <div className="form-input">
              <label>Желаемая цена, ₽</label>
              <input type="number" placeholder="10000" value={fields.price} onChange={set('price')} />
            </div>

            {errors.upload && <div className="login-page__error">Ошибка загрузки изображения, попробуйте ещё раз</div>}

            <div className="add-art-step__actions">
              <button className="btn" type="submit">Отправить на модерацию</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────
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

        {step === 'upload' && (
          <UploadStep onNext={imgs => { setImages(imgs); setStep('details') }} />
        )}
        {step === 'details' && (
          <DetailsStep
            images={images}
            sessionJwt={sessionJwt}
            userId={userId}
            initialArtist={initialArtist}
            onSuccess={json => { setResult(json); setStep('success') }}
          />
        )}
        {step === 'success' && (
          <div className="form-page__sent">
            {result?.Title ? <>Работа «{result.Title}» отправлена на модерацию!</> : <>Работа отправлена на модерацию!</>}
            <button className="btn" onClick={reset} style={{ marginTop: 24 }}>Добавить ещё одну</button>
          </div>
        )}
      </div>
    </MainLayout>
  )
}

export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions)
  if (!session?.jwt) {
    return { redirect: { destination: '/auth/signin?callbackUrl=/account/add-art', permanent: false } }
  }

  let initialArtist = null
  const email = session.info?.email
  if (email) {
    try {
      const { STRAPI_SERVER_URL } = process.env
      const base = STRAPI_SERVER_URL || process.env.NEXT_PUBLIC_API_URL
      const res = await fetch(`${base}/artists?filters[email][$eqi]=${encodeURIComponent(email)}&pagination[limit]=1`, {
        headers: { Authorization: `Bearer ${session.jwt}` },
      })
      if (res.ok) {
        const data = await res.json()
        const first = data?.data?.[0]
        if (first) initialArtist = { id: first.id, full_name: first.full_name || first.attributes?.full_name || '' }
      }
    } catch {}
  }

  return { props: { sessionJwt: session.jwt, userId: session.info?.id || null, initialArtist } }
}
