import MainLayout from "../../components/layouts/MainLayout"
import { useState, useEffect } from "react"
import { API_HOST } from '../../constants/constants'
import CatalogCmp from "../../components/catalog/catalog"
import Head from "next/head"
import Link from "next/link"
import ProductListStatic from "../../components/catalog/product-list-static"
import ImageGallery from "../../components/art/image-gallery"
import { YMaps, Map, Placemark, ZoomControl } from 'react-yandex-maps';

export default function Catalog({ wall }) {
  console.log(wall)
  return (<MainLayout>
    <Head>
      <title>{wall.Title} | Стена с картинами, облачная галерея</title>
    </Head>
    <div className="content-page">
      <h1>{wall.Title}</h1>
      <div className="content-page__wrapper">
        <div className="content-page__left">
        {
          wall.Images.length && 
          <ImageGallery images={wall.Images}></ImageGallery>
        }
        </div>
        <div className="content-page__right wall-page__info">
          <div className="wall-page__description wall-page__info-line">{wall.Description}</div>
          <div className="wall-page__phone wall-page__info-line"><span className="info-field">Телефон: </span>{wall.Phone}</div>
          <div className="wall-page__schedule wall-page__info-line"><span className="info-field">Режим работы: </span>{wall.Schedule}</div>
          <div className="wall-page__website wall-page__info-line"><span className="info-field">Сайт: </span><a target="_blank" href={wall.Website}>{wall.Website}</a></div>
        </div>
      </div>
      <div className="wall-page__map">
      {
        wall.Coordinates && 
        <YMaps>
          <Map defaultState={wall.Coordinates} style={{width: '100%', height: '300px'}} >
            <ZoomControl/>
            <Placemark geometry={wall.Coordinates.center} options={{ iconLayout: 'default#image', iconImageHref: '/images/Logo_stenaskartinami_black_sqr.svg', iconImageSize: [30, 30], iconImageOffset: [-15, -15]}} />
          </Map>
        </YMaps>
      }
      </div>
      {
        wall.arts && 
        <div>
          <h2>Картины на стене</h2>
          <ProductListStatic arts={wall.arts.slice(0, 4)}></ProductListStatic>
        </div>
      }
      { 
        <div className="product-list__link">
          <Link href={`/catalog?wall=${wall.slug}`}><a>Посмотреть все</a></Link>
        </div>
      } 
    </div>
  </MainLayout>
  )
}

export async function getStaticPaths() {
  const res = await fetch(API_HOST + '/walls/')
  const json = await res.json()
  return {
    paths: json.map(item => { 
      return {params: { slug: item.slug + '--' + item.id }}
  }),
    fallback: false
  }
}

export const getStaticProps = async ({params: {
  slug
}}) => {
  let id = slug.split('--')[1]
  const res = await fetch(API_HOST + '/walls/' + id)
  const json = await res.json()
  const wall = json
  wall.arts = wall.arts.sort((a,b)=> {
    return a.published_at < b.published_at ? 1: -1;
  });
  return {
    props: {
      wall,
    },
    revalidate: 60,
  }
}


