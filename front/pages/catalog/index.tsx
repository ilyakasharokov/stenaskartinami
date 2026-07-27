import MainLayout from "@/components/layouts/MainLayout"
import { useState, useEffect } from "react"
import { API_HOST, CATALOG_ITEMS_PER_PAGE } from '@/constants/constants'
import CatalogCmp from "@/components/catalog/catalog"
import Head from 'next/head'
import serialize from '@/utils/serialize'
import { fetchStrapi } from '@/utils/strapi'
import { cachedFetch } from '@/utils/server-cache'

export default function Catalog({ arts, filters, count, initialPage }) {

  return (<MainLayout>
    <Head>
      <title>Каталог картин — купить живопись онлайн | Стена с картинами</title>
      <meta name="description" content="Каталог картин современных художников: масло, акварель, акрил, графика. Фильтры по стилю, технике, жанру. Доставка по России." />
      <link rel="canonical" href="https://stenaskartinami.com/catalog" />
      <meta property="og:type"        content="website" />
      <meta property="og:site_name"   content="Стена с картинами" />
      <meta property="og:title"       content="Каталог картин — купить живопись онлайн" />
      <meta property="og:description" content="Каталог картин современных художников: масло, акварель, акрил, графика. Доставка по России." />
      <meta property="og:url"         content="https://stenaskartinami.com/catalog" />
      <meta property="og:image"       content="https://stenaskartinami.com/images/addart.jpeg" />
      <meta name="twitter:card"  content="summary_large_image" />
      <meta name="twitter:image" content="https://stenaskartinami.com/images/addart.jpeg" />
    </Head>
    <CatalogCmp arts={ arts } title={'Каталог'} filters={ filters } count={count} useURLParams={true} initialPage={initialPage}></CatalogCmp>
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


export const getServerSideProps = async ({ query: urlQuery }) => {
  try {
    const page = parseInt(urlQuery.page) || 1
    const _start = (page - 1) * CATALOG_ITEMS_PER_PAGE

    const query = {
      _start,
      _limit: CATALOG_ITEMS_PER_PAGE,
      populate: ['Pictures', 'Artist', 'styles', 'subjects', 'mediums', 'wall'],
      'filters[wall][$notNull]': true,
      ...urlQuery,
    }
    delete query.page

    const [artsData, countData, styles, mediums, subjects, walls] = await Promise.all([
      fetchStrapi(API_HOST + '/arts' + serialize(query)),
      fetchStrapi(API_HOST + '/arts/count' + serialize(query)),
      cachedFetch('catalog:styles', 600, () => fetchStrapi(API_HOST + '/styles?filters[arts][wall][id][$notNull]=true&pagination[pageSize]=1000&sort=Title:asc')),
      cachedFetch('catalog:mediums', 600, () => fetchStrapi(API_HOST + '/mediums?filters[arts][wall][id][$notNull]=true&pagination[pageSize]=1000&sort=title:asc')),
      cachedFetch('catalog:subjects', 600, () => fetchStrapi(API_HOST + '/subjects?filters[arts][wall][id][$notNull]=true&pagination[pageSize]=1000&sort=Title:asc')),
      cachedFetch('catalog:walls', 600, () => fetchStrapi(API_HOST + '/walls?filters[arts][id][$notNull]=true&pagination[pageSize]=1000&sort=Title:asc')),
    ]);

    const arts = Array.isArray(artsData) ? artsData : [];
    const count = countData?.count ?? countData?.meta?.pagination?.total ?? 0;

    return {
      props: {
        arts,
        count,
        initialPage: page,
        filters: {
          styles: Array.isArray(styles) ? styles : [],
          mediums: Array.isArray(mediums) ? mediums : [],
          subjects: Array.isArray(subjects) ? subjects : [],
          wall: Array.isArray(walls) ? walls : [],
        },
      },
    };
  } catch {
    return {
      props: {
        arts: [],
        filters: { styles: [], mediums: [], subjects: [], walls: [] },
        count: 0,
      },
    }
  }
}
