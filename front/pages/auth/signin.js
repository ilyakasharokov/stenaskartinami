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

function VKIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.408 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.862-.525-2.049-1.714-1.033-1.01-1.49-.69-1.49.302v1.416c0 .302-.096.48-1.132.48-1.685 0-3.551-.993-4.865-2.847C6.395 12.027 5.5 9.516 5.5 8.316c0-.302.12-.576.575-.576h1.745c.438 0 .602.197.744.633.72 2.079 1.928 3.907 2.42 3.907.192 0 .275-.09.275-.552V9.516c-.053-1.01-.576-1.09-.576-1.45 0-.19.156-.376.42-.376h2.725c.36 0 .49.19.49.594v3.167c0 .37.156.49.276.49.192 0 .348-.12.696-.468 1.086-1.21 1.85-3.072 1.85-3.072.102-.228.3-.456.734-.456h1.744c.522 0 .636.275.522.636-.24.97-2.495 4.272-2.495 4.272-.19.312-.264.456 0 .804.192.264.828.79 1.25 1.272.762.888 1.344 1.632 1.5 2.147.18.516-.102.78-.54.78z"/>
    </svg>
  );
}

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
      <Head><title>Войти | Стена с картинами</title></Head>
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
            <button className="login-page__btn-vk" onClick={() => signIn('vk')}>
              <VKIcon /> Войти через VK
            </button>
            <button className="login-page__btn-google" onClick={() => signIn('google')}>
              <GoogleIcon /> Войти через Google
            </button>
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
