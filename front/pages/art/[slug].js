import Head from 'next/head'
import Link from 'next/link'
import MainLayout from "../../components/layouts/MainLayout"
import { useRouter, Router } from "next/router";
import { useState, useEffect } from "react"
import { API_HOST, FREE_ID } from '../../constants/constants'
import ProductList from '../../components/catalog/product-list'
import Artist from '../artists/[slug]';
import imageUrlBuilder from '../../utils/img-url-builder'
import { YMaps, Map, Placemark, ZoomControl } from 'react-yandex-maps';
import { isLocalURL } from 'next/dist/next-server/lib/router/router';
import BuyBlock from '../../components/art/buy-block';
import ImagesGallery from '../../components/art/image-gallery'

export default function Art({ art }) {

  const sent = false;

  console.log(art)
  return (<MainLayout>
    <Head>
      <title>{art?.Title}, картина художника {art?.Artist?.full_name} | Стена с картинами, облачная галерея</title>
    </Head>
    { 
    art &&
    <div className="art-page">
      <h1>"{art.Title}"{ art.Artist && ', ' + art.Artist.full_name}</h1>
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
                <div className="art-page__description">
                  { art.Description }
                </div>
              }
            </div>
            <BuyBlock art={art}></BuyBlock>
      
          </div>
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
        art.Artist && 
        <ProductList artist={art.Artist} except={art.id}></ProductList>
      }
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
  const res = await fetch(API_HOST + '/arts/' + id)
  const json = await res.json()

  if (!json) {
    return {
      notFound: true,
    }
  }

  const art = json;

  return {
    props: {
      art,
    },
    revalidate: 60, // In seconds
  }
}