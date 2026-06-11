import MainLayout from '@/components/layouts/MainLayout'
import { API_HOST } from '@/constants/constants'
import Head from 'next/head'
import { useState, useRef, useCallback, useEffect } from 'react'
import Link from 'next/link'
import ArtistInput from '@/components/input/artist-input'
import YearInput from '@/components/input/year-input'
import MultiSelectInput from '@/components/input/multi-select-input'
import Preloader from '@/components/preloader/preloader'
import { normalizeStrapiResponse } from '@/utils/strapi'
import { getSession } from '@/lib/getSession'
import imageUrlBuilder from '@/utils/img-url-builder'
import InteriorPhotoBlock from '@/components/input/interior-photo-block'

const DESC_MAX = 2000

// ── Shared UI ──────────────────────────────────────────────────────────────

function SectionCard({ title, icon, children }) {
  return (
    <div className="art-section">
      <div className="art-section__header">
        {icon && <span className="art-section__icon">{icon}</span>}
        <h3 className="art-section__title">{title}</h3>
      </div>
      <div className="art-section__body">{children}</div>
    </div>
  )
}

function Field({ label, required, error, children }) {
  return (
    <div className={`art-field${error ? ' art-field--error' : ''}`}>
      {label && (
        <label className={`art-field__label${required ? ' art-field__label--required' : ''}`}>
          {label}
        </label>
      )}
      {children}
      {error && <p className="art-field__error-msg">{error}</p>}
    </div>
  )
}

// ── Existing image row ─────────────────────────────────────────────────────

