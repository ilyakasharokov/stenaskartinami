import MainLayout from "@/components/layouts/MainLayout"
import { useState, useEffect } from "react"
import { API_HOST, CATALOG_ITEMS_PER_PAGE } from '@/constants/constants'
import CatalogCmp from "@/components/catalog/catalog"
import Head from 'next/head'
import serialize from '@/utils/serialize'
import { fetchStrapi } from '@/utils/strapi'

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
  try {
    const query = {
      _start: 0,
      _limit: CATALOG_ITEMS_PER_PAGE,
      populate: ['Pictures', 'Artist', 'styles', 'subjects', 'mediums', 'wall'],
    };
    let json = await fetchStrapi(API_HOST + '/arts' + serialize(query))
    const list = Array.isArray(json) ? json : []
    const arts = list.sort((a, b) => {
      const aPublished = a.publishedAt || a.published_at;
      const bPublished = b.publishedAt || b.published_at;
      return aPublished < bPublished ? 1 : -1;
    })
    const countResponse = await fetchStrapi(API_HOST + '/arts/count' + serialize(query))
    const count = countResponse?.count ?? countResponse?.meta?.pagination?.total ?? 0
    const filters = {
      styles: [],
      mediums: [],
      subjects: [],
      walls: []
    }
    for( let key in filters){
      json = await fetchStrapi(API_HOST + '/' + key + '/')
      if(key === 'walls'){
        key = 'wall'
      }
      filters[key] = Array.isArray(json) ? json : []
    }
    return {
      props: { arts, filters, count },
      revalidate: 60,
    }
  } catch {
    return {
      props: {
        arts: [],
        filters: { styles: [], mediums: [], subjects: [], walls: [] },
        count: 0,
      },
      revalidate: 60,
    }
  }
}
