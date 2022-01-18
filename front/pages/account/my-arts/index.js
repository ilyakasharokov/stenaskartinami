import MainLayout from "@/components/layouts/MainLayout"
import { useState, useEffect } from "react"
import Head from 'next/head'
import { useSession, session } from "next-auth/client";
import ProductListStatic from '@/components/catalog/product-list-static'
import CatalogCmp from "@/components/catalog/catalog"

export default function MyArts() {

  const [ session, loading ] = useSession();
  const [ arts, setArts ] = useState([]);

  useEffect(()=> {
	  if(session && session.info){
		  setArts(session.info.created_arts.reverse())
		console.log(session.info.created_arts)
	  }
  }, [session, session && session.info.created_arts])

  return (<MainLayout>
    <Head>
      <title>Мои картины | Стена с картинами, облачная галерея</title>
    </Head>
    <div className="account-page favorite-page">
      {
        session && session.user.name &&  
        <div className="content-user">
          <CatalogCmp arts={arts} hideFiltersForce={true} hideSort={true} emptyText={"Вы пока не добавили ни одной картины :("}
          title="Мои картины"></CatalogCmp>         
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
