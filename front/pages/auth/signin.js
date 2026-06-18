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


// Tabs: 'email' = email OTP, 'phone' = SMS OTP
export default function SignIn({ authError }) {
  const smsEnabled = process.env.NEXT_PUBLIC_SMS_ENABLED === 'true';
  const [tab, setTab] = useState('email');

  // Email OTP state
  const [email, setEmail] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [emailToken, setEmailToken] = useState('');
  const [emailStep, setEmailStep] = useState('email'); // 'email' | 'code'

  // Phone OTP state
  const [phone, setPhone] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [phoneToken, setPhoneToken] = useState('');
  const [phoneStep, setPhoneStep] = useState('phone'); // 'phone' | 'code'

  const [error, setError] = useState(authError || '');
  const [loading, setLoading] = useState(false);

  // ── Email OTP ──────────────────────────────────────────
  const handleSendEmailOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await fetch('/api/auth/send-email-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error); return; }
    setEmailToken(data.token);
    setEmailStep('code');
  };

  const handleVerifyEmailOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await fetch('/api/auth/verify-email-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: emailToken, code: emailCode }),
    });
    const data = await res.json();
    if (!res.ok) { setLoading(false); setError(data.error); return; }
    await signIn('email-otp', {
      strapiJwt: data.jwt,
      userId: String(data.user.id),
      userName: data.user.username,
      userEmail: data.user.email,
      redirect: false,
    });
    Router.push('/auth/onboarding');
  };

  // ── Phone OTP ──────────────────────────────────────────
  const handleSendPhoneOtp = async (e) => {
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
    setPhoneToken(data.token);
    setPhoneStep('code');
  };

  const handleVerifyPhoneOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: phoneToken, code: phoneCode }),
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

  // ── Telegram ───────────────────────────────────────────
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
    setEmailStep('email');
    setPhoneStep('phone');
    setEmailCode('');
    setPhoneCode('');
    setEmailToken('');
    setPhoneToken('');
  };

  const tabs = [
    { key: 'email', label: 'Email' },
    ...(smsEnabled ? [{ key: 'phone', label: 'Телефон' }] : []),
  ];

  return (
    <>
      <Head><title>Войти | Стена с картинами</title><meta name="robots" content="noindex" /></Head>
      <div className="login-page__wrapper">
        <div className="login-page">
          <div className="login-page__logo">
            <img src="/images/newlogo2.svg" alt="" />
            <div className="login-page__text">Стена с картинами</div>
          </div>

          <div className="login-page__title">Войти</div>

          {tabs.length > 1 && (
            <div className="login-page__tabs">
              {tabs.map(t => (
                <button key={t.key} type="button"
                  className={`login-page__tab${tab === t.key ? ' active' : ''}`}
                  onClick={() => switchTab(t.key)}>
                  {t.label}
                </button>
              ))}
            </div>
          )}

          {/* Email OTP */}
          {tab === 'email' && emailStep === 'email' && (
            <form className="login-page__form" onSubmit={handleSendEmailOtp}>
              <input
                type="email"
                placeholder="Ваш email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
              />
              {error && <div className="login-page__error">{error}</div>}
              <button type="submit" className="login-page__btn-primary" disabled={loading}>
                {loading ? 'Отправка…' : 'Получить код'}
              </button>
            </form>
          )}

          {tab === 'email' && emailStep === 'code' && (
            <form className="login-page__form" onSubmit={handleVerifyEmailOtp}>
              <div className="login-page__hint">Код отправлен на <b>{email}</b></div>
              <input
                type="text"
                placeholder="Код из письма"
                value={emailCode}
                onChange={e => setEmailCode(e.target.value)}
                required
                maxLength={4}
                inputMode="numeric"
                autoFocus
              />
              {error && <div className="login-page__error">{error}</div>}
              <button type="submit" className="login-page__btn-primary" disabled={loading}>
                {loading ? 'Проверка…' : 'Войти'}
              </button>
              <button type="button" className="login-page__link-btn" onClick={() => { setEmailStep('email'); setError(''); }}>
                Изменить email
              </button>
            </form>
          )}

          {/* Phone OTP */}
          {tab === 'phone' && phoneStep === 'phone' && (
            <form className="login-page__form" onSubmit={handleSendPhoneOtp}>
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
                {loading ? 'Отправка…' : 'Получить код'}
              </button>
            </form>
          )}

          {tab === 'phone' && phoneStep === 'code' && (
            <form className="login-page__form" onSubmit={handleVerifyPhoneOtp}>
              <div className="login-page__hint">Код отправлен на {phone}</div>
              <input
                type="text"
                placeholder="Код из SMS"
                value={phoneCode}
                onChange={e => setPhoneCode(e.target.value)}
                required
                maxLength={4}
                inputMode="numeric"
                autoFocus
              />
              {error && <div className="login-page__error">{error}</div>}
              <button type="submit" className="login-page__btn-primary" disabled={loading}>
                {loading ? 'Проверка…' : 'Войти'}
              </button>
              <button type="button" className="login-page__link-btn" onClick={() => { setPhoneStep('phone'); setError(''); }}>
                Изменить номер
              </button>
            </form>
          )}

          <div className="login-page__divider">или</div>

          <div className="login-page__social">
            <TelegramLoginButton onAuth={handleTelegramAuth} />
          </div>

          <div className="login-page__signup-link">
            Нет аккаунта? <Link href="/auth/signin">Вход создаст его автоматически</Link>
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
