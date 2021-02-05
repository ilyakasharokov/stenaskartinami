import Head from 'next/head'
import Link from 'next/link'
import MainLayout from '../components/layouts/MainLayout'

export default function Home() {
  return (
    
    <div className="container">
      <Head>
        <title>Картины: купить искусство онлайн</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="demo-page">
        <div className="logo">
          <img src="/images/Logo_stenaskartinami_black.svg"/> 
          <div className="logo__text">stenaskartinami.com</div>
        </div>

      
      </main>
      
    </div>
  )
}
