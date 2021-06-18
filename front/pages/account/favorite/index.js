import MainLayout from "../../../components/layouts/MainLayout"
import { useState, useEffect } from "react"
import Head from 'next/head'
import { useSession, session } from "next-auth/client";
import ProductListStatic from '../../../components/catalog/product-list-static'
import CatalogCmp from "../../../components/catalog/catalog"

export default function Catalog() {

  const [ session, loading ] = useSession();
  const [ arts, setArts ] = useState([]);

  useEffect(()=> {
	  if(session && session.info){
		  setArts(session.info.arts)
		console.log(arts)
	  }
  }, [session])

  return (<MainLayout>
    <Head>
      <title>Избранное | Стена с картинами, облачная галерея</title>
    </Head>
    <div className="account-page favorite-page">
      {
        session && session.user.name &&
        <div className="content-user">
<CatalogCmp arts={arts} hideFiltersForce={true} hideSort={true}
 title="Избранное"></CatalogCmp>         
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
