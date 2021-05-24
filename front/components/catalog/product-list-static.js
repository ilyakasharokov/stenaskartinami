import Link from 'next/link'
import { useState, useEffect } from 'react'
import { API_HOST } from '../../constants/constants'
import { useRouter } from "next/router";
import Router from 'next/router'
import throttle from '../../utils/throttle'
import { resizeAllGridItems } from '../../utils/grid-resizer'
import CatalogFilters from "./catalog-filters"
import imageUrlBuilder from "../../utils/img-url-builder"

export default function ProductListStatic({arts}){

  return (
    <div>
      {
      arts && arts.length > 0 &&
      <div>  
        <div className="product-list">
        {
          arts.map((art) =>
            <div className="catalog-item" key={art.id}>
              
              <div className="catalog-item__wrapper">
                <Link href={ '/art/' + art.slug + '--' + art.id}>
                    <a>
                    <div>
                      {
                        art.Pictures[0] && art.Pictures[0].formats && 
                        <div className="catalog-item__bg-img" style={{backgroundImage : `url(${(imageUrlBuilder(art.Pictures[0].formats.small ? art.Pictures[0].formats.small.url: ''))} )`, 
                      backgroundSize: `cover`, backgroundPosition: `center` } }>
                          <img className="catalog-item__invisible-img" src="/favicon.png"/>
                        </div>
                      }
                      <div className="catalog-item__title">{art.Title}</div>
                    </div>
                  </a>
                </Link>
                <div className="catalog-item__size">
                { 
                  art.width && art.height &&
                  <div>
                    {art.width} x {art.height}
                  </div>
                }
                </div>
                <div className="catalog-item__artist-price">
                  { 
                    art.Artist && 
                    <div className="catalog-item__artist">
                      {
                        art.Artist.full_name && 
                        <Link href={ '/artists/' + art.Artist.slug}>{art.Artist.full_name}</Link> 
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
      }
    </div>
  )
}