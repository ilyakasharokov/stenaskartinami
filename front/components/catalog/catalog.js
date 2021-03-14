import Link from 'next/link'
import { useState, useEffect } from 'react'
import { API_HOST } from '../../constants/constants'
import { useRouter } from "next/router";
import Router from 'next/router'
import throttle from '../../utils/throttle'
import { resizeAllGridItems } from '../../utils/grid-resizer'
import CatalogFilters from "./catalog-filters"
import Preloader from '../preloader/preloader';

export default function CatalogCmp({arts, hideFilters, title, description, filters}){

  //console.log(arts)
  const [state, setState] = useState({showPreloader: false, selectValue: ""})

  const resizeThrottled = throttle(resizeAllGridItems.bind(this, 'catalog-item',  'catalog-grid', '.catalog-item__wrapper'), 100)

  useEffect(() => {

    window.addEventListener('resize', resizeThrottled)
    window.addEventListener('load', resizeThrottled)

    resizeThrottled()
    
    let selectValue = (Router && Router.query || {})._sort;
    
    setState({showPreloader:false, selectValue})

    return _ => {
      window.removeEventListener('resize', resizeThrottled)
    }
  }, [arts])

  function imageUrlBuilder(url){
    if( url[0] == '/')
      return API_HOST + url;
    return url
  }

  function changeSort(event){
    let queryObj = Router.query || {};
    let selectValue = event.target.value
    if(event.target.value){
        Object.assign(queryObj, {_sort: event.target.value})
    } else {
      delete queryObj._sort
    }
    setState({showPreloader: true, selectValue})
    Router.push({
      pathname: Router.pathname,
      query: queryObj
    })
  }

  return (
    <div>
      <div className="catalog-top">
        <h1>{title}</h1>
        <div className="catalog__sort">
          <select className="stena-select" value={ state.selectValue } onChange={(event)=>changeSort(event)}>
            <option value="">По новизне</option>
            <option value="Price:asc">Цена: по возрастанию</option>
            <option value="Price:desc">Цена: по убыванию</option>
          </select>
        </div>
      </div>
      {
        description &&
        <div className="catalog__artist-description">{description}</div>
      }
      <div className="catalog">
      {
        !hideFilters && 
        <CatalogFilters arts={arts} onChange={() => setState({showPreloader: true})} filtersPreloaded={filters}></CatalogFilters>
      }
      {
        state.showPreloader &&
        <div class="overlay">
          <Preloader></Preloader>
        </div>
      }
      {
        arts.length > 0 && 
        <div className="catalog-grid">
          {
          arts.map((art) =>
          <div className="catalog-item" key={art.id}>
            <div className="catalog-item__wrapper">
              <div className="catalog-item__img-wrap">
                <Link href={ '/art/' + art.slug + '--' + art.id}>
                  <a title={art.Title}>
                    <img className="catalog-item__img" src={ imageUrlBuilder(art.Pictures[0].formats.small ? art.Pictures[0].formats.small.url: art.Pictures[0].formats.thumbnail.url) } alt={art.Title} onLoad={()=> {resizeThrottled()}}/>
                  </a>
                </Link>
              </div>
              <Link href={ '/art/' + art.slug}>
                <div className="catalog-item__title"><a title={art.Title}>{art.Title}</a></div>
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
                      <Link href={ '/artists/' + art.Artist.slug + '--' + art.Artist.id}><a title={art.Artist.full_name}>{art.Artist.full_name}</a></Link> 
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
      }
      {
        !arts.length &&
        <div className="catalog__no-results">
          Извините, по данным критериям ничего нет :(
        </div>
      }
    </div>
  </div>

  )
}