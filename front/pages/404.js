import MainLayout from "../components/layouts/MainLayout"
import Link from 'next/link'
import Head from 'next/head'

export default function ErrorPage({ Component, pageProps }) {
  return (<MainLayout>
    <Head>
      <title>Страница не найдена | Стена с картинами</title>
    </Head>
    <div className="page-404">
      <div className="vertical-flex">
        <h1>404</h1>
        <p>Упс! Такой страницы не существует, вернитесь на <Link href={'/'}><a>главную</a></Link> или в <Link href={'/catalog'}><a>каталог</a></Link>. </p>
      </div>
    </div>
  </MainLayout>
  )
}