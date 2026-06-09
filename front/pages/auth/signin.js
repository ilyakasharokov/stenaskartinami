import { getProviders, signIn } from 'next-auth/react';
import Head from 'next/head';
import { useSession } from 'next-auth/react';
import Router from 'next/router';
import Link from 'next/link';
import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';

const TelegramLoginButton = dynamic(() => import('@/components/auth/TelegramLoginButton'), { ssr: false });

export default function SignIn({ providers }) {
  const { data: session } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (session) { Router.push('/'); return null; }

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
    const res = await fetch('/api/auth/verify-telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tgUser),
    });
    const data = await res.json();
    if (!res.ok) { setLoading(false); setError(data.error); return; }
    await signIn('telegram', {
      strapiJwt: data.jwt,
      userId: String(data.user.id),
      userName: data.user.username,
      userPhoto: tgUser.photo_url || '',
      redirect: false,
    });
    Router.push('/');
  }, []);

  const oauthProviders = Object.values(providers || {}).filter(
    p => !['credentials', 'phone', 'telegram'].includes(p.id)
  );

  return (
    <>
      <Head><title>Войти | Стена с картинами</title></Head>
      <div className="login-page__wrapper">
        <div className="login-page">
          <div className="login-page__logo">
            <img src="/images/newlogo2.svg" />
            <div className="login-page__text">Стена с картинами</div>
          </div>

          <form className="login-page__form" onSubmit={handleSubmit}>
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
            <input type="password" placeholder="Пароль" value={password} onChange={e => setPassword(e.target.value)} required />
            {error && <div className="login-page__error">{error}</div>}
            <button type="submit" disabled={loading}>{loading ? 'Вход...' : 'Войти'}</button>
          </form>

          <div className="login-page__divider">или</div>

          <TelegramLoginButton onAuth={handleTelegramAuth} />

          {oauthProviders.map(provider => (
            <div key={provider.name}>
              <button onClick={() => signIn(provider.id)}>Войти через {provider.name}</button>
            </div>
          ))}

          <div className="login-page__signup-link">
            Нет аккаунта? <Link href="/auth/signup">Зарегистрироваться</Link>
          </div>
        </div>
      </div>
    </>
  );
}

export async function getServerSideProps() {
  const providers = await getProviders();
  return { props: { providers } };
}
