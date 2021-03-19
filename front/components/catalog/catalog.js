import Link from 'next/link'
import { useState, useEffect } from 'react'
import { API_HOST, CATALOG_ITEMS_PER_PAGE } from '../../constants/constants'
import { useRouter } from "next/router";
import Router from 'next/router'
import throttle from '../../utils/throttle'
import { resizeAllGridItems } from '../../utils/grid-resizer'
import CatalogFilters from "./catalog-filters"
import Preloader from '../preloader/preloader';

export default function CatalogCmp({arts, hideFilters, title, description, filters, count}){

  //console.log(arts)
  const [state, setState] = useState({showPreloader: false, selectValue: ""})

  const resizeThrottled = throttle(resizeAllGridItems.bind(this, 'catalog-item',  'catalog-grid', '.catalog-item__wrapper'), 100)

  let pagination = [...Array(Math.ceil(count / CATALOG_ITEMS_PER_PAGE))]

  useEffect(() => {

    window.addEventListener('resize', resizeThrottled)
    window.addEventListener('load', resizeThrottled)

    resizeThrottled()
    
    let selectValue = (Router && Router.query || {})._sort;
    
    setState({showPreloader:false, selectValue, page: parseInt(Router.query && Router.query.page, 10) || 1})

    window.scrollTo(0, 0)

    return _ => {
      window.removeEventListener('resize', resizeThrottled)
      window.removeEventListener('load', resizeThrottled)
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
    delete queryObj.page;
    setState({showPreloader: true, selectValue, page: state.page})
    Router.push({
      pathname: Router.pathname,
      query: queryObj
    })
  }

  function setPage(num){
    let queryObj = Router.query || {};
    setState({showPreloader: true, page: num})
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
        <div class="catalog-wrapper">
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
          {
            count && count > CATALOG_ITEMS_PER_PAGE &&
            <div class="catalog__pagination pagination">
              {
                state.page > 1 &&
                <svg class="pagination__arrow" xmlns="http://www.w3.org/2000/svg" width="11" height="28" viewBox="0 0 11 28" onClick={ ()=> setPage( state.page - 1)}><title>angle-left</title><path d="M9.797 8.5a.54.54 0 0 1-.156.359L3.5 15l6.141 6.141c.094.094.156.234.156.359s-.063.266-.156.359l-.781.781c-.094.094-.234.156-.359.156s-.266-.063-.359-.156L.861 15.359C.767 15.265.705 15.125.705 15s.063-.266.156-.359L8.142 7.36c.094-.094.234-.156.359-.156s.266.063.359.156l.781.781a.508.508 0 0 1 .156.359z" fill="#666" stroke="#666"></path></svg>
              }
              {
                pagination.map((num, i) => 
                  <div className={`pagination__item ${ (state.page === i + 1 ? 'pagination__item-active': '')}`} key={i} onClick={ ()=> setPage(i + 1)}>{i + 1}</div>  
                )
              }
              {
              state.page < pagination.length && 
              <svg class="pagination__arrow" xmlns="http://www.w3.org/2000/svg" width="9" height="28" viewBox="0 0 9 28" onClick={ ()=> setPage( state.page + 1)}><title>angle-right</title><path d="M9.297 15a.54.54 0 0 1-.156.359L1.86 22.64c-.094.094-.234.156-.359.156s-.266-.063-.359-.156l-.781-.781a.508.508 0 0 1-.156-.359.54.54 0 0 1 .156-.359L6.502 15 .361 8.859C.267 8.765.205 8.625.205 8.5s.063-.266.156-.359l.781-.781c.094-.094.234-.156.359-.156s.266.063.359.156l7.281 7.281a.536.536 0 0 1 .156.359z" fill="#666" stroke="#666"></path></svg>
              }
            </div>
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