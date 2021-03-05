import MainLayout from "../../components/layouts/MainLayout"
import { useState, useEffect } from "react"

import { API_HOST } from '../../constants/constants'

import CatalogCmp from "../../components/catalog/catalog"

export default function Catalog({ arts }) {

  return (<MainLayout>
    <h1>Каталог</h1>
    <CatalogCmp arts={arts}></CatalogCmp>
  </MainLayout>
  )
}

export async function getStaticPaths() {
  const res = await fetch(API_HOST + '/styles/')
  const json = await res.json()
  return {
    paths: json.map(item => { 
      return {params: { slug: item.slug }}
  }),
    fallback: false
  }
}


export const getStaticProps = async () => {
  const res = await fetch(API_HOST + '/arts/')
  const json = await res.json()
  const arts = json.sort((a,b)=> {
    return a.published_at < b.published_at ? 1: -1;
  })

  return {
    props: {
      arts,
    },
  }
}

