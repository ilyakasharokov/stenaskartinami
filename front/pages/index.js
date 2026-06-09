import Head from 'next/head'
import Link from 'next/link'
import MainLayout from '@/components/layouts/MainLayout'
import { API_HOST } from "@/constants/constants"
import imageUrlBuilder from '@/utils/img-url-builder'
import { useState } from 'react'
import serialize from '@/utils/serialize'
import { fetchStrapi } from '@/utils/strapi'
import ProductListStatic from '@/components/catalog/product-list-static'
import { YMaps, Map, Placemark, ZoomControl } from 'react-yandex-maps';

export default function Home({slides, walls, arts, marquee}) {

  const [ currentSlide, setSlide ] = useState(0); 

  function next(){
    if(currentSlide === slides.length - 1){
      setSlide(0)
    }else{
      setSlide(currentSlide+1)
    }
  }

  function prev(){
    if(currentSlide === 0){
      setSlide(slides.length - 1)
    }else{
      setSlide(currentSlide - 1)
    }
  }

  
  return (
    <MainLayout>
      <Head>
        <title>Картины: купить искусство онлайн | Стена с картинами, облачная галерея</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="index-page">
        {
          slides && 
          <div className="index-slider">
            <div className="index-slider__slide-wrapper">
              {
                slides.map((slide, i) => 
                    <div className={`index-slider__slide ${i === currentSlide ? 'active':''}`} key={i}>
                      <div className="index-slider__background">
                        {slide?.image?.url && <img src={imageUrlBuilder(slide.image.url)}/>}
                      </div>
                      <div className="index-slider__overlay">
                        <div className="index-slider__block">
                          <div className="index-slider__title">{ slide.title }</div>
                          <div className="index-slider__text">{ slide.text }</div>
                          {
                            slide.button &&
                            <a href={ slide.link } className="btn">{slide.button}</a>
                          }
                        </div>
                      </div>
                    </div>
                  
                )
              }
              {
                slides.length > 1 && 
                <div>
                  <div className="index-slider__arrow index-slider__left" onClick={()=>prev()}>
                    <svg viewBox="0 0 22 40" xmlns="http://www.w3.org/2000/svg"><path d="M21 0L1 20l20 20" stroke="#fff" fill="none"></path></svg>
                  </div>
                  <div className="index-slider__arrow index-slider__right" onClick={()=>next()}>
                    <svg viewBox="0 0 22 40" xmlns="http://www.w3.org/2000/svg"><path d="M1 0l20 20L1 40" stroke="#fff" fill="none"></path></svg>
                  </div>
                </div>
              }
            </div>
          </div>
        }
        {
          marquee?.text &&
          <div className="index-page__marquee">
            <div className="marquee-new">
              <div className="marquee__first-half">
                {marquee.text}
              </div>
              <div className="marquee__second-half">
              {marquee.text}
              </div>
            </div>
          </div>
        }   

        <div className="index-page__last-arts">
        {
          arts && 
          <div>
            <h2>Последние добавленные работы</h2>
            <ProductListStatic arts={arts.slice(0, 8)}></ProductListStatic>
            <div className="index-page__last-arts-link">
              <Link href="/catalog">
                <a className="btn">Перейти в каталог</a>
              </Link>
            </div>
          </div>
        }
        </div>

        {
          marquee?.text &&
          <div className="index-page__marquee">
            <div className="marquee-new">
              <div className="marquee__first-half">
                {marquee.text}
              </div>
              <div className="marquee__second-half">
              {marquee.text}
              </div>
            </div>
          </div>
        }   

        {
          walls &&
          <div className="index-page__map">
            <h2>Стены на карте</h2>
            <YMaps>
              <Map defaultState={{"center":[58.456994503197755,35.370069459975745],"zoom":5}} style={{width: '100%', height: '400px'}} >
              <ZoomControl/>
              {
                walls.map( (wall, i) =>
                  wall.Coordinates &&
                  <Placemark key={i} geometry={wall.Coordinates.center} options={{ iconLayout: 'default#image', iconImageSize: [40, 40], iconImageOffset: [-20, -20], iconImageHref: '/images/mapicon.png' }}
                    properties={{ iconContent: 1, balloonContentHeader: wall.Title, iconContent: "<div>test</div>",
                    balloonContentBody: wall.Address,
                    balloonContentFooter: `<a href="${'/walls/' + wall.slug + '--' + wall.id }">Перейти</a>`}} modules={['geoObject.addon.balloon', 'geoObject.addon.hint', 'layout.ImageWithContent']}/>
                )
              }
              </Map>
            </YMaps>
            <Link href="/add-wall">
                <a href='/add-wall' className="btn">Добавить стену</a>
              </Link>
          </div>
        }
        
      </div>
    </MainLayout>
  )
}

// getServerSideProps so content is fetched when API is available (no empty build)
export const getServerSideProps = async () => {
  try {
    let json = await fetchStrapi(
      API_HOST +
        '/slides' +
        serialize({ populate: ['image'], populateDefaults: [] })
    )
    const slides = json && json.sort && json.sort((a,b)=> {
      return a.updatedAt < b.updatedAt ? 1: -1;
    }) || [];
    json = await fetchStrapi(
      API_HOST +
        '/walls' +
        serialize({
          populate: {
            Images: true,
            arts: {
              populate: ['Pictures', 'Artist', 'styles', 'subjects', 'mediums', 'wall'],
            },
          },
          populateDefaults: [],
        })
    )
    const walls = Array.isArray(json) ? json : []
    walls.forEach((wall) => {
      const wallArts = Array.isArray(wall.arts) ? wall.arts : []
      wall.arts = wallArts.sort((a, b) => {
        const aPublished = a.publishedAt || a.published_at;
        const bPublished = b.publishedAt || b.published_at;
        return aPublished < bPublished ? 1 : -1;
      });
    });
    const query = {
      _start: 0,
      _limit: 8,
      main: true,
      populate: ['Pictures', 'Artist', 'styles', 'subjects', 'mediums', 'wall'],
    };
    json = await fetchStrapi(API_HOST + '/arts' + serialize(query))
    const list = Array.isArray(json) ? json : []
    const arts = list.sort((a,b)=> {
      const aPublished = a.publishedAt || a.published_at;
      const bPublished = b.publishedAt || b.published_at;
      return aPublished < bPublished ? 1: -1;
    })
    json = await fetchStrapi(API_HOST + '/marquee')
    const marquee = json;
    return {
      props: {
        slides,
        walls,
      arts,
      marquee
    },
  }
  } catch {
    return {
      props: { slides: [], walls: [], arts: [], marquee: null },
    }
  }
}
