import { useState, useEffect } from 'react'
import { API_HOST, CATALOG_ITEMS_PER_PAGE } from '@/constants/constants'
import { useRouter } from "next/router";
import Router from 'next/router'
import throttle from '@/utils/throttle'
import { resizeAllGridItems } from '@/utils/grid-resizer'
import CatalogFilters from "./catalog-filters"
import Preloader from '../preloader/preloader';
import serialize from '@/utils/serialize'
import Pagination from './pagination'
import CatalogItem from './catalog-item'


export default function CatalogCmp({arts, hideFiltersForce, title, description, filters, count, useURLParams, hideSort, emptyText}){

  //console.log(arts)
  const router = useRouter()
  const [ state, setState ] = useState({showPreloader: false, selectedSortValue: "", arts:arts, count: count})
  const [ showFilters, setShowFilters ] = useState(false)
  const [ currentPage, setCurrentPage ] = useState(1)
  const [ loadingMore, setLoadingMore ] = useState(false)

  const resizeThrottled = throttle(resizeAllGridItems.bind(this, 'catalog-item',  'catalog-grid', '.catalog-item__wrapper'), 100)

  useEffect(() => {
    async function loadArts(){
      window.addEventListener('resize', resizeThrottled)
      window.addEventListener('load', resizeThrottled)
      resizeThrottled()
    
      let selectedSortValue = (Router && Router.query || {})._sort;
      
      if(useURLParams && Router && Router.query && Object.entries(Router.query).length){
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
    window.addEventListener('scroll', onScroll)

    return _ => {
      window.removeEventListener('resize', resizeThrottled)
      window.removeEventListener('load', resizeThrottled)
      window.removeEventListener('scroll', onScroll)
    }
  }, [arts, router.query])

  function onScroll(e){

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

  function hideFilters(){
    setShowFilters(false);
  }

  return (
    <div>
      <div className="catalog-top">
        <h1>{title}</h1>
        {
          !hideSort &&
          <div className="catalog__sort">
            <select className="stena-select" value={ state.selectedSortValue } onChange={(event)=>changeSort(event)}>
              <option value="">По новизне</option>
              <option value="Price:asc">Цена: по возрастанию</option>
              <option value="Price:desc">Цена: по убыванию</option>
            </select>
          </div>
        }
      </div>

      {
        description &&
        <div className="catalog__artist-description" dangerouslySetInnerHTML={{
          __html: description
        }}></div>
      }

      <div className={`catalog ${showFilters ? 'catalog--show-filters': ''}`}>
      {
        !hideFiltersForce && 
        <div>
        <div className="catalog__toggle-filters" onClick={() => setShowFilters(!showFilters)}>
            <img src="/images/filter.png"/>
            <div>Фильтры </div>
        </div>
        <CatalogFilters arts={state.arts} onChange={() => setState({showPreloader: true, arts: [...state.arts], count: state.count})} filtersPreloaded={filters} hideFilters={() => hideFilters()}></CatalogFilters>
        </div>
      }
      {
        state.showPreloader &&
        <div className="overlay">
          <Preloader></Preloader>
        </div>
      }
      {
        state.arts && state.arts.length > 0 && 
        <div className="catalog-wrapper">
          <div className="catalog-grid">
            {
            state.arts.map((art) =>
            <CatalogItem art={art} imageOnLoad={()=> resizeThrottled() } key={art.id}></CatalogItem>
          )
          }
          </div>
          {
            loadingMore &&
            <div className="catalog__loading-more">
                <Preloader></Preloader>
            </div>
          }
          {
            state.count && state.count > CATALOG_ITEMS_PER_PAGE &&
            <Pagination currentPage={state.page} count={state.count} setPage={(num)=> setPage(num)}></Pagination>
          }
        </div>
      }
      {
        !state.arts?.length &&
        <div className="catalog__no-results">
          { emptyText ? emptyText : "Извините, по данным критериям ничего нет :(" }
        </div>
      }
    </div>
  </div>

  )
}