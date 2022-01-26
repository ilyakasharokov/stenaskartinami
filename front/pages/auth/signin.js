import { getProviders, signIn } from 'next-auth/client'
import Head from 'next/head'
import { useSession } from "next-auth/client";
import Router from 'next/router'

export default function SignIn({ providers }) {

    const [session, loading] = useSession();

    if(session){
        Router.push('/')
    }

    return (
        <>
            <Head>
                <title>Авторизация | Стена с картинами</title>
            </Head>
            <div className="login-page__wrapper">
                <div className="login-page">
                    <div className="login-page__logo">
                        <img src="/images/newlogo2.svg"/> 
                        <div className="login-page__text">Стена с картинами</div>
                    </div>
                    {Object.values(providers).map(provider => (
                        <div key={provider.name}>
                        <button onClick={() => signIn(provider.id)}>Войти через {provider.name}</button>
                        </div>
                    ))}
                </div>
            </div>
        </>
    )
}

// This is the recommended way for Next.js 9.3 or newer
export async function getServerSideProps(context){
  const providers = await getProviders()
  console.log(providers)
  // const csrfToken = await getCsrfToken(context)
  return {
    props: { providers }
  }
}

/*
// If older than Next.js 9.3
SignIn.getInitialProps = async () => {
  return {
    providers: await getProviders()
  }
}
*/