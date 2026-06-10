import { signIn } from 'next-auth/react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import Head from 'next/head';
import Router from 'next/router';
import Link from 'next/link';
import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';

const TelegramLoginButton = dynamic(() => import('@/components/auth/TelegramLoginButton'), { ssr: false });

const ERROR_MESSAGES = {
  Callback: 'Ошибка при входе через внешний сервис. Попробуйте другой способ.',
  OAuthSignin: 'Не удалось начать вход через OAuth.',
  OAuthCallback: 'Ошибка ответа от OAuth-провайдера.',
  OAuthAccountNotLinked: 'Этот аккаунт уже привязан к другому способу входа.',
  Default: 'Произошла ошибка. Попробуйте ещё раз.',
};

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

export default function SignIn({ authError }) {
  const [tab, setTab] = useState('email'); // 'email' | 'phone'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [otpStep, setOtpStep] = useState('phone'); // 'phone' | 'code'
  const [error, setError] = useState(authError || '');
  const [loading, setLoading] = useState(false);

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await signIn('credentials', { email, password, redirect: false });
    setLoading(false);
    if (res?.error) { setError('Неверный email или пароль'); return; }
    Router.push('/auth/onboarding');
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error); return; }
    setOtpToken(data.token);
    setOtpStep('code');
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: otpToken, code }),
    });
    const data = await res.json();
    if (!res.ok) { setLoading(false); setError(data.error); return; }
    await signIn('phone', {
      strapiJwt: data.jwt,
      userId: String(data.user.id),
      userName: data.user.username,
      userEmail: data.user.email,
      redirect: false,
    });
    Router.push('/auth/onboarding');
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
      Router.push('/auth/onboarding');
    } catch {
      setLoading(false);
      setError('Ошибка входа через Telegram');
    }
  }, []);

  const switchTab = (t) => {
    setTab(t);
    setError('');
    setOtpStep('phone');
    setCode('');
    setOtpToken('');
  };

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

          <div className="login-page__tabs">
            <button
              type="button"
              className={`login-page__tab${tab === 'email' ? ' active' : ''}`}
              onClick={() => switchTab('email')}
            >
              Email
            </button>
            <button
              type="button"
              className={`login-page__tab${tab === 'phone' ? ' active' : ''}`}
              onClick={() => switchTab('phone')}
            >
              Телефон
            </button>
          </div>

          {tab === 'email' && (
            <form className="login-page__form" onSubmit={handleEmailSubmit}>
              <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
              <input type="password" placeholder="Пароль" value={password} onChange={e => setPassword(e.target.value)} required />
              {error && <div className="login-page__error">{error}</div>}
              <button type="submit" className="login-page__btn-primary" disabled={loading}>
                {loading ? 'Вход...' : 'Войти'}
              </button>
            </form>
          )}

          {tab === 'phone' && otpStep === 'phone' && (
            <form className="login-page__form" onSubmit={handleSendOtp}>
              <input
                type="tel"
                placeholder="+7 900 000 00 00"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                required
                autoFocus
              />
              {error && <div className="login-page__error">{error}</div>}
              <button type="submit" className="login-page__btn-primary" disabled={loading}>
                {loading ? 'Отправка...' : 'Получить код'}
              </button>
            </form>
          )}

          {tab === 'phone' && otpStep === 'code' && (
            <form className="login-page__form" onSubmit={handleVerifyOtp}>
              <div className="login-page__hint">Код отправлен на {phone}</div>
              <input
                type="text"
                placeholder="Код из SMS"
                value={code}
                onChange={e => setCode(e.target.value)}
                required
                maxLength={4}
                inputMode="numeric"
                autoFocus
              />
              {error && <div className="login-page__error">{error}</div>}
              <button type="submit" className="login-page__btn-primary" disabled={loading}>
                {loading ? 'Проверка...' : 'Войти'}
              </button>
              <button type="button" className="login-page__link-btn" onClick={() => setOtpStep('phone')}>
                Изменить номер
              </button>
            </form>
          )}

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

export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions);
  if (session) {
    return { redirect: { destination: '/', permanent: false } };
  }
  const errorKey = context.query?.error || null;
  const authError = errorKey ? (ERROR_MESSAGES[errorKey] || ERROR_MESSAGES.Default) : null;
  return { props: { authError } };
}
