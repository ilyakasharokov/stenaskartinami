import '../styles/index.scss'
import { Provider } from 'next-auth/client'
import Head from 'next/head'

export default function App({ Component, pageProps }) {
  return <Provider session={pageProps.session}>
    <Head>
      <meta name="viewport" content="initial-scale=1, maximum-scale=1"></meta>
    </Head>
    <Component {...pageProps} />
  </Provider>
}