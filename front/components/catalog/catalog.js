import Link from 'next/link'
import { useState, useEffect } from 'react'
import { API_HOST, CATALOG_ITEMS_PER_PAGE } from '../../constants/constants'
import { useRouter } from "next/router";
import Router from 'next/router'
import throttle from '../../utils/throttle'
import { resizeAllGridItems } from '../../utils/grid-resizer'
import CatalogFilters from "./catalog-filters"
import Preloader from '../preloader/preloader';
import serialize from '../../utils/serialize'
import Pagination from './pagination'

export default function CatalogCmp({arts, hideFilters, title, description, filters, count}){

  //console.log(arts)
  const router = useRouter()
  const [state, setState] = useState({showPreloader: false, selectedSortValue: "", arts:arts, count: count})

  const resizeThrottled = throttle(resizeAllGridItems.bind(this, 'catalog-item',  'catalog-grid', '.catalog-item__wrapper'), 100)

  useEffect(() => {
    async function loadArts(){
      window.addEventListener('resize', resizeThrottled)
      window.addEventListener('load', resizeThrottled)
      resizeThrottled()
    
      let selectedSortValue = (Router && Router.query || {})._sort;
      
      if(Router && Router.query && Object.entries(Router.query).length){
        const query = Router.query;
        const _start = query.page ? ( query.page - 1)  * CATALOG_ITEMS_PER_PAGE: 0;
        const newQuery = Object.assign({_start, _limit: CATALOG_ITEMS_PER_PAGE }, query) ;
        delete newQuery.page;
        let res = await fetch(API_HOST + '/arts' + serialize(newQuery) )
        const json = await res.json()
        const arts = json || []
        res = await fetch(API_HOST + '/arts/count' + serialize(newQuery ) )
        const newCount = await res.json()
        setState({arts, showPreloader:false, selectedSortValue, page: parseInt(Router.query && Router.query.page, 10) || 1, count: newCount})
      }else{
        setState({arts, showPreloader:false, selectedSortValue, page: parseInt(Router.query && Router.query.page, 10) || 1, count: count})
      }

      window.scrollTo(0, 0)
    }

    loadArts()

    return _ => {
      window.removeEventListener('resize', resizeThrottled)
      window.removeEventListener('load', resizeThrottled)
    }
  }, [arts, router.query])

  function imageUrlBuilder(url){
    if( url[0] == '/')
      return API_HOST + url;
    return url
  }

  function changeSort(event){
    let queryObj = Router.query || {};
    let selectedSortValue = event.target.value
    if(event.target.value){
        Object.assign(queryObj, {_sort: event.target.value})
    } else {
      delete queryObj._sort
    }
    delete queryObj.page;
    setState({showPreloader: true, selectedSortValue, page: state.page, arts: [...state.arts], count: state.count})
    Router.push({
      pathname: Router.pathname,
      query: queryObj
    })
  }

  function setPage(num){
    let queryObj = Router.query || {};
    setState({showPreloader: true, page: num, arts: [...state.arts], count: state.count})
    Router.push({
      pathname: Router.pathname,
      query: Object.assign(queryObj, { page: num})
    })
  }

  return (
    <div>
      <div className="catalog-top">
        <h1>{title}</h1>
        <div className="catalog__sort">
          <select className="stena-select" value={ state.selectedSortValue } onChange={(event)=>changeSort(event)}>
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
        <CatalogFilters arts={state.arts} onChange={() => setState({showPreloader: true, arts: [...state.arts], count: state.count})} filtersPreloaded={filters}></CatalogFilters>
      }
      {
        state.showPreloader &&
        <div class="overlay">
          <Preloader></Preloader>
        </div>
      }
      {
        state.arts && state.arts.length > 0 && 
        <div class="catalog-wrapper">
          <div className="catalog-grid">
            {
            state.arts.map((art) =>
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
                  art.width && art.height &&
                  <div className="catalog-item__size">{art.width} x {art.height}</div>
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
          {
            state.count && state.count > CATALOG_ITEMS_PER_PAGE &&
            <Pagination currentPage={state.page} count={state.count} setPage={(num)=> setPage(num)}></Pagination>
          }
        </div>
      }
      {
        !state.arts?.length &&
        <div className="catalog__no-results">
          Извините, по данным критериям ничего нет :(
        </div>
      }
    </div>
  </div>

  )
}