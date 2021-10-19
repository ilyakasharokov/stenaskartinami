import Head from 'next/head'
import Link from 'next/link'
import MainLayout from "@/components/layouts/MainLayout"
import { API_HOST, FREE_ID } from '@/constants/constants';
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
        <AddFavorite art={art}></AddFavorite>
      </div>
      <div className="art-page__grid">
        <ImagesGallery images={art.Pictures}></ImagesGallery>
        <div className="art-page__right">
          <div className="art-page__info">
            <div className="art-page__info-title">{art.Title}</div>
            <div className="art-page__info-author">
              <Link href={ '/artists/' + art.Artist.slug + '--' + art.Artist.id}>
                <a title={art.Artist.full_name}>{art.Artist.full_name}</a>
              </Link> 
            </div>
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
            </div>
            <BuyBlock art={art}></BuyBlock>
          </div>
          {
            <BuyPoster art={art}></BuyPoster>
          }
          {
            art.wall && art.wall.id !== FREE_ID &&
            <div className="art-page__wall-block">
              <div className="art-page__wall-block-text">
                Картина находится на стене в <Link href={ '/walls/' + art.wall.slug + '--' + art.wall.id }><a>{ art.wall.Title }</a></Link>
              </div>
              {
                art.wall.Coordinates && 
                <YMaps>
                  <Map defaultState={art.wall.Coordinates} style={{width: '100%', height: '200px'}} >
                    <ZoomControl/>
                    <Placemark geometry={art.wall.Coordinates.center} options={{ iconLayout: 'default#image', iconImageHref: '/images/Logo_stenaskartinami_black_sqr.svg', iconImageSize: [30, 30], iconImageOffset: [-15, -15]}} />
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
            <Link href={ '/artists/' + artist.slug + '--' + artist.id}><a title={artist.full_name}>Перейти в каталог работ художника</a></Link> 
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
      <Link href={ '/catalog/?styles=' + style.slug}><a title={`Перейти в каталог работ в стиле ${style.Title.toLowerCase()}`}>Перейти в каталог работ в стиле {style.Title.toLowerCase()}</a></Link> 
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
  const res = await fetch(API_HOST + '/arts/')
  const json = await res.json()
  return {
    paths: json.map(item => { 
      return {params: { slug: item.slug + '--' + item.id }}
  }),
    fallback: true
  }
}

export const getStaticProps = async ({params: {
  slug
}}) => {
  
  let id = slug.split('--')[1]
  // console.log(id)
  let res = await fetch(API_HOST + '/arts/' + id);
  let json;
  try {
    json = await res.json()
  }catch(e){
    console.error(e);
    return {
      notFound: true,
    }
  }

  if(!json || json && !json.id){
    return {
      notFound: true,
    }
  }

  const art = json;



  let artist = null;
  res = await fetch(API_HOST + '/artists/' + art.Artist.id)
  json = await res.json()
  artist = json;
  artist.Arts = artist.Arts.sort((a,b)=> {
    return a.published_at < b.published_at ? 1: -1;
  }).filter((aa)=>aa.id !== art.id).slice(0, 4)

  let style = art.styles && art.styles[0] ? art.styles[0] : null;
  let styleArts = [];
  if(style){
    res = await fetch(API_HOST + '/arts?styles.id=' + style.id)
    json = await res.json()
    styleArts = json.sort((a,b)=> {
      return a.published_at < b.published_at ? 1: -1;
    }).filter((_art)=> _art.id !== art.id && !artist.Arts.find((aa) => aa.id === _art.id)).slice(0, 4); 
  }


  return {
    props: {
      art,
      style,
      styleArts,
      artist
    },
    revalidate: 60, // In seconds
  }
}
