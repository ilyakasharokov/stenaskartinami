import Link from 'next/link'
import { useState, useEffect } from 'react'
import { API_HOST } from '../../constants/constants'
import { useRouter } from "next/router";
import Router from 'next/router'
import throttle from '../../utils/throttle'
import { resizeAllGridItems } from '../../utils/grid-resizer'
import CatalogFilters from "./catalog-filters"

export default function ProductList({artist}){
  
  const [arts, setArts] = useState([])
  console.log(arts)

  useEffect(() => {

    function loadArtistArts() {
      fetch(API_HOST + '/artists/' + artist.id)
      .then((response)=> response.json())
      .then((artist)=>{
        setArts(artist.Arts.sort((a,b)=> {
          return a.published_at < b.published_at ? 1: -1;
        }).slice(0, 4))
      })
    }
    loadArtistArts();

  }, [])

  function imageUrlBuilder(url){
    if( url[0] == '/')
      return API_HOST + url;
    return url
  }

  return (
    <div className="product-list">
    {
      arts && arts.map((art) =>
        <div className="catalog-item" key={art.id}>
          <div className="catalog-item__wrapper">
              <Link href={ '/art/' + art.slug + '--' + art.id}>
              <div>
                <div className="catalog-item__bg-img" style={{backgroundImage : `url(${(imageUrlBuilder(art.Pictures[0].formats.small ? art.Pictures[0].formats.small.url: ''))} )`, 
              backgroundSize: `cover`, backgroundPosition: `center` } }>
                  <img className="catalog-item__invisible-img" src="/favicon.png"/>
                </div>
            
                <div className="catalog-item__title">{art.Title}</div>
              </div>
            </Link>
            <div className="catalog-item__size">
            { 
              art.Size &&
              <div>
                {art.Size.Width} x {art.Size.Height}
              </div>
            }
            </div>
            <div className="catalog-item__artist-price">
              { 
                art.Artist && 
                <div className="catalog-item__artist">
                  {
                    art.Artist.full_name && 
                    <Link href={ '/artist/' + art.Artist.slug}>{art.Artist.full_name}</Link> 
                  }
                  {
                    art.Artist.full_name && art.Year &&
                    <span>, </span>
                  }
                  {
                    art.Year && 
                    <span>{ (new Date(art.Year)).getFullYear()}</span>
                  }
                </div>
              }
              <div className="catalog-item__price">
                { art.Price ? art.Price  + ' P' : ''} 
              </div>
            </div>
          </div>
        </div>
      )
    }
    </div>

  )
}