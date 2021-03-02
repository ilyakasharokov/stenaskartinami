import Link from 'next/link'
import { useState, useEffect } from 'react'
import { API_HOST } from '../../constants/constants'
import { useRouter } from "next/router";
import Router from 'next/router'
import throttle from '../../utils/throttle'
import { resizeAllGridItems } from '../../utils/grid-resizer'
import CatalogFilters from "./catalog-filters"

export default function CatalogCmp({arts}){

  //console.log(arts)
  const resizeThrottled = throttle(resizeAllGridItems.bind(this, 'catalog-item',  'catalog-grid', '.catalog-item__wrapper'), 100)

  useEffect(() => {

    window.addEventListener('resize', resizeThrottled)
    window.addEventListener('load', resizeThrottled)

    return _ => {
      window.removeEventListener('resize', resizeThrottled)
    }
  })

  function imageUrlBuilder(url){
    if( url[0] == '/')
      return API_HOST + url;
    return url
  }

  return (
    <div className="catalog">
    <CatalogFilters></CatalogFilters>
    <div className="catalog-grid">
    {
      arts && arts.map((art) =>
        <div className="catalog-item" key={art.id}>
          <div className="catalog-item__wrapper">
            <div className="catalog-item__img-wrap">
              <Link href={ '/art/' + art.slug + '--' + art.id}>
                <img className="catalog-item__img" src={ imageUrlBuilder(art.Pictures[0].formats.small ? art.Pictures[0].formats.small.url: art.Pictures[0].formats.thumbnail.url) } alt={art.Title} onLoad={()=> {resizeThrottled()}}/>
              </Link>
            </div>
            <Link href={ '/art/' + art.slug}>
              <div className="catalog-item__title">{art.Title}</div>
            </Link>
            { 
              art.Size &&
              <div className="catalog-item__size">{art.Size.Width} x {art.Size.Height}</div>
            }
            <div className="catalog-item__artist-price">
              { 
                art.Artist && 
                <div className="catalog-item__artist">
                  {
                    art.Artist.full_name && 
                    <Link href={ '/artist/' + art.Artist.slug + '--' + art.Artist.id}>{art.Artist.full_name}</Link> 
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
  </div>
  )
}