import MainLayout from "@/components/layouts/MainLayout"
import { API_HOST } from '@/constants/constants'
import { fetchStrapi } from '@/utils/strapi'
import serialize from '@/utils/serialize'
import Head from 'next/head'
import { YMaps, Map, Placemark, ZoomControl } from 'react-yandex-maps';

export default function Catalog({ walls }) {

  const defaultCoords = { center: [58.456994503197755, 35.370069459975745], zoom: 5 }

  return (<MainLayout>
    <Head>
      <title>Галереи картин на карте | Стена с картинами, облачная галерея</title>
    </Head>
    <div className="content-page">
      <h1>Стены на карте</h1>
      <YMaps>
        <Map defaultState={walls[0]?.Coordinates || defaultCoords} style={{width: '100%', height: '500px'}} >
        <ZoomControl/>
        {
          walls.map( wall =>
            wall.Coordinates &&
            <Placemark geometry={wall.Coordinates.center} options={{ iconLayout: 'default#image', iconImageHref: '/images/mapicon.png', iconImageSize: [40, 40], iconImageOffset: [-20, -20]}} />
          )
        }
        </Map>
      </YMaps>
    </div>
    
  </MainLayout>
  )
}

/* Catalog.getInitialProps = async (ctx) => {
  const res = await fetch(API_HOST + '/arts')
  const json = await res.json()
  const arts = json.sort((a,b)=> {
    return a.published_at < b.published_at ? 1: -1;
  })
  return { arts: arts } 
} */


export const getStaticProps = async () => {
  try {
    const json = await fetchStrapi(API_HOST + '/walls' + serialize({ populate: 'deep,2' }))
    const walls = Array.isArray(json) ? json : []
    walls.forEach((wall) => {
      const wallArts = Array.isArray(wall.arts) ? wall.arts : []
      wall.arts = wallArts.sort((a, b) => {
        const aPublished = a.publishedAt || a.published_at;
        const bPublished = b.publishedAt || b.published_at;
        return aPublished < bPublished ? 1 : -1;
      });
    });
    return { props: { walls }, revalidate: 60 }
  } catch {
    return { props: { walls: [] }, revalidate: 60 }
  }
}
