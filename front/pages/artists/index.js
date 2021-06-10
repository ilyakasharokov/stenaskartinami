import MainLayout from "../../components/layouts/MainLayout"
import { useState, useEffect } from "react"
import { API_HOST } from '../../constants/constants'
import CatalogCmp from "../../components/catalog/catalog"
import Head from 'next/head'

export default function  Artists({ artists }) {
    let groups = [], letter, groupIndex = -1;
    console.log(artists)
    for( let artist of artists){
        if(artist){
            if( artist.full_name[0].toUpperCase() !== letter ){
                letter = artist.full_name[0].toUpperCase();
                groups[++groupIndex] = {
                    letter,
                    artists: []
                }
            }
            groups[groupIndex].artists.push(artist)
        }
    }
    return (<MainLayout>
        <Head>
        <title>Художник художников  | Стена с картинами, облачная галерея</title>
        </Head>
        {
            groups && 
            <div className="wide-page artists-page">
            {
                groups.map( group => 
                    <div className="artist-group">
                        <div className="artist-group__letter">{group.letter}</div>
                        <div className="artist-group__list">
                        {
                            group.artists.map(artist => 
                                <div>{artist.full_name}</div>
                            )
                        }
                        </div>
                    </div>
                )
            }
            </div>
        }
    </MainLayout>
    )
}

export const getStaticProps = async () => {
  const res = await fetch(API_HOST + '/artists/')
  const json = await res.json()
  let artists = json
  artists = artists.sort((a,b) => {
      return a.full_name < b.full_name ? -1: 1;
  })
  return {
    props: {
      artists,
    },
    revalidate: 60,
  }
}
