import { signIn } from 'next-auth/react'
import Router from 'next/router'
import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'

const TelegramLoginButton = dynamic(() => import('@/components/auth/TelegramLoginButton'), { ssr: false })

// Shared login/registration form — used by both the /auth/signin page and the
// global auth modal. `onDone` is called after a successful sign-in (default:
// go to onboarding).
export default function AuthForm({ authError = '', onDone }: { authError?: string; onDone?: () => void }) {
  const smsEnabled = process.env.NEXT_PUBLIC_SMS_ENABLED === 'true'
  const [tab, setTab] = useState('email')

  const [email, setEmail] = useState('')
  const [emailCode, setEmailCode] = useState('')
  const [emailToken, setEmailToken] = useState('')
  const [emailStep, setEmailStep] = useState('email')

  const [phone, setPhone] = useState('')
  const [phoneCode, setPhoneCode] = useState('')
  const [phoneToken, setPhoneToken] = useState('')
  const [phoneStep, setPhoneStep] = useState('phone')

  const [error, setError] = useState(authError || '')
  const [loading, setLoading] = useState(false)

  const done = () => {
    // Re-enable dev auto-login now that the user has explicitly signed in.
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('devAutoLoginOff')
      document.cookie = 'devLoggedOut=; path=/; max-age=0'
    }
    if (onDone) onDone(); else Router.push('/auth/onboarding')
  }

  const handleSendEmailOtp = async (e) => {
    e.preventDefault(); setError(''); setLoading(true)
    const res = await fetch('/api/auth/send-email-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) })
    const data = await res.json(); setLoading(false)
    if (!res.ok) { setError(data.error); return }
    setEmailToken(data.token); setEmailStep('code')
  }

  const handleVerifyEmailOtp = async (e) => {
    e.preventDefault(); setError(''); setLoading(true)
    const res = await fetch('/api/auth/verify-email-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: emailToken, code: emailCode }) })
    const data = await res.json()
    if (!res.ok) { setLoading(false); setError(data.error); return }
    await signIn('email-otp', { strapiJwt: data.jwt, userId: String(data.user.id), userName: data.user.username, userEmail: data.user.email, redirect: false })
    done()
  }

  const handleSendPhoneOtp = async (e) => {
    e.preventDefault(); setError(''); setLoading(true)
    const res = await fetch('/api/auth/send-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone }) })
    const data = await res.json(); setLoading(false)
    if (!res.ok) { setError(data.error); return }
    setPhoneToken(data.token); setPhoneStep('code')
  }

  const handleVerifyPhoneOtp = async (e) => {
    e.preventDefault(); setError(''); setLoading(true)
    const res = await fetch('/api/auth/verify-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: phoneToken, code: phoneCode }) })
    const data = await res.json()
    if (!res.ok) { setLoading(false); setError(data.error); return }
    await signIn('phone', { strapiJwt: data.jwt, userId: String(data.user.id), userName: data.user.username, userEmail: data.user.email, redirect: false })
    done()
  }

  const handleTelegramAuth = useCallback(async (tgUser) => {
    setError(''); setLoading(true)
    try {
      const res = await fetch('/api/auth/verify-telegram', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(tgUser) })
      const data = await res.json()
      if (!res.ok) { setLoading(false); setError(data.error || 'Ошибка входа через Telegram'); return }
      const result = await signIn('telegram', { strapiJwt: data.jwt, userId: String(data.user.id), userName: data.user.username, userPhoto: tgUser.photo_url || '', redirect: false })
      if (result?.error) { setLoading(false); setError('Ошибка входа через Telegram'); return }
      done()
    } catch {
      setLoading(false); setError('Ошибка входа через Telegram')
    }
  }, [])

  const switchTab = (t) => {
    setTab(t); setError('')
    setEmailStep('email'); setPhoneStep('phone')
    setEmailCode(''); setPhoneCode(''); setEmailToken(''); setPhoneToken('')
  }

  const tabs = [
    { key: 'email', label: 'Email' },
    ...(smsEnabled ? [{ key: 'phone', label: 'Телефон' }] : []),
  ]

  return (
    <div className="login-page">
      <div className="login-page__logo">
        <img src="/images/newlogo2.svg" alt="" />
        <div className="login-page__text">Стена с картинами</div>
      </div>

      <div className="login-page__title">Вход или регистрация</div>

      {tabs.length > 1 && (
        <div className="login-page__tabs">
          {tabs.map(t => (
            <button key={t.key} type="button" className={`login-page__tab${tab === t.key ? ' active' : ''}`} onClick={() => switchTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {tab === 'email' && emailStep === 'email' && (
        <form className="login-page__form" onSubmit={handleSendEmailOtp}>
          <input type="email" placeholder="Ваш email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
          {error && <div className="login-page__error">{error}</div>}
          <button type="submit" className="login-page__btn-primary" disabled={loading}>{loading ? 'Отправка…' : 'Получить код'}</button>
        </form>
      )}

      {tab === 'email' && emailStep === 'code' && (
        <form className="login-page__form" onSubmit={handleVerifyEmailOtp}>
          <div className="login-page__hint">Код отправлен на <b>{email}</b></div>
          <input type="text" placeholder="Код из письма" value={emailCode} onChange={e => setEmailCode(e.target.value)} required maxLength={4} inputMode="numeric" autoFocus />
          {error && <div className="login-page__error">{error}</div>}
          <button type="submit" className="login-page__btn-primary" disabled={loading}>{loading ? 'Проверка…' : 'Войти'}</button>
          <button type="button" className="login-page__link-btn" onClick={() => { setEmailStep('email'); setError('') }}>Изменить email</button>
        </form>
      )}

      {tab === 'phone' && phoneStep === 'phone' && (
        <form className="login-page__form" onSubmit={handleSendPhoneOtp}>
          <input type="tel" placeholder="+7 900 000 00 00" value={phone} onChange={e => setPhone(e.target.value)} required autoFocus />
          {error && <div className="login-page__error">{error}</div>}
          <button type="submit" className="login-page__btn-primary" disabled={loading}>{loading ? 'Отправка…' : 'Получить код'}</button>
        </form>
      )}

      {tab === 'phone' && phoneStep === 'code' && (
        <form className="login-page__form" onSubmit={handleVerifyPhoneOtp}>
          <div className="login-page__hint">Код отправлен на {phone}</div>
          <input type="text" placeholder="Код из SMS" value={phoneCode} onChange={e => setPhoneCode(e.target.value)} required maxLength={4} inputMode="numeric" autoFocus />
          {error && <div className="login-page__error">{error}</div>}
          <button type="submit" className="login-page__btn-primary" disabled={loading}>{loading ? 'Проверка…' : 'Войти'}</button>
          <button type="button" className="login-page__link-btn" onClick={() => { setPhoneStep('phone'); setError('') }}>Изменить номер</button>
        </form>
      )}

      <div className="login-page__divider">или</div>

      <div className="login-page__social">
        <TelegramLoginButton onAuth={handleTelegramAuth} />
      </div>

      <div className="login-page__signup-link">
        Нет аккаунта? Он создастся автоматически при первом входе.
      </div>
    </div>
  )
}
