import Head from 'next/head'
import Link from 'next/link'
import MainLayout from "../../components/layouts/MainLayout"
import { useRouter } from "next/router";
import { useState, useEffect } from "react"
import { API_HOST } from '../../constants/constants'

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
    <div className="art-page">
      <h1>Картина "{art.Title}"{ art.Artist && ', ' + art.Artist.full_name}</h1>
      <div className="art-page__grid">
        <div className="art-page__gallery">
          {
            
            <div className="art-page__thumbnails">
            {
              art.Pictures.map((picture, i) => 
                  <div className={ `art-page__thumbnail ${ currentPicture.index === i ? 'art-page__thumbnail--active': null} `} 
                  key={picture.id} style={{ backgroundImage: 'url(' + imageUrlBuilder( picture.formats.small.url) + ')'}} onClick={setPictureClick.bind(this, i, picture)}></div>  
              )
            }
            </div>
          }
          <div className="art-page__big-picture">
            <img src={ imageUrlBuilder( currentPicture.img.formats.large.url) }/>
          </div>
        </div>
        <div className="art-page__info">
          <div className="art-page__info-title">{art.Title}</div>
          <div className="art-page__info-author">{ art.Artist && art.Artist.full_name}</div>
          <div className="art-page__info-size">Размеры: { art.Size.Width } x { art.Size.Height } </div>
        </div>
      </div>
    </div>
  </MainLayout>
  )
}

Art.getInitialProps = async ({query}) => {
  const res = await fetch(API_HOST + '/arts?slug=' + query.id)
  const json = await res.json()
  const art = json;
  return { art: art[0] }
}
