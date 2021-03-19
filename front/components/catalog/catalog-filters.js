import Link from 'next/link'
import { useState, useEffect } from 'react'
import { API_HOST } from '../../constants/constants'
import { useRouter } from "next/router";
import Router from 'next/router'
import Preloader from '../preloader/preloader';

const FILTER_ITEMS_NUM = 6;

export default function CatalogFilters({arts, onChange}){

  const [filters, setFilters] = useState({
    styles:{
      title: 'Стиль',
      items: [],
      open: true,
      showAll: false,
    }, 
    subjects: {
      title: 'Теги',
      items: [],
      open: true,
      showAll: false,
    }, 
      mediums: {
      title: 'Техника',
      items: [],
      open: false,
      showAll: false,
    }, 
    size: {
      title: 'Размер',
      items: [],
      open: false,
      showAll: false,
    },  

  })

  const keys = Object.keys(filters)

  const fetcher = url => fetch(url).then(r => r.json())

  useEffect(()=>{
    let newFilters = Object.assign({}, filters)
    function loadFilters(){
      fetch(API_HOST + '/styles').then((response)=> response.json()).then((json)=>{ 
        newFilters.styles.items = json.filter((f)=> f.arts.length > 0)
        return fetch(API_HOST + '/subjects')
      }).then((response)=> response.json()).then((json)=>{ 
        newFilters.subjects.items = json.filter((f)=> f.arts.length > 0)
        return fetch(API_HOST + '/mediums')
      }).then((response)=> response.json()).then((json)=>{
        newFilters.mediums.items = json.filter((f)=> f.arts.length > 0)
        newFilters.size.items = [{
          title: 'Маленькие',
          slug: 'small',
          max: 20,
          id: 1
        },
        {
          title: 'Средние',
          slug: 'medium',
          max: 40,
          id: 2
        },
        {
          title: 'Большие',
          slug: 'large',
          max: 60,
          id: 3
        },
        {
          title: 'Огромные',
          slug: 'huge',
          max: 1000,
          id: 4
        } ]
        for (const [key, value] of Object.entries(Router.query)) {
          if(newFilters[key]){ 
            newFilters[key].activeCount = 0;
            newFilters[key].items.forEach(item => {
              if(Router.query[key].findIndex && Router.query[key].findIndex((queryItem)=>{
                return item.slug === queryItem;
              }) > -1 || Router.query[key] === item.slug){
                item.active = true;
                newFilters[key].open = true;
                newFilters[key].activeCount ++;
              }
            });
            sortByActive(newFilters[key].items)
          }
        }
        setFilters(newFilters)
      })
  
    }
    loadFilters()
  }, [])

  function sortByActive(arr){
    arr.sort((a,b)=> a.active === b.active ? 0: a.active ? -1: 1)
  }

  function showAll(key){
    let newFilters = Object.assign({}, filters)
    newFilters[key].showAll = true;
    setFilters(newFilters);
  }

  function toggleCollapse(key){
    let newFilters = Object.assign({}, filters)
    newFilters[key].open = !newFilters[key].open;
    setFilters(newFilters);
  }

  function сheckboxClick(item, type){
    item.active = !item.active;
    // sortByActive(filters[type])
    let query = {};
    for (const [key, value] of Object.entries(filters)) {
      query[key] = filters[key].items.filter((item)=> item.active).map((item)=> item.slug)
    }
    onChange()
    const newQuery = Router.query ? Object.assign({}, Router.query, query) : query
    delete newQuery.page;
    Router.push({
      pathname: Router.pathname,
      query: newQuery
    })
  } 

  return (
    <div className="catalog-filters">
      {
        Object.keys(filters).map((key) => 
          <div className="catalog-filters__section" key={key}>
            <div className="catalog-filters__section-top" onClick={ ()=> toggleCollapse(key)}>
              <div className="catalog-filters__section-title">{filters[key].title}</div> 
              <div className="catalog-filters__section-expand-btn">
              {
                filters[key].open && 
                <svg className="minus" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 1"><path d="M0 0h10v1H0V0z" fill="#333"></path></svg>
              }
              {
                !filters[key].open && 
                <svg viewBox="0 0 13 13" xmlns="http://www.w3.org/2000/svg"><g fill="#333" fillRule="evenodd"><path d="M0 6h13v1H0z"></path><path d="M6 0h1v13H6z"></path></g></svg>
              }
              </div> 
            </div> 
            <div className="catalog-filters__collapsable" style={ { maxHeight: (filters[key].open && ((!filters[key].showAll && FILTER_ITEMS_NUM || filters[key].items.length ) + 1) * 25) || 0 + 'px'  }} length={!filters[key].showAll && FILTER_ITEMS_NUM || filters[key].items.length}>
            {
              (!filters[key].showAll && filters[key].items && filters[key].items.slice(0, FILTER_ITEMS_NUM) || filters[key].items && filters[key].items).map( (item) => 
                <div className="catalog-filters__item" key={item.id}>
                  <div className={`checkbox ${item.active ? "checkbox--active": ""}`} onClick={()=>сheckboxClick(item, key)}></div>
                  <div>{ item.Title || item.title }</div>
                </div>
              )
            }
            {
              !filters[key].showAll && filters[key].items.length > FILTER_ITEMS_NUM &&
              <div className="catalog-filters__show-all" onClick={ ()=> showAll(key) }>Показать все</div>
            }
            </div>
            {
              !filters[key].items.length &&
              <div className="catalog-filters__preloader">
                <Preloader></Preloader>
              </div> 
            }
          </div>
        )
      }
    </div>
  )
}