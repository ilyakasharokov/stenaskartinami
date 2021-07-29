import Head from 'next/head'
import Link from 'next/link'
import MainLayout from '@/components/layouts/MainLayout'
import { API_HOST } from "@/constants/constants"
import { useState } from 'react'
import serialize from '@/utils/serialize'
import ProductListStatic from '@/components/catalog/product-list-static'
import { YMaps, Map, Placemark, ZoomControl } from 'react-yandex-maps';

export default function Home({slides, walls, arts}) {

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
                        <img src={API_HOST + slide.image.url}/>
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

        <div className="index-page__marquee">
          <div className="marquee-new">
            <div className="marquee__first-half">
              29 июля - 11 августа Открыта экспозиция в санкт - Петербурге в книжном  магазине «Во весь голос» ул. Маяковского 19 &nbsp;&nbsp;&nbsp; 
            </div>
            <div className="marquee__second-half">
              29 июля - 11 августа Открыта экспозиция в санкт - Петербурге в книжном  магазине «Во весь голос» ул. Маяковского 19 &nbsp;&nbsp;&nbsp; 
            </div>
          </div>
        </div>   

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

        <div className="index-page__marquee">
          <div className="marquee-new">
            <div className="marquee__first-half">
            29 июля - 11 августа Открыта экспозиция в санкт - Петербурге в книжном  магазине «Во весь голос» ул. Маяковского 19 &nbsp;&nbsp;&nbsp; 
            </div>
            <div className="marquee__second-half">
            29 июля - 11 августа Открыта экспозиция в санкт - Петербурге в книжном  магазине «Во весь голос» ул. Маяковского 19 &nbsp;&nbsp;&nbsp; 
            </div>
          </div>
        </div> 

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
                  <Placemark key={i} geometry={wall.Coordinates.center} options={{ iconLayout: 'default#image', iconImageHref: '/images/logo-black.png', iconImageSize: [30, 30], iconImageOffset: [-15, -15]}}
                    properties={{ balloonContentHeader: wall.Title,
                    balloonContentBody: wall.Address,
                    balloonContentFooter: `<a href="${'/walls/' + wall.slug + '--' + wall.id }">Перейти</a>`}} modules={['geoObject.addon.balloon', 'geoObject.addon.hint']}/>
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

export const getStaticProps = async () => {
  let res = await fetch(API_HOST + '/slides/')
  let json = await res.json()
  const slides = json && json.sort && json.sort((a,b)=> {
    return a.updatedAt < b.updatedAt ? 1: -1;
  }) || [];
  res = await fetch(API_HOST + '/walls/')
  json = await res.json()
  const walls = json
  walls.forEach((wall)=>wall.arts = wall.arts.sort((a,b)=> {
    return a.published_at < b.published_at ? 1: -1;
  })); 
  const query = {_start: 0, _limit: 8, main: true };
  res = await fetch(API_HOST + '/arts/' + serialize(query))
  json = await res.json()
  const arts = json.sort((a,b)=> {
    return a.published_at < b.published_at ? 1: -1;
  })
  return {
    props: {
      slides,
      walls,
      arts
    },
    revalidate: 60,
  }
}
