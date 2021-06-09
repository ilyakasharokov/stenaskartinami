import MainLayout from "../../components/layouts/MainLayout"
import { useState, useEffect } from "react"
import { API_HOST } from '../../constants/constants'
import CatalogCmp from "../../components/catalog/catalog"
import Head from 'next/head'

export default function  Artist({ artist }) {
  let arts = artist && artist.Arts;
  console.log(artist)
  return (<MainLayout>
    <Head>
      <title>Художник {artist?.full_name}, { artist?.description ? 'краткая биография, ':''} каталог картин  | Стена с картинами, облачная галерея</title>
    </Head>
    {
      artist && 
      <div className="wide-page">
        <CatalogCmp arts={arts} hideFiltersForce={true} hideSort={true} title={`${artist.full_name}, каталог картин.`} description={artist.description}></CatalogCmp>
      </div>
    }
  </MainLayout>
  )
}

export async function getStaticPaths() {
  const res = await fetch(API_HOST + '/artists/')
  const json = await res.json()
  return {
    paths: json.map(item => { 
      return {params: { slug: item.slug + '--' + item.id }}
  }),
    fallback: true
  }
}

export const getStaticProps = async ({params: {
  slug
}}) => {
  let id = slug.split('--')[1]
  const res = await fetch(API_HOST + '/artists/' + id)
  const json = await res.json()
  const artist = json
  
  return {
    props: {
      artist,
    },
    revalidate: 60,
  }
}

