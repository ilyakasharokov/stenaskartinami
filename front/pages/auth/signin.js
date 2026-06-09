import { signIn } from 'next-auth/react';
import Head from 'next/head';
import { useSession } from 'next-auth/react';
import Router, { useRouter } from 'next/router';
import Link from 'next/link';
import { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';

const TelegramLoginButton = dynamic(() => import('@/components/auth/TelegramLoginButton'), { ssr: false });

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908C16.658 14.092 17.64 11.783 17.64 9.2z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z"/>
    </svg>
  );
}

const errorMessages = {
  Callback: 'Ошибка при входе через внешний сервис. Попробуйте другой способ.',
  OAuthSignin: 'Не удалось начать вход через OAuth.',
  OAuthCallback: 'Ошибка ответа от OAuth-провайдера.',
  OAuthAccountNotLinked: 'Этот аккаунт уже привязан к другому способу входа.',
  Default: 'Произошла ошибка. Попробуйте ещё раз.',
};

export default function SignIn() {
  const { data: session } = useSession();
  const { query } = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(errorMessages[query?.error] || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query?.error) setError(errorMessages[query.error] || errorMessages.Default);
  }, [query?.error]);

  useEffect(() => { if (session) Router.push('/'); }, [session]);
  if (session) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await signIn('credentials', { email, password, redirect: false });
    setLoading(false);
    if (res?.error) { setError('Неверный email или пароль'); return; }
    Router.push('/');
  };

  const handleTelegramAuth = useCallback(async (tgUser) => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tgUser),
      });
      const data = await res.json();
      if (!res.ok) { setLoading(false); setError(data.error || 'Ошибка входа через Telegram'); return; }
      const result = await signIn('telegram', {
        strapiJwt: data.jwt,
        userId: String(data.user.id),
        userName: data.user.username,
        userPhoto: tgUser.photo_url || '',
        redirect: false,
      });
      if (result?.error) { setLoading(false); setError('Ошибка входа через Telegram'); return; }
      Router.push('/');
    } catch {
      setLoading(false);
      setError('Ошибка входа через Telegram');
    }
  }, []);

  return (
    <>
      <Head><title>Войти | Стена с картинами</title></Head>
      <div className="login-page__wrapper">
        <div className="login-page">
          <div className="login-page__logo">
            <img src="/images/newlogo2.svg" alt="" />
            <div className="login-page__text">Стена с картинами</div>
          </div>

          <div className="login-page__title">Войти</div>

          <form className="login-page__form" onSubmit={handleSubmit}>
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
            <input type="password" placeholder="Пароль" value={password} onChange={e => setPassword(e.target.value)} required />
            {error && <div className="login-page__error">{error}</div>}
            <button type="submit" className="login-page__btn-primary" disabled={loading}>
              {loading ? 'Вход...' : 'Войти'}
            </button>
          </form>

          <div className="login-page__divider">или</div>

          <div className="login-page__social">
            <TelegramLoginButton onAuth={handleTelegramAuth} />
            <button className="login-page__btn-google" onClick={() => signIn('google')}>
              <GoogleIcon /> Войти через Google
            </button>
          </div>

          <div className="login-page__signup-link">
            Нет аккаунта? <Link href="/auth/signup">Зарегистрироваться</Link>
          </div>
        </div>
      </div>
    </>
  );
}

export async function getServerSideProps() {
  return { props: {} };
}
