import MainLayout from "../../components/layouts/MainLayout"
import { useState, useEffect } from "react"
import { API_HOST } from '../../constants/constants'
import CatalogCmp from "../../components/catalog/catalog"
import Head from 'next/head'
import serialize from '../../utils/serialize'

export default function Catalog({ arts, filters }) {

  return (<MainLayout>
    <Head>
      <title>Купить искусство, каталог картин | Стена с картинами, облачная галерея</title>
    </Head>
    <CatalogCmp arts={ arts } title={'Каталог'} filters={ filters }></CatalogCmp>
  </MainLayout>
  )
}

Catalog.getInitialProps = async ({ query }) => {
  const page = query.page || 1;
  let res = await fetch(API_HOST + '/arts' + serialize(query))
  const json = await res.json()
  const arts = json || []
  return { arts: arts } 
} 

/*
export const getStaticProps = async () => {
  let res = await fetch(API_HOST + '/arts/')
  let json = await res.json()
  const arts = json.sort((a,b)=> {
    return a.published_at < b.published_at ? 1: -1;
  })
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
      filters
    },
  }
}
*/