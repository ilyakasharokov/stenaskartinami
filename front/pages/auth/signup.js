import Head from 'next/head';
import { useSession, signIn } from 'next-auth/react';
import Router from 'next/router';
import Link from 'next/link';
import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';

const TelegramLoginButton = dynamic(() => import('@/components/auth/TelegramLoginButton'), { ssr: false });

export default function SignUp() {
  const { data: session } = useSession();
  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [code, setCode] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (session) { Router.push('/'); return null; }

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
    setStep('otp');
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: otpToken, code, username }),
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

  return (
    <>
      <Head><title>Регистрация | Стена с картинами</title></Head>
      <div className="login-page__wrapper">
        <div className="login-page">
          <div className="login-page__logo">
            <img src="/images/newlogo2.svg" />
            <div className="login-page__text">Стена с картинами</div>
          </div>

          {step === 'phone' && (
            <form className="login-page__form" onSubmit={handleSendOtp}>
              <input
                type="text"
                placeholder="Имя пользователя"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                minLength={3}
              />
              <input
                type="tel"
                placeholder="+7 900 000 00 00"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                required
              />
              {error && <div className="login-page__error">{error}</div>}
              <button type="submit" disabled={loading}>
                {loading ? 'Отправка...' : 'Получить код'}
              </button>
            </form>
          )}

          {step === 'otp' && (
            <form className="login-page__form" onSubmit={handleVerifyOtp}>
              <p className="login-page__hint">Код отправлен на {phone}</p>
              <input
                type="text"
                placeholder="Введите код из SMS"
                value={code}
                onChange={e => setCode(e.target.value)}
                required
                maxLength={4}
                inputMode="numeric"
                autoFocus
              />
              {error && <div className="login-page__error">{error}</div>}
              <button type="submit" disabled={loading}>
                {loading ? 'Проверка...' : 'Подтвердить'}
              </button>
              <button type="button" className="login-page__link-btn" onClick={() => setStep('phone')}>
                Изменить номер
              </button>
            </form>
          )}

          <TelegramLoginButton onAuth={handleTelegramAuth} />
          {loading && <div className="login-page__hint">Подождите...</div>}

          <div className="login-page__signup-link">
            Уже есть аккаунт? <Link href="/auth/signin">Войти</Link>
          </div>
        </div>
      </div>
    </>
  );
}
