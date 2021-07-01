import Link from 'next/link'
import { useState, useEffect } from 'react'
import { API_HOST } from '../../constants/constants'
import { useRouter } from "next/router";
import Router from 'next/router'
import throttle from '../../utils/throttle'
import { resizeAllGridItems } from '../../utils/grid-resizer'
import CatalogFilters from "./catalog-filters"
import imageUrlBuilder from "../../utils/img-url-builder"
import ProductListItem from './product-list-item';

export default function ProductList({artist, except}){

  const [arts, setArts] = useState([])

  useEffect(() => {

    function loadArtistArts() {
      fetch(API_HOST + '/artists/' + artist.id)
      .then((response)=> response.json())
      .then((artist)=>{
        let arts = artist.Arts.sort((a,b)=> {
          return a.published_at < b.published_at ? 1: -1;
        }).filter((a) => a.id !== except).slice(0, 4);
        setArts(arts);
      })
    }
    loadArtistArts();

  }, [except])

  return (
    <div>
      {
      arts && arts.length > 0 &&
      <div>  
        <h2>Другие работы художника</h2>
        <div className="product-list">
        {
          arts.map((art) =>
            <ProductListItem art={art} key={art.id}></ProductListItem>
          )
        }
        </div>
        {
          arts.length === 4 &&
          <div className="product-list__link">
            <Link href={ '/artists/' + artist.slug + '--' + artist.id}><a title={artist.full_name}>Перейти в каталог работ художника</a></Link> 
          </div>
        }
      </div>
      }
    </div>
  )
}