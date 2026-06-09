import MainLayout from "@/components/layouts/MainLayout"
import { useState, useEffect } from "react"
import { API_HOST } from '@/constants/constants'
import { fetchStrapi } from '@/utils/strapi'
import serialize from '@/utils/serialize'
import CatalogCmp from "@/components/catalog/catalog"
import Head from "next/head"
import Link from "next/link"
import ProductListStatic from "@/components/catalog/product-list-static"
import ImageGallery from "@/components/art/image-gallery"
import { YMaps, Map, Placemark, ZoomControl } from 'react-yandex-maps';

export default function Catalog({ wall }) {
  console.log(wall)
  return (<MainLayout>
    <Head>
      <title>{wall?.Title} | Стена с картинами, облачная галерея</title>
    </Head>
    {
      wall &&
    <div className="content-page">
      <h1>{wall.Title}</h1>
      <div className="content-page__wrapper">
        <div className="content-page__left">
        {
          Array.isArray(wall.Images) && wall.Images.length > 0 &&
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
            <Placemark geometry={wall.Coordinates.center} options={{ iconLayout: 'default#image', iconImageHref: '/images/mapicon.png', iconImageSize: [40, 40], iconImageOffset: [-20, -20]}} />
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
    }
  </MainLayout>
  )
}

export async function getStaticPaths() {
  try {
    const json = await fetchStrapi(API_HOST + '/walls')
    const walls = Array.isArray(json) ? json : []
    return {
      paths: walls.map(item => ({ params: { slug: item.slug + '--' + item.id } })),
      fallback: 'blocking',
    }
  } catch {
    return { paths: [], fallback: 'blocking' }
  }
}

export const getStaticProps = async ({params: { slug }}) => {
  try {
  let id = slug.split('--')[1]
  const wall = await fetchStrapi(
    API_HOST +
      '/walls/' +
      id +
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
  if (!wall || !wall.id) {
    return { notFound: true };
  }
  const wallArts = Array.isArray(wall.arts) ? wall.arts : [];
  wall.arts = wallArts.sort((a, b) => {
    const aPublished = a.publishedAt || a.published_at;
    const bPublished = b.publishedAt || b.published_at;
    return aPublished < bPublished ? 1 : -1;
  });
  return {
    props: { wall },
    revalidate: 60,
  }
  } catch {
    return { notFound: true }
  }
}


