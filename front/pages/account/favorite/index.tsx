import MainLayout from "@/components/layouts/MainLayout"
import { useState, useEffect } from "react"
import Head from 'next/head'
import { useSession } from "next-auth/react";
import CatalogCmp from "@/components/catalog/catalog"
import Preloader from "@/components/preloader/preloader"
import { API_HOST } from "@/constants/constants"
import { fetchStrapi } from "@/utils/strapi"

// Session stores favorites as bare { id } refs — fetch full art objects for the cards
async function fetchArtsByIds(ids: number[]) {
  const out: any[] = []
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100)
    const filters = chunk.map((id, n) => `filters[id][$in][${n}]=${id}`).join('&')
    const json = await fetchStrapi(
      `${API_HOST}/arts?${filters}&populate[0]=Pictures&populate[1]=Artist&pagination[pageSize]=100`
    )
    if (Array.isArray(json)) out.push(...json)
  }
  // restore favorites order (ids are already latest-first)
  const pos = new Map(ids.map((id, n) => [id, n]))
  return out.sort((a, b) => (pos.get(a.id) ?? 0) - (pos.get(b.id) ?? 0))
}

export default function Favorite() {
  const { data: session, status } = useSession();
  const [arts, setArts] = useState<any[] | null>(null);

  useEffect(() => {
    if (!session?.info || !Array.isArray(session.info.arts)) return
    const ids = [...session.info.arts].reverse().map((a: any) => a.id).filter(Boolean)
    if (!ids.length) { setArts([]); return }
    let cancelled = false
    fetchArtsByIds(ids)
      .then(full => { if (!cancelled) setArts(full) })
      .catch(() => { if (!cancelled) setArts([]) })
    return () => { cancelled = true }
  }, [session])

  return (<MainLayout>
    <Head>
      <title>Избранное | Стена с картинами</title>
      <meta name="robots" content="noindex" />
    </Head>
    <div className="account-page favorite-page">
      {status === 'loading' && <Preloader />}
      {
        session && session.user?.name &&
        <div className="content-user">
          {arts === null
            ? <Preloader />
            : <CatalogCmp arts={arts} hideFiltersForce={true} hideSort={true}
                title="Избранное" emptyText="Вы ещё ничего не добавили в избранное" />
          }
        </div>
      }
      {
        status === 'unauthenticated' &&
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
