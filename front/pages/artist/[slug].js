import Head from 'next/head'
import Link from 'next/link'
import MainLayout from "../../components/layouts/MainLayout"
import { useRouter } from "next/router";
import { useState, useEffect } from "react"
import { API_HOST } from '../../constants/constants'

export default function Art({ art }) {

  console.log(art)
  return (<MainLayout>
    <div className="art-page">
      <h1>Картина "{art.Title}", { art.Artist.full_name}</h1>
      <div className="art-page__grid">
        <div className="art-page__gallery">
          {
            art.Pictures.length > 1 &&
            <div className="art-page__thumbnails">
            {
              art.Pictures.map((picture, i) => 
                  i > 0 && 
                  <div className="art-page__thumbnail" key={picture.id}>
                    <img src={API_HOST +  picture.formats.small.url}/>
                  </div>  
              )
            }
            </div>
          }
          <div className="art-page__big-picture">
            <img src={API_HOST +  art.Pictures[0].formats.large.url}/>
          </div>
        </div>
        <div className="art-page__info">
          <div className="art-page__info-title">{art.Title}</div>
          <div className="art-page__info-author">{ art.Artist.full_name}</div>
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
