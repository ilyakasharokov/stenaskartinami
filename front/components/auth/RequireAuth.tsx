import { useEffect } from 'react'
import Head from 'next/head'
import { useAuthModal } from '@/components/auth/AuthModal'

// Rendered by protected pages when the visitor has no session. Instead of a hard
// redirect, it shows a light placeholder and opens the auth modal. After a
// successful sign-in the modal refreshes the page (Router.replace), so
// getServerSideProps re-runs with the session and renders the real form.
export default function RequireAuth({ title = 'Требуется вход', text = 'Эта страница доступна только авторизованным пользователям.' }) {
  const { open } = useAuthModal()
  useEffect(() => { open() }, [open])
  return (
    <>
      <Head><meta name="robots" content="noindex" /></Head>
      <div className="require-auth">
        <div className="require-auth__card">
          <h1 className="require-auth__title">{title}</h1>
          <p className="require-auth__text">{text}</p>
          <button type="button" className="require-auth__btn" onClick={open}>
            Войти или зарегистрироваться
          </button>
        </div>
      </div>
    </>
  )
}
