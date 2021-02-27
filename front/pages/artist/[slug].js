import MainLayout from "../../components/layouts/MainLayout"
import { useState, useEffect } from "react"
import { API_HOST } from '../../constants/constants'
import CatalogCmp from "../../components/catalog/catalog"
import { Head} from 'next/document'

export default function  Artist({ artist }) {
  let arts = artist && artist.Arts;
  console.log(artist)
  return (<MainLayout>
    <h1>{artist.full_name}, каталог картин.</h1>

    <CatalogCmp arts={arts}></CatalogCmp>
  </MainLayout>
  )
}

 Artist.getInitialProps = async ({query}) => {
  let id = query.slug.split('--')[1]
  const res = await fetch(API_HOST + '/artists/' + id)
  const json = await res.json()
  const artist = json
  return { artist: artist }
}