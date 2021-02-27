import Head from 'next/head'
import Link from 'next/link'
import MainLayout from "../../components/layouts/MainLayout"
import { useRouter, Router } from "next/router";
import { useState, useEffect } from "react"
import { API_HOST } from '../../constants/constants'
import ProductList from '../../components/catalog/product-list'
import Artist from '../artist/[slug]';

export default function Art({ art }) {

  const [currentPicture, setPicture] = useState({index: 0, img: art.Pictures[0]})

  function imageUrlBuilder(url){
    if( url[0] == '/')
      return API_HOST + url;
    return url
  }

  function setPictureClick(newIndex, newPicture){
    setPicture({index:newIndex, img: newPicture})
  }

  console.log(art)
  return (<MainLayout>
    <Head>
      <title>"{art.Title}", картина художника {art.Artist.full_name} | Стена с картинами, облачная галерея</title>
    </Head>
    <div className="art-page">
      <h1>Картина "{art.Title}"{ art.Artist && ', ' + art.Artist.full_name}</h1>
      <div className="art-page__grid">
        <div className="art-page__gallery">
          {
            
            <div className="art-page__thumbnails">
            {
              art.Pictures.map((picture, i) => 
                  <div className={ `art-page__thumbnail ${ currentPicture.index === i ? 'art-page__thumbnail--active': null} `} 
                  key={picture.id} style={{ backgroundImage: 'url(' + imageUrlBuilder( picture.formats.small.url) + ')'}} onClick={ setPictureClick.bind(this, i, picture)}></div>  
              )
            }
            </div>
          }
          <div className="art-page__big-picture">
            <img src={ imageUrlBuilder( currentPicture.img.formats.large ? currentPicture.img.formats.large.url: (currentPicture.img.formats.medium ? currentPicture.img.formats.medium.url: currentPicture.img.formats.small.url)) }/>
          </div>
        </div>
        <div className="art-page__info">
          <div className="art-page__info-title">{art.Title}</div>
          <div className="art-page__info-author">{ art.Artist && art.Artist.full_name}</div>
          { 
            art.Size &&
            <div className="art-page__info-size">Размеры: { art.Size.Width } x { art.Size.Height } </div>
          }
          {
            art.Materials && 
            <div className="art-page__info-materials">Техника: {art.Materials}</div>
          }
          <div className="art-page__buy-block">
            <div className="art-page__price">{art.Price} P</div>
            <div className="btn buy-btn">Купить</div>
          </div>
          <div className="art-page__description">
            { art.Description }
          </div>
        </div>
      </div>
      <h2>Другие работы художника</h2>
      <ProductList artist={art.Artist}></ProductList>
    </div>
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
  console.log(id)
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