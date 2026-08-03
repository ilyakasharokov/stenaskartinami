import '../styles/index.scss'
import '../styles/moderator.scss'
import '../styles/moderator-artists.scss'
import '../styles/moderator-campaigns.scss'
import 'react-image-crop/dist/ReactCrop.css'
import { SessionProvider as Provider, useSession, signIn } from 'next-auth/react'
import Head from 'next/head'
import { useEffect } from 'react'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/auth/AuthModal'

function DevAutoLogin() {
  const { status } = useSession()
  useEffect(() => {
    // Respect an explicit logout during dev: once the user clicks "Выйти" we set
    // this flag so auto-login doesn't immediately sign them back in.
    const suppressed = typeof window !== 'undefined' && (
      sessionStorage.getItem('devAutoLoginOff') === '1' ||
      /(?:^|;\s*)devLoggedOut=1(?:;|$)/.test(document.cookie)
    )
    if (status === 'unauthenticated' && !suppressed) signIn('dev-auto', { redirect: false })
  }, [status])
  return null
}

export default function App({ Component, pageProps }) {
  return <Provider session={pageProps.session}>
    <ToastProvider>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </Head>
      {process.env.NEXT_PUBLIC_DEV_AUTO_LOGIN === 'true' && <DevAutoLogin />}
      <AuthModalProvider>
        <Component {...pageProps} />
      </AuthModalProvider>
    </ToastProvider>
  </Provider>
}