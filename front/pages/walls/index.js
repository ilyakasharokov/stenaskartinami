import MainLayout from "@/components/layouts/MainLayout"
import { API_HOST } from '@/constants/constants'
import Head from 'next/head'
import { YMaps, Map, Placemark, ZoomControl } from 'react-yandex-maps';

export default function Catalog({ walls }) {

  return (<MainLayout>
    <Head>
      <title>Галереи картин на карте | Стена с картинами, облачная галерея</title>
    </Head>
    <div className="content-page">
      <h1>Стены на карте</h1>
      <YMaps>
        <Map defaultState={walls[0].Coordinates} style={{width: '100%', height: '500px'}} >
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
  const res = await fetch(API_HOST + '/walls/')
  const json = await res.json()
  const walls = json
  walls.forEach((wall)=>wall.arts = wall.arts.sort((a,b)=> {
    return a.published_at < b.published_at ? 1: -1;
  }));
  return {
    props: {
      walls,
    },
    revalidate: 60,
  }
}
