import MainLayout from "../../components/layouts/MainLayout"
import { useState, useEffect } from "react"
import Link from 'next/link'
import throttle from '../../utils/throttle'
import { resizeAllGridItems } from '../../utils/grid-resizer'
import { API_HOST } from '../../constants/constants'
import CatalogFilters from "../../components/filters/catalog-filters"

export default function Catalog({ arts }) {

  const resizeThrottled = throttle(resizeAllGridItems.bind(this, 'catalog-item',  'catalog-grid', '.catalog-item__wrapper'), 100)

  useEffect(() => {

    window.addEventListener('resize', resizeThrottled)

    return _ => {
      window.removeEventListener('resize', resizeThrottled)
    }
  })

  function imageUrlBuilder(url){
    if( url[0] == '/')
      return API_HOST + url;
    return url
  }

  console.log(arts)

  return (<MainLayout>
    <h1>Каталог</h1>
    <div className="catalog">
      <CatalogFilters></CatalogFilters>
      <div className="catalog-grid">
      {
        arts.map((art) =>
          <div className="catalog-item" key={art.id}>
            <div className="catalog-item__wrapper">
              <div className="catalog-item__img-wrap">
                <Link href={ '/art/' + art.slug}>
                  <img className="catalog-item__img" src={ imageUrlBuilder(art.Pictures[0].formats.small.url) } alt={art.Title} onLoad={resizeThrottled}/>
                </Link>
              </div>
              <div className="catalog-item__title">{art.Title}</div>
              <div className="catalog-item__size">{art.Size.Width} x {art.Size.Height}</div>
              <div className="catalog-item__artist-price">
                { 
                  art.Artist &&
                  <div className="catalog-item__artist">{art.Artist.full_name} 
                    {
                      art.Year && 
                      <span>, { (new Date(art.Year)).getFullYear()}</span>
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
  </MainLayout>
  )
}

Catalog.getInitialProps = async (ctx) => {
  const res = await fetch(API_HOST + '/arts')
  const json = await res.json()
  const arts = json.sort((a,b)=> {
    return a.published_at < b.published_at ? 1: -1;
  })
  return { arts: arts }
}