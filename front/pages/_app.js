import '../styles/index.scss'
import 'react-image-crop/dist/ReactCrop.css'
import { SessionProvider as Provider } from 'next-auth/react'
import Head from 'next/head'

export default function App({ Component, pageProps }) {
  return <Provider session={pageProps.session}>
    <Head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    </Head>
    <Component {...pageProps} />
  </Provider>
}