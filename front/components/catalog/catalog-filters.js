import Link from 'next/link'
import { useState, useEffect } from 'react'
import { API_HOST } from '../../constants/constants'
import { useRouter } from "next/router";
import Router from 'next/router'


export default function CatalogFilters(){

  const [filters, setFilters] = useState({styles:[], subjects: []})

  useEffect(()=>{
    function loadFilters(){
      let prefilters = {};
      fetch(API_HOST + '/styles').then((response)=> response.json()).then((json)=>{ 
        prefilters.styles = json
        return fetch(API_HOST + '/subjects')
      }).then((response)=> response.json()).then((json)=>{ 
        prefilters.subjects = json
        prefilters.subjects = prefilters.subjects.filter((f)=> f.arts.length > 0)
        prefilters.styles = prefilters.styles.filter((f)=> f.arts.length > 0)
        for (const [key, value] of Object.entries(Router.query)) {
          if(prefilters[key]){ 
              prefilters[key].forEach(item => {
              if(Router.query[key].findIndex && Router.query[key].findIndex((queryItem)=>{
                return item.slug === queryItem;
              }) > -1 || Router.query[key] === item.slug){
                item.active = true;
              }
            });
            sortByActive(prefilters[key])
          }
        }

        setFilters(prefilters)
      })
  
    }
    loadFilters()
  }, [])

  function sortByActive(arr){
    arr.sort((a,b)=> a.active === b.active ? 0: a.active ? -1: 1)
  }

  function сheckboxClick(item, type){
    item.active = !item.active;
    sortByActive(filters[type])
    let query = {};
    for (const [key, value] of Object.entries(filters)) {
      query[key] = filters[key].filter((item)=> item.active).map((item)=> item.slug)
    }
    Router.push({
      pathname: '/catalog',
      query: query,
    })
  }

  return (
    <div className="catalog-filters">
      <div className="catalog-filters__section">
        <div className="catalog-filters__section-title">Стиль</div> 
        {
          filters.styles.map( style => 
            <div className="catalog-filters__item" key={style.id}>
              <div className={`checkbox ${style.active ? "checkbox--active": ""}`} onClick={()=>сheckboxClick(style, 'styles')}></div>
              <div>{ style.Title }</div>
            </div>
          )
        }
      </div>
      <div className="catalog-filters__section">
        <div className="catalog-filters__section-title">Теги</div> 
        {
          filters.subjects.map( style => 
            <div className="catalog-filters__item" key={style.id}>
              <div className={`checkbox ${style.active ? "checkbox--active": ""}`} onClick={()=>сheckboxClick(style, 'subjects')}></div>
              <div>{ style.Title }</div>
            </div>
          )
        }
        
      </div>
    </div>
  )
}