import Link from 'next/link'
import { useState, useEffect } from 'react'
import { API_HOST } from '../../constants/constants'

export default function CatalogFilters(){

  const [styles, setStyles] = useState([])

  useEffect(()=>{
    function loadStyles(){
      fetch( API_HOST + '/styles')
      .then((response)=> response.json())
      .then((json)=>{
        setStyles(json)
      })
    }
    loadStyles()
  }, [])

  return (
    <div className="catalog-filters">
      <div className="catalog-filters__section">
        <div className="catalog-filters__section-title">Стиль</div> 
        {
          styles.map( style => 
            <div className="catalog-filters__item" key={style.id}>{ style.Title }</div>
          )
        }
      </div>
    </div>
  )
}