import MainLayout from "@/components/layouts/MainLayout"
import { API_HOST } from "@/constants/constants"
import Head from 'next/head'
import { useState, useRef, useCallback } from "react"
import ImageUploading from "react-images-uploading"
import ArtistInput from "@/components/input/artist-input"
import YearInput from "@/components/input/year-input"
import Preloader from "@/components/preloader/preloader"
import StylesInput from "@/components/input/styles-input"
import { normalizeStrapiResponse } from "@/utils/strapi"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import Link from "next/link"

export default function AddArt({ sessionJwt, userId }) {
  const [images, setImages] = useState([])
  const [artist, setArtist] = useState({ id: null, name: '' })
  const [styles, setStyles] = useState([])
  const [date, setDate] = useState(new Date())
  const [errors, setErrors] = useState({})
  const [uploading, setUploading] = useState(false)
  const [loaded, setLoaded] = useState(null)
  const [imageLoadingProcess, setImageLoadingProcess] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState(null)
  const formRef = useRef(null)

  const onImagesChange = useCallback((imageList) => {
    setImages(imageList)
    setErrors(e => ({ ...e, imageUploadError: false }))
  }, [])

  const analyzeWithAI = async () => {
    if (!images[0]?.data_url) return
    setAnalyzing(true)
    try {
      const res = await fetch('/api/ai/analyze-art', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageDataUrl: images[0].data_url }),
      })
      if (res.ok) {
        const data = await res.json()
        setAiSuggestions(data)
        if (formRef.current) {
          if (data.title) formRef.current.elements.Title.value = data.title
          if (data.description) formRef.current.elements.Description.value = data.description
          if (data.materials) formRef.current.elements.Materials.value = data.materials
        }
      }
    } catch {}
    setAnalyzing(false)
  }

  async function postArtist(e, artist) {
    const data = new FormData(e.target)
    const res = await fetch(API_HOST + '/artists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: {
          full_name: artist.full_name,
          description: data.get("Artist_description"),
        },
      }),
    })
    const json = await res.json()
    return normalizeStrapiResponse(json)
  }

  async function uploadImages(imgs) {
    const uploaded = []
    for (let i = 0; i < imgs.length; i++) {
      const fd = new FormData()
      fd.append('files', imgs[i].file, imgs[i].file.name)
      setImageLoadingProcess({ index: i, length: imgs.length })
      const res = await fetch(API_HOST + '/upload', { method: 'POST', body: fd })
      const image = normalizeStrapiResponse(await res.json())
      const first = Array.isArray(image) ? image[0] : image
      if (first) uploaded.push(first)
    }
    setImageLoadingProcess({ index: imgs.length, length: imgs.length })
    return uploaded
  }

  async function submitForm(e) {
    e.preventDefault()
    if (images.length === 0) {
      setErrors(er => ({ ...er, imageUploadError: true }))
      return
    }
    setUploading(true)

    if (!artist.id) {
      const uploadedArtist = await postArtist(e, artist)
      if (uploadedArtist?.id) {
        artist.id = uploadedArtist.id
        setArtist({ id: uploadedArtist.id, full_name: uploadedArtist.full_name })
      }
    }

    const imagesUploaded = await uploadImages(images)
    if (!imagesUploaded[0]?.id) {
      setUploading(false)
      setErrors(er => ({ ...er, imageUploadError: true }))
      return
    }

    const data = new FormData(e.target)
    const ownersPrice = parseInt(data.get("Owners_price")) || 0

    const art = {
      Title: data.get("Title"),
      Description: data.get("Description"),
      Articul: "",
      Artist: artist.id,
      Year: date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0'),
      Materials: data.get("Materials"),
      Owners_price: ownersPrice,
      width: data.get("width"),
      height: data.get("height"),
      styles,
      user_uploader: userId,
      Pictures: imagesUploaded.map(p => p.id),
    }

    const res = await fetch(API_HOST + '/artsd', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionJwt}`,
      },
      body: JSON.stringify(art),
    })
    const json = normalizeStrapiResponse(await res.json())
    setUploading(false)
    setLoaded(json)
  }

  function resetForm() {
    setLoaded(null)
    setImages([])
    setAiSuggestions(null)
    if (formRef.current) formRef.current.reset()
  }

  if (loaded?.Title) {
    return (
      <MainLayout>
        <div className="form-page">
          <div className="form-page__sent">
            Спасибо! Работа «{loaded.Title}» добавлена в очередь на модерацию, скоро появится на сайте!
            <button className="btn" onClick={resetForm}>Добавить ещё одну</button>
          </div>
        </div>
      </MainLayout>
    )
  }

  if (loaded && !loaded.Title) {
    return (
      <MainLayout>
        <div className="form-page">
          <div className="form-page__sent">
            Упс, произошла непредвиденная ошибка :(
            <button className="btn" onClick={resetForm}>Попробовать заново</button>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <Head>
        <title>Добавить картину | Стена с картинами</title>
      </Head>
      <div className="form-page add-art-page">
        {uploading && (
          <div className="overlay">
            <Preloader>
              <div className="preloader__text">Загружаем картину…</div>
              {imageLoadingProcess && (
                <div>
                  (изображения: {imageLoadingProcess.index === imageLoadingProcess.length
                    ? imageLoadingProcess.index
                    : imageLoadingProcess.index + 1} из {imageLoadingProcess.length})
                </div>
              )}
            </Preloader>
          </div>
        )}

        <h1>Добавить картину</h1>
        <div className="form-page__wrapper">
          <form ref={formRef} onSubmit={submitForm}>

            <div className="form-group-input">
              <div className="form-input">
                <label>Название работы</label>
                <input type="text" name="Title" placeholder="Чёрный квадрат" required />
              </div>
              <YearInput onChange={setDate} />
            </div>

            <div className="form-group-input">
              <ArtistInput onArtistChange={setArtist} />
              <div className="form-input">
                <label>Размеры (см)</label>
                <div className="form-input__group">
                  <input type="number" name="width" placeholder="100" required />
                  <div className="form-input__spacer">×</div>
                  <input type="number" name="height" placeholder="100" required />
                </div>
              </div>
            </div>

            {artist?.full_name && artist.id === null && (
              <div className="form-input">
                <label>Об авторе</label>
                <textarea name="Artist_description" placeholder="Краткая биография, творческий путь, участие в выставках…" required />
              </div>
            )}

            <h3>Загрузите изображения</h3>
            <p>Качественные фотографии при хорошем дневном освещении.
              Чем качественнее фото, тем выше вероятность публикации.</p>

            <ImageUploading
              multiple
              value={images}
              onChange={onImagesChange}
              maxNumber={5}
              dataURLKey="data_url"
              imgExtension={['.jpg', '.png']}
              maxFileSize={5242880}
            >
              {({ imageList, onImageUpload, onImageRemove, isDragging, dragProps }) => (
                <div className={`upload__image-wrapper${errors.imageUploadError ? ' error' : ''}`}>
                  <div
                    className="upload__image-btn"
                    onClick={onImageUpload}
                    {...dragProps}
                  >
                    <img className="upload__logo" src="/images/square_logo.png" alt="" />
                    <strong>Кликните или перетащите изображение</strong>
                    <span>(.jpg, .png, до 5 МБ)</span>
                    {imageList.length > 0 && (
                      <div className="upload__images-list">
                        {imageList.map((image, index) => (
                          <div key={index} className="image-item">
                            <img src={image.data_url} alt="" width="100" />
                            <div className="image-item__btn-wrapper">
                              <button type="button" onClick={e => { e.stopPropagation(); onImageRemove(index) }}>×</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </ImageUploading>

            {images.length > 0 && (
              <div style={{ margin: '8px 0 16px' }}>
                <button
                  type="button"
                  className="btn btn--outline"
                  onClick={analyzeWithAI}
                  disabled={analyzing}
                >
                  {analyzing ? 'Анализирую…' : '✦ Определить стиль и заполнить поля с помощью ИИ'}
                </button>
                {aiSuggestions && (
                  <div className="ai-suggestions">
                    <strong>ИИ предложил:</strong>
                    {aiSuggestions.style && <span> стиль: {aiSuggestions.style};</span>}
                    {aiSuggestions.subject && <span> тематика: {aiSuggestions.subject}</span>}
                  </div>
                )}
              </div>
            )}

            <div className="form-input">
              <label>Описание и история работы</label>
              <textarea name="Description" placeholder="Напишите об этой работе, её истории, вдохновении…" required />
            </div>

            <div className="form-group-input">
              <div className="form-input">
                <label>Материалы и техника</label>
                <input type="text" name="Materials" placeholder="Холст, масло" required />
              </div>
              <div className="form-input">
                <label>Желаемая цена (₽)</label>
                <input type="number" name="Owners_price" placeholder="10000" required />
              </div>
            </div>

            <div className="form-group-input">
              <StylesInput onStylesChange={setStyles} />
            </div>

            <div className="align-right">
              <button className="btn" type="submit">Отправить на модерацию</button>
            </div>
          </form>
        </div>
      </div>
    </MainLayout>
  )
}

export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions)
  if (!session?.jwt) {
    return { redirect: { destination: '/auth/signin?callbackUrl=/account/add-art', permanent: false } }
  }
  return {
    props: {
      sessionJwt: session.jwt,
      userId: session.info?.id || null,
    },
  }
}
