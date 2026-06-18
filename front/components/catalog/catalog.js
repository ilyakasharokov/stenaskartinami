import { useState, useEffect } from 'react'
import { API_HOST, CATALOG_ITEMS_PER_PAGE } from '@/constants/constants'
import { useRouter } from "next/router";
import Router from 'next/router'
import throttle from '@/utils/throttle'
import { resizeAllGridItems } from '@/utils/grid-resizer'
import CatalogFilters from "./catalog-filters"
import Preloader from '../preloader/preloader';
import serialize from '@/utils/serialize'
import { fetchStrapi } from '@/utils/strapi'
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

  // Run resize after React commits new arts to DOM (requestAnimationFrame = after paint)
  useEffect(() => {
    if (!state.arts?.length) return;
    const frame = requestAnimationFrame(() => {
      resizeAllGridItems('catalog-item', 'catalog-grid', '.catalog-item__wrapper');
    });
    return () => cancelAnimationFrame(frame);
  }, [state.arts]);

  useEffect(() => {
    const query = router.query
    async function loadArts(){
      window.addEventListener('resize', resizeThrottled)
      window.addEventListener('load', resizeThrottled)

      const selectedSortValue = query._sort || ''

      try {
        if(useURLParams && Object.entries(query).length){
          const _start = query.page ? ( query.page - 1)  * CATALOG_ITEMS_PER_PAGE: 0;
          const newQuery = {
            _start,
            _limit: CATALOG_ITEMS_PER_PAGE,
            populate: ['Pictures', 'Artist', 'styles', 'subjects', 'mediums', 'wall'],
            'filters[wall][$notNull]': true,
            ...query,
          }
          delete newQuery.page;
          const [json, countResponse] = await Promise.all([
            fetchStrapi(API_HOST + '/arts' + serialize(newQuery)),
            fetchStrapi(API_HOST + '/arts/count' + serialize(newQuery)),
          ])
          const fetchedArts = Array.isArray(json) ? json : []
          const newCount = countResponse?.count ?? countResponse?.meta?.pagination?.total ?? 0
          setState({arts: fetchedArts, showPreloader:false, selectedSortValue, page: parseInt(query.page, 10) || 1, count: newCount})
        }else{
          setState({arts, showPreloader:false, selectedSortValue, page: parseInt(query.page, 10) || 1, count: count})
        }
      } catch {
        setState(prev => ({ ...prev, showPreloader: false }))
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
    const selectedSortValue = event.target.value
    const queryObj = { ...router.query }
    if (selectedSortValue) {
      queryObj._sort = selectedSortValue
    } else {
      delete queryObj._sort
    }
    delete queryObj.page
    setState({showPreloader: true, selectedSortValue, page: state.page, arts: [...state.arts], count: state.count})
    Router.push({
      pathname: Router.pathname,
      query: queryObj
    })
  }

  function setPage(num){
    const queryObj = { ...router.query, page: num }
    setState({showPreloader: true, page: num, arts: [...state.arts], count: state.count})
    Router.push({
      pathname: Router.pathname,
      query: queryObj
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
              <option value="Price:asc">Дешевле</option>
              <option value="Price:desc">Дороже</option>
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