function ExistingImageThumb({ picture, onRemove }) {
  const url = picture?.formats?.medium?.url || picture?.formats?.small?.url || picture?.url
  return (
    <div className="edit-img-thumb">
      {url && <img src={imageUrlBuilder(url)} alt="" />}
      <button type="button" className="edit-img-thumb__remove" onClick={onRemove} title="Удалить фото">×</button>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function EditArt({ art, sessionJwt, documentId, isModerator }) {

  // Images
  const [existingPictures, setExistingPictures] = useState(art?.Pictures || [])
  const [newImages, setNewImages] = useState([])         // { file, data_url }[]
  const addMoreRef = useRef(null)

  // Form fields
  const [fields, setFields] = useState({
    title:       art?.Title || '',
    description: art?.Description || '',
    materials:   art?.Materials || '',
    price:       art?.Owners_price != null ? String(art.Owners_price) : '',
    width:       art?.width != null ? String(art.width) : '',
    height:      art?.height != null ? String(art.height) : '',
    depth:       art?.depth != null ? String(art.depth) : '',
  })
  const [unit, setUnit] = useState('см')
  const [artist, setArtist] = useState(
    art?.Artist ? { id: art.Artist.id, full_name: art.Artist.full_name || '' } : { id: null, full_name: '' }
  )
  const [date, setDate] = useState(art?.Year ? new Date(art.Year) : new Date())
  const [styles, setStyles]     = useState({ ids: [], custom: [] })
  const [subjects, setSubjects] = useState({ ids: [], custom: [] })
  const [mediums, setMediums]   = useState({ ids: [], custom: [] })

  const [errors, setErrors]   = useState({})
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [saveError, setSaveError] = useState('')

  // Interior photo
  const [interiorDataUrl, setInteriorDataUrl] = useState(null)
  const [interiorLoading, setInteriorLoading] = useState(false)
  const [interiorRemaining, setInteriorRemaining] = useState(null)

  useEffect(() => {
    fetch('/api/ai/generate-interior')
      .then(r => r.json())
      .then(d => { if (d?.remaining !== undefined) setInteriorRemaining(d.remaining) })
      .catch(() => {})
  }, [])

  const set = key => e => setFields(f => ({ ...f, [key]: e.target.value }))
  const descLen = fields.description.length

  // Use documentId for matching (works regardless of draft/published entity ID)
  const initialStyleDocIds   = (art?.styles   || []).map(s => s.documentId).filter(Boolean)
  const initialSubjectDocIds = (art?.subjects || []).map(s => s.documentId).filter(Boolean)
  const initialMediumDocIds  = (art?.mediums  || []).map(s => s.documentId).filter(Boolean)

  const handleAddMore = async (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    const imgs = await Promise.all(files.map(f => new Promise(res => {
      const reader = new FileReader()
      reader.onload = ev => res({ file: f, data_url: ev.target.result })
      reader.readAsDataURL(f)
    })))
    setNewImages(prev => [...prev, ...imgs].slice(0, Math.max(0, 5 - existingPictures.length)))
    e.target.value = ''
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

  const handleSubmit = useCallback(async () => {
    const errs = {}
    if (!fields.title.trim())       errs.title       = 'Укажите название'
    if (!fields.description.trim()) errs.description = 'Добавьте описание'
    if (!fields.materials.trim())   errs.materials   = 'Укажите материалы'
    if (!fields.width)              errs.width       = 'Укажите ширину'
    if (!fields.height)             errs.height      = 'Укажите высоту'
    if (!fields.price)              errs.price       = 'Укажите цену'
    if (Object.keys(errs).length) {
      setErrors(errs)
      setTimeout(() => document.querySelector('.art-field--error')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0)
      return
    }

    setSaving(true)
    setSaveError('')

    try {
      // 1. Upload new images
      const uploaded = []
      for (const img of newImages) {
        const fd = new FormData()
        const blob = await (await fetch(img.data_url)).blob()
        fd.append('files', blob, img.file?.name || 'image.jpg')
        const res = await fetch(API_HOST + '/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${sessionJwt}` },
          body: fd,
        })
        const data = normalizeStrapiResponse(await res.json())
        const first = Array.isArray(data) ? data[0] : data
        if (first?.id) uploaded.push(first.id)
      }

      // 2. Create artist if needed
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

      // 3. Upload interior photo if newly generated
      let interiorPhotoId = art?.interior_photo?.id || null
      if (interiorDataUrl && interiorDataUrl.startsWith('data:')) {
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
      }

      // 5. Build payload
      const allPictureIds = [
        ...existingPictures.map(p => p.id),
        ...uploaded,
      ]
      const year = date.getFullYear()
      const data = {
        Title:        fields.title,
        Description:  fields.description,
        Materials:    fields.materials,
        Owners_price: parseInt(fields.price) || 0,
        width:        fields.width  || null,
        height:       fields.height || null,
        Year:         `${year}-01-01`,
        styles:       styles.ids,
        subjects:     subjects.ids,
        mediums:      mediums.ids,
        Pictures:     allPictureIds,
      }
      if (artistId) data.Artist = artistId
      if (interiorPhotoId) data.interior_photo = interiorPhotoId

      // 6. PUT
      const res = await fetch(`${API_HOST}/arts/${documentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionJwt}` },
        body: JSON.stringify({ data }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json?.error?.message || `HTTP ${res.status}`)
      }
      setSaved(true)
    } catch (e) {
      setSaveError(e.message || 'Ошибка сохранения')
    }
    setSaving(false)
  }, [fields, artist, date, styles, subjects, mediums, existingPictures, newImages, sessionJwt, documentId])

  if (!art) {
    return (
      <MainLayout>
        <div className="add-art-page edit-art-page">
          <p>Работа не найдена.</p>
          <Link href="/account/my-arts">← Мои работы</Link>
        </div>
      </MainLayout>
    )
  }

  if (saved) {
    return (
      <MainLayout>
        <Head><title>Изменения сохранены | Стена с картинами</title></Head>
        <div className="add-art-page edit-art-page">
          <div className="edit-art-saved">
            <div className="edit-art-saved__icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            </div>
            <h2>Изменения сохранены</h2>
            <p>Работа отправлена на повторную модерацию.</p>
            <div className="edit-art-saved__actions">
              <Link href="/account/my-arts" className="art-btn art-btn--primary">Мои работы</Link>
              <button className="art-btn art-btn--ghost" onClick={() => setSaved(false)}>
                Редактировать ещё
              </button>
            </div>
          </div>
        </div>
      </MainLayout>
    )
  }

  const canAddMore = existingPictures.length + newImages.length < 5

  return (
    <MainLayout>
      <Head><title>Редактировать — {art.Title} | Стена с картинами</title></Head>

      {saving && (
        <div className="overlay">
          <Preloader><div className="preloader__text">Сохраняем…</div></Preloader>
        </div>
      )}

      <div className="add-art-page edit-art-page">
        <div className="edit-art-page__header">
          <Link href="/account/my-arts" className="edit-art-page__back">← Мои работы</Link>
          <h1>Редактировать работу</h1>
        </div>

        <div className="details-step" style={{ paddingBottom: '80px' }}>
          {/* ── Left: images ── */}
          <div className="art-preview-hero">
            <input ref={addMoreRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleAddMore} />

            {/* Existing images */}
            {existingPictures.length > 0 && (
              <div className="edit-img-main">
                {(() => {
                  const url = existingPictures[0]?.formats?.medium?.url || existingPictures[0]?.formats?.small?.url || existingPictures[0]?.url
                  return url ? <img src={imageUrlBuilder(url)} alt={art.Title} /> : null
                })()}
              </div>
            )}
            {newImages.length > 0 && existingPictures.length === 0 && (
              <div className="edit-img-main">
                <img src={newImages[0].data_url} alt="" />
              </div>
            )}

            {/* Thumbnail grid */}
            <div className="edit-img-thumbs">
              {existingPictures.map(pic => (
                <ExistingImageThumb
                  key={pic.id}
                  picture={pic}
                  onRemove={() => setExistingPictures(prev => prev.filter(p => p.id !== pic.id))}
                />
              ))}
              {newImages.map((img, i) => (
                <div key={`new-${i}`} className="edit-img-thumb">
                  <img src={img.data_url} alt="" />
                  <button type="button" className="edit-img-thumb__remove" onClick={() => setNewImages(prev => prev.filter((_, j) => j !== i))}>×</button>
                </div>
              ))}
              {canAddMore && (
                <div className="edit-img-thumb edit-img-thumb--add" onClick={() => addMoreRef.current?.click()}>
                  + фото
                </div>
              )}
            </div>
          </div>

          {/* ── Right: form ── */}
          <form className="details-form" onSubmit={e => { e.preventDefault(); handleSubmit() }}>

            <SectionCard title="Информация о работе" icon="🎨">
              <Field label="Название" required error={errors.title}>
                <input type="text" placeholder="Название работы" value={fields.title} onChange={set('title')} />
              </Field>
              <div className="art-fields-row">
                <Field required error={errors.artist}>
                  <ArtistInput onArtistChange={setArtist} initialValue={artist} />
                </Field>
                <YearInput onChange={setDate} initialDate={art.Year} />
              </div>
            </SectionCard>

            <SectionCard title="Физические характеристики" icon="📐">
              <Field label="Материалы и техника" required error={errors.materials}>
                <input type="text" placeholder="Холст, масло" value={fields.materials} onChange={set('materials')} />
              </Field>
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
                  <span className="dimensions-row__label">Глубина <span className="dimensions-row__optional">(необяз.)</span></span>
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
            </SectionCard>

            <SectionCard title="Описание" icon="✏️">
              <Field label="О работе" required error={errors.description}>
                <div className="art-textarea-wrap">
                  <textarea
                    placeholder="Расскажите историю этой работы…"
                    value={fields.description}
                    onChange={set('description')}
                    rows={5}
                    maxLength={DESC_MAX}
                  />
                  <span className={`art-char-counter${descLen > DESC_MAX * 0.9 ? ' art-char-counter--warn' : ''}${descLen >= DESC_MAX ? ' art-char-counter--over' : ''}`}>
                    {descLen} / {DESC_MAX}
                  </span>
                </div>
              </Field>
            </SectionCard>

            <SectionCard title="Классификация" icon="🏷️">
              <MultiSelectInput endpoint="styles"   label="Стиль"   onChange={setStyles}   initialDocumentIds={initialStyleDocIds} />
              <MultiSelectInput endpoint="subjects" label="Теги"    onChange={setSubjects} initialDocumentIds={initialSubjectDocIds} />
              <MultiSelectInput endpoint="mediums"  label="Техника" onChange={setMediums}  initialDocumentIds={initialMediumDocIds} titleField="title" />
            </SectionCard>

            {isModerator && (
              <SectionCard title="Фото в интерьере" icon="🛋️">
                <InteriorPhotoBlock
                  dataUrl={interiorDataUrl || (art?.interior_photo ? imageUrlBuilder(art.interior_photo.formats?.medium?.url || art.interior_photo.url) : null)}
                  loading={interiorLoading}
                  remaining={interiorRemaining}
                  onGenerate={generateInterior}
                  onRemove={() => setInteriorDataUrl('removed')}
                />
              </SectionCard>
            )}

            <SectionCard title="Цена" icon="💰">
              <Field label="Желаемая цена, ₽" required error={errors.price}>
                <input type="number" placeholder="15000" value={fields.price} onChange={set('price')} min="0" />
              </Field>
            </SectionCard>

            {saveError && <div className="art-error-banner">{saveError}</div>}
          </form>
        </div>

        {/* Action bar */}
        <div className="art-action-bar">
          <div className="art-action-bar__inner">
            <div className="art-action-bar__secondary">
              <Link href="/account/my-arts" className="art-btn art-btn--ghost">← Отмена</Link>
            </div>
            <div className="art-action-bar__primary">
              <button type="button" className="art-btn art-btn--primary" onClick={handleSubmit} disabled={saving}>
                {saving ? 'Сохраняем…' : 'Сохранить изменения →'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}

export async function getServerSideProps(context) {
  const { documentId } = context.params
  const session = await getSession(context.req, context.res)

  if (!session?.jwt) {
    return { redirect: { destination: '/auth/signin?callbackUrl=/account/my-arts', permanent: false } }
  }

  try {
    const base = process.env.STRAPI_SERVER_URL || process.env.NEXT_PUBLIC_API_URL
    const res = await fetch(`${base}/arts/my/${documentId}`, {
      headers: { Authorization: `Bearer ${session.jwt}` },
    })
    if (!res.ok) {
      return { redirect: { destination: '/account/my-arts', permanent: false } }
    }
    const json = await res.json()
    const art = json?.data || null
    return { props: { art, sessionJwt: session.jwt, documentId, isModerator: !!session.info?.isModerator } }
  } catch {
    return { redirect: { destination: '/account/my-arts', permanent: false } }
  }
}
