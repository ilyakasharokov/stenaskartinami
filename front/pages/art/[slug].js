import Head from 'next/head'
import Link from 'next/link'
import MainLayout from "../../components/layouts/MainLayout"
import { useRouter, Router } from "next/router";
import { useState, useEffect } from "react"
import { API_HOST } from '../../constants/constants'
import ProductList from '../../components/catalog/product-list'
import Artist from '../artists/[slug]';
import imageUrlBuilder from '../../utils/img-url-builder'
import { YMaps, Map, Placemark } from 'react-yandex-maps';
import { isLocalURL } from 'next/dist/next-server/lib/router/router';
import BuyBlock from '../../components/art/buy-block';

export default function Art({ art }) {

  const [currentPicture, setPicture] = useState({index: 0, img: art.Pictures[0]})

  const sent = false;

  useEffect(()=>{
    setPicture({index: 0, img: art.Pictures[0]})
  }, [art])

  function setPictureClick(newIndex, newPicture){
    setPicture({index:newIndex, img: newPicture})
  }

  console.log(art)
  return (<MainLayout>
    <Head>
      <title>{art.Title}, картина художника {art.Artist?.full_name} | Стена с картинами, облачная галерея</title>
    </Head>
    <YMaps>
    <div className="art-page">
      <h1>Картина "{art.Title}"{ art.Artist && ', ' + art.Artist.full_name}</h1>
      <div className="art-page__grid">
        <div className="art-page__gallery">
          {
            
            <div className="art-page__thumbnails">
            {
              art.Pictures.map((picture, i) => 
                  <div className={ `art-page__thumbnail ${ currentPicture.index === i ? 'art-page__thumbnail--active': null} `} 
                  key={picture.id} style={{ backgroundImage: 'url(' + imageUrlBuilder( picture.formats.small ?  picture.formats.small.url:  picture.formats.thumbnail.url) + ')'}} onClick={ setPictureClick.bind(this, i, picture)}></div>  
              )
            }
            </div>
          }
          <div className="art-page__big-picture">
            <img src={ imageUrlBuilder( currentPicture.img.formats.large ? currentPicture.img.formats.large.url: (currentPicture.img.formats.medium ? currentPicture.img.formats.medium.url: currentPicture.img.formats.small ?  currentPicture.img.formats.small.url:  currentPicture.img.formats.thumbnail.url)) }/>
          </div>
        </div>
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
            art.wall &&
            <div className="art-page__wall-block">
              <div className="art-page__wall-block-text">
                Картина находится на стене в <Link href={ '/walls/' + art.wall.slug + '--' + art.wall.id }><a>{ art.wall.Title }</a></Link>
              </div>
              <Map defaultState={art.wall.Coordinates} style={{width: '100%', height: '200px'}} >
                <Placemark geometry={art.wall.Coordinates.center} options={{ iconLayout: 'default#image', iconImageHref: '/images/Logo_stenaskartinami_black_sqr.svg', iconImageSize: [30, 30], iconImageOffset: [-15, -15]}} />
              </Map>
            </div>
          }
        </div>
      </div>
      {
        art.Artist && 
        <ProductList artist={art.Artist} except={art.id}></ProductList>
      }
    </div></YMaps>
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
    fallback: false
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