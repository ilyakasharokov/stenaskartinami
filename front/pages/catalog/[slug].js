import MainLayout from "@/components/layouts/MainLayout"
import { useState, useEffect } from "react"

import { API_HOST } from '@/constants/constants'
import { fetchStrapi } from '@/utils/strapi'
import serialize from '@/utils/serialize'

import CatalogCmp from "@/components/catalog/catalog"

export default function Catalog({ arts }) {

  return (<MainLayout>
    <h1>Каталог</h1>
    <CatalogCmp arts={arts}></CatalogCmp>
  </MainLayout>
  )
}

export async function getStaticPaths() {
  const json = await fetchStrapi(API_HOST + '/styles/')
  const styles = Array.isArray(json) ? json : []
  return {
    paths: styles.map(item => { 
      return {params: { slug: item.slug }}
  }),
    fallback: false
  }
}


export const getStaticProps = async () => {
  const json = await fetchStrapi(
    API_HOST + '/arts' + serialize({ populate: ['Pictures', 'Artist', 'styles', 'subjects', 'mediums', 'wall'] })
  )
  const list = Array.isArray(json) ? json : []
  const arts = list.sort((a,b)=> {
    const aPublished = a.publishedAt || a.published_at;
    const bPublished = b.publishedAt || b.published_at;
    return aPublished < bPublished ? 1: -1;
  })

  return {
    props: {
      arts,
    },
  }
}

