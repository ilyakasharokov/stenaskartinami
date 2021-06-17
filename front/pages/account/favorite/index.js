import MainLayout from "../../../components/layouts/MainLayout"
import { useState, useEffect } from "react"
import Head from 'next/head'
import { useSession } from "next-auth/client";
import ProductListStatic from '../../../components/catalog/product-list-static'

export default function Catalog() {

  const [ session, loading ] = useSession();
  const [ arts, setArts ] = useState([]);

  if(session && session.info){
    setArts(session.info.arts)
  }

  return (<MainLayout>
    <Head>
      <title>Избранное | Стена с картинами, облачная галерея</title>
    </Head>
    <div className="account-page favorite-page">
      {
        session && session.user.name &&
        <div className="content-user">
          <h1>Избранное</h1>
          <ProductListStatic arts={arts}></ProductListStatic>
        </div>
      }
      {
        !session &&
        <div className="content-user">
          <div className="account-page__unauthorized">
            Вы не авторизованы 
          </div>
        </div>
      }
    </div>
  </MainLayout>
  )
}