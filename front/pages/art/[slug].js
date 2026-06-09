import Head from 'next/head'
import Link from 'next/link'
import MainLayout from "@/components/layouts/MainLayout"
import { API_HOST, FREE_ID } from '@/constants/constants';
import { fetchStrapi } from '@/utils/strapi';
import serialize from '@/utils/serialize';
import { YMaps, Map, Placemark, ZoomControl } from 'react-yandex-maps';
import BuyBlock from '@/components/art/buy-block';
import ImagesGallery from '@/components/art/image-gallery'
import AddFavorite from '@/components/art/add-favorite';
import Preloader from '@/components/preloader/preloader'
import ProductListStatic from '@/components/catalog/product-list-static';
import BuyPoster from '@/components/art/buy-poster';

export default function Art({ art, style, styleArts, artist }) {

  // console.log(art)
  return (<MainLayout>
    <Head>
      <title>{art?.Title}, картина художника {art?.Artist?.full_name} | Стена с картинами, облачная галерея</title>
    </Head>
    { 
    art &&
    <div className="art-page">
      <div className="art-page__header">
        <h1>"{art.Title}"{ art.Artist && ', ' + art.Artist.full_name}</h1>
        {
          (art.publishedAt || art.published_at) &&
          <AddFavorite art={art}></AddFavorite>
        }
        {
           !(art.publishedAt || art.published_at) &&
           <div>(на модерации)</div>
        }
      </div>
      <div className="art-page__grid">
        <ImagesGallery images={art.Pictures}></ImagesGallery>
        <div className="art-page__right">
          <div className="art-page__info">
            <div className="art-page__info-title">{art.Title}</div>
            {art.Artist && (
              <div className="art-page__info-author">
                <Link href={ '/artists/' + art.Artist.slug + '--' + art.Artist.id} title={art.Artist.full_name}>
                  {art.Artist.full_name}
                </Link>
                {
                  art.Year && 
                  <span>, {new Date(art.Year).getFullYear()}</span>
                }
              </div>
            )}
            <div className="art-page__info-blocks">
              { 
                art.width && art.height &&
                <div className="art-page__info-size">Размеры: { art.width } x { art.height } </div>
              }
              {
                art.Materials && 
                <div className="art-page__info-materials">Техника: {art.Materials}</div>
              }
              { 
                art.Description && art.Description.length > 5 &&
                <div className="art-page__description" dangerouslySetInnerHTML={{
                  __html: art.Description
                }}>
                </div>
              }
              {(() => {
                const publishedAt = art.publishedAt || art.published_at;
                if (!publishedAt) return null;
                return (
                  <div className="art-page__published-at">
                    Дата публикации: { new Date(publishedAt).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'numeric',
                      year: 'numeric',
                    })}
                  </div>
                );
              })()}
            </div>
            {
            (art.publishedAt || art.published_at) &&
              <BuyBlock art={art}></BuyBlock>
            }   
          </div>
          { (art.publishedAt || art.published_at) && <BuyPoster art={art}></BuyPoster> }
          {
            art.wall && art.wall.id !== FREE_ID &&
            <div className="art-page__wall-block">
              <div className="art-page__wall-block-text">
                Картина находится на стене в <Link href={ '/walls/' + art.wall.slug + '--' + art.wall.id }>{ art.wall.Title }</Link>
              </div>
              {
                art.wall.Coordinates && 
                <YMaps>
                  <Map defaultState={art.wall.Coordinates} style={{width: '100%', height: '200px'}} >
                    <ZoomControl/>
                    <Placemark geometry={art.wall.Coordinates.center} options={{ iconLayout: 'default#image', iconImageHref: '/images/mapicon.png', iconImageSize: [40, 40], iconImageOffset: [-20, -20]}} />
                  </Map>
                </YMaps>
              }
            </div>
          }
        </div>
      </div>
      {
        artist && artist.Arts.length > 0 &&
        <div>
          <h2>Другие работы художника</h2>
          <ProductListStatic arts={artist.Arts}></ProductListStatic>
          {
            artist.Arts.length === 4 &&
          <div className="product-list__link">
            <Link href={ '/artists/' + artist.slug + '--' + artist.id} title={artist.full_name}>Перейти в каталог работ художника</Link>
          </div>
          } 
        </div>
      }
      {
        styleArts && style &&
        <div>
          <h2>Работы в стиле { style.Title.toLowerCase() }</h2>
          <ProductListStatic arts={styleArts}></ProductListStatic>
          <div className="product-list__link">
      <Link href={ '/catalog/?styles=' + style.slug} title={`Перейти в каталог работ в стиле ${style.Title.toLowerCase()}`}>Перейти в каталог работ в стиле {style.Title.toLowerCase()}</Link>
          </div>
        </div>
      }
    </div>
    }
    {
      !art && 
      <div className="overlay">
      <Preloader></Preloader>
    </div>
    }
  </MainLayout>
  )
}

/*
Art.getInitialProps = async ({query}) => {
  let id = query.slug.split('--')[1]
  console.log(id)
  const res = await fetch(API_HOST + '/arts/' + id)
  const json = await res.json()
  const art = json;
  return { art: art }
}
*/

export async function getStaticPaths() {
  try {
    const json = await fetchStrapi(
      API_HOST + '/arts' + serialize({ populate: ['Pictures', 'Artist'] })
    )
    const arts = Array.isArray(json) ? json : []
    return {
      paths: arts.map(item => ({ params: { slug: item.slug + '--' + item.id } })),
      fallback: 'blocking',
    }
  } catch {
    return { paths: [], fallback: 'blocking' }
  }
}

export const getStaticProps = async ({params: { slug }}) => {
  try {
  let id = slug.split('--')[1]
  let json = await fetchStrapi(
    API_HOST + '/arts/all/' + id + serialize({ populate: 'deep,2' })
  )

  if (!json || !json.id) {
    return { notFound: true }
  }

  const art = json

  let artist = null
  if (art?.Artist?.id) {
    artist = await fetchStrapi(API_HOST + '/artists/' + art.Artist.id + '?populate=deep,2')
    if (artist && Array.isArray(artist.Arts)) {
      artist.Arts = artist.Arts.sort((a, b) => {
        const aPublished = a.publishedAt || a.published_at
        const bPublished = b.publishedAt || b.published_at
        return aPublished < bPublished ? 1 : -1
      }).filter((aa) => aa.id !== art.id).slice(0, 4)
    } else if (artist) {
      artist.Arts = []
    }
  }

  let style = art.styles && art.styles[0] ? art.styles[0] : null
  let styleArts = []
  if (style) {
    json = await fetchStrapi(
      API_HOST +
        `/arts?filters[styles][id][$eq]=${style.id}&populate[0]=Pictures&populate[1]=Artist`
    )
    const styleList = Array.isArray(json) ? json : []
    const artistArts = artist?.Arts || []
    styleArts = styleList.sort((a, b) => {
      const aPublished = a.publishedAt || a.published_at
      const bPublished = b.publishedAt || b.published_at
      return aPublished < bPublished ? 1 : -1
    }).filter((_art) => _art.id !== art.id && !artistArts.find((aa) => aa.id === _art.id)).slice(0, 4)
  }

  return {
    props: { art, style, styleArts, artist },
    revalidate: 60,
  }
  } catch {
    return { notFound: true }
  }
}
