import '../styles/index.scss'
import 'react-image-crop/dist/ReactCrop.css'
import { SessionProvider as Provider, useSession, signIn } from 'next-auth/react'
import Head from 'next/head'
import { useEffect } from 'react'

function DevAutoLogin() {
  const { status } = useSession()
  useEffect(() => {
    if (status === 'unauthenticated') signIn('dev-auto', { redirect: false })
  }, [status])
  return null
}

export default function App({ Component, pageProps }) {
  return <Provider session={pageProps.session}>
    <Head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    </Head>
    {process.env.NEXT_PUBLIC_DEV_AUTO_LOGIN === 'true' && <DevAutoLogin />}
    <Component {...pageProps} />
  </Provider>
}