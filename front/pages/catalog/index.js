import MainLayout from "@/components/layouts/MainLayout"
import { useState, useEffect } from "react"
import { API_HOST, CATALOG_ITEMS_PER_PAGE } from '@/constants/constants'
import CatalogCmp from "@/components/catalog/catalog"
import Head from 'next/head'
import serialize from '@/utils/serialize'
import { fetchStrapi } from '@/utils/strapi'
import { cachedFetch } from '@/utils/server-cache'

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


export const getServerSideProps = async () => {
  try {
    const query = {
      _start: 0,
      _limit: CATALOG_ITEMS_PER_PAGE,
      populate: ['Pictures', 'Artist', 'styles', 'subjects', 'mediums', 'wall'],
      'filters[wall][$notNull]': true,
    };

    const [artsData, countData, styles, mediums, subjects, walls] = await Promise.all([
      cachedFetch('catalog:arts', 120, () => fetchStrapi(API_HOST + '/arts' + serialize(query))),
      cachedFetch('catalog:count', 120, () => fetchStrapi(API_HOST + '/arts/count' + serialize(query))),
      cachedFetch('catalog:styles', 600, () => fetchStrapi(API_HOST + '/styles/')),
      cachedFetch('catalog:mediums', 600, () => fetchStrapi(API_HOST + '/mediums/')),
      cachedFetch('catalog:subjects', 600, () => fetchStrapi(API_HOST + '/subjects/')),
      cachedFetch('catalog:walls', 600, () => fetchStrapi(API_HOST + '/walls/')),
    ]);

    const arts = (Array.isArray(artsData) ? artsData : []).sort((a, b) => {
      const aPublished = a.publishedAt || a.published_at;
      const bPublished = b.publishedAt || b.published_at;
      return aPublished < bPublished ? 1 : -1;
    });
    const count = countData?.count ?? countData?.meta?.pagination?.total ?? 0;

    return {
      props: {
        arts,
        count,
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
