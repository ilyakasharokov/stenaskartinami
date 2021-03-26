import MainLayout from "../../components/layouts/MainLayout"
import { useState, useEffect } from "react"
import { API_HOST, CATALOG_ITEMS_PER_PAGE } from '../../constants/constants'
import CatalogCmp from "../../components/catalog/catalog"
import Head from 'next/head'
import serialize from '../../utils/serialize'

export default function Catalog({ arts, filters, count }) {

  return (<MainLayout>
    <Head>
      <title>Купить искусство, каталог картин | Стена с картинами, облачная галерея</title>
    </Head>
    <CatalogCmp arts={ arts } title={'Каталог'} filters={ filters } count={count} useURLParams={true}></CatalogCmp>
  </MainLayout>
  )
}

/* Catalog.getInitialProps = async ({ query }) => {
  const _start = query.page ? ( query.page - 1)  * CATALOG_ITEMS_PER_PAGE: 0;
  const newQuery = Object.assign({_start, _limit: CATALOG_ITEMS_PER_PAGE }, query) ;
  delete newQuery.page;
  let res = await fetch(API_HOST + '/arts' + serialize(newQuery) )
  const json = await res.json()
  const arts = json || []
  res = await fetch(API_HOST + '/arts/count' + serialize(newQuery ) )
  const count = await res.json()
  return { arts: arts, count } 
}  */


export const getStaticProps = async () => {
  const query = {_start: 0, _limit: CATALOG_ITEMS_PER_PAGE };
  let res = await fetch(API_HOST + '/arts/' + serialize(query))
  let json = await res.json()
  const arts = json.sort((a,b)=> {
    return a.published_at < b.published_at ? 1: -1;
  })
  res = await fetch(API_HOST + '/arts/count' + serialize(query ) )
  const count = await res.json()
  const filters = {
    styles: [],
    mediums: [],
    subjects: []
  }
  for( let key in filters){
    res = await fetch(API_HOST + '/' + key + '/')
    json = await res.json()
    filters[key] = json
  }
  return {
    props: {
      arts,
      filters,
      count
    },
    revalidate: 60,
  }
}
