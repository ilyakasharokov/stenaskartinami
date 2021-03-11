import Link from 'next/link'
import { useState, useEffect } from 'react'
import { API_HOST } from '../../constants/constants'
import { useRouter } from "next/router";
import Router from 'next/router'
import Preloader from '../preloader/preloader';



export default function CatalogFilters({arts, onChange}){

  const [filters, setFilters] = useState({
    styles:{
      title: 'Стиль',
      items: []
    }, 
    subjects: {
      title: 'Теги',
      items: []
    }, 
      mediums: {
      title: 'Техника',
      items: []
    }, 
    size: {
      title: 'Размер',
      items: []
    },  

  })

  const keys = Object.keys(filters)

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

  function сheckboxClick(item, type){
    item.active = !item.active;
    // sortByActive(filters[type])
    let query = {};
    for (const [key, value] of Object.entries(filters)) {
      query[key] = filters[key].items.filter((item)=> item.active).map((item)=> item.slug)
    }
    onChange()
    Router.push({
      pathname: Router.pathname,
      query: Router.query ? Object.assign({}, Router.query, query) : query
    })
  }

  return (
    <div className="catalog-filters">
      {
        Object.keys(filters).map((key) => 
          <div className="catalog-filters__section" key={key}>
            <div className="catalog-filters__section-title">{filters[key].title}</div> 
            {
              filters[key].items && filters[key].items.map( (item) => 
                <div className="catalog-filters__item" key={item.id}>
                  <div className={`checkbox ${item.active ? "checkbox--active": ""}`} onClick={()=>сheckboxClick(item, key)}></div>
                  <div>{ item.Title || item.title }</div>
                </div>
              )
            }
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