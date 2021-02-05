import MainLayout from "../components/layouts/MainLayout"
import Link from 'next/link'

export default function ErrorPage({ Component, pageProps }) {
  return (<MainLayout>
    <h1>404</h1>
    <p>Упс! Такой страницы не существует, вернитесь на <Link href={'/'}>главную</Link>. </p>
  </MainLayout>
  )
}