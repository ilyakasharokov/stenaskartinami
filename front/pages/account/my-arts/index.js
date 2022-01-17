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
		  setArts(session.info.arts.reverse())
		console.log(arts)
	  }
  }, [session, session && session.info.arts])

  return (<MainLayout>
    <Head>
      <title>Мои картины | Стена с картинами, облачная галерея</title>
    </Head>
    <div className="account-page favorite-page">
      {
        session && session.user.name && session.user.info && 
        <div className="content-user">
<CatalogCmp arts={session.user.info.created_arts} hideFiltersForce={true} hideSort={true}
 title="Загруженные картины"></CatalogCmp>         
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
