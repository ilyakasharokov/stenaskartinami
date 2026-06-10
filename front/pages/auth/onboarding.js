import Head from 'next/head';
import Router from 'next/router';
import Link from 'next/link';
import { useState, useEffect, useCallback, useRef } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

const STRAPI = process.env.NEXT_PUBLIC_API_URL;

function isPhoneUser(info) {
  return info?.email?.endsWith('@phone.stenaskartinami.com');
}

function needsPhone(info) {
  return !isPhoneUser(info) && !info?.phone;
}

function needsEmail(info) {
  return isPhoneUser(info) && !info?.real_email;
}

// ── Step: Add phone (OAuth/email users) ────────────────────────────
function AddPhoneStep({ onDone }) {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [token, setToken] = useState('');
  const [step, setStep] = useState('phone');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const sendOtp = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    const r = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    const d = await r.json();
    setLoading(false);
    if (!r.ok) { setError(d.error); return; }
    setToken(d.token);
    setStep('code');
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    const r = await fetch('/api/auth/verify-phone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, code }),
    });
    const d = await r.json();
    setLoading(false);
    if (!r.ok) { setError(d.error); return; }
    onDone();
  };

  return (
    <div className="onboarding__step">
      <h2 className="onboarding__step-title">Подтвердите номер телефона</h2>
      <p className="onboarding__step-desc">Нужен для связи и восстановления доступа</p>
      {step === 'phone' ? (
        <form className="login-page__form" onSubmit={sendOtp}>
          <input type="tel" placeholder="+7 900 000 00 00" value={phone} onChange={e => setPhone(e.target.value)} required />
          {error && <div className="login-page__error">{error}</div>}
          <button type="submit" className="login-page__btn-primary" disabled={loading}>
            {loading ? 'Отправка...' : 'Получить код'}
          </button>
        </form>
      ) : (
        <form className="login-page__form" onSubmit={verifyOtp}>
          <p className="login-page__hint">Код отправлен на {phone}</p>
          <input type="text" placeholder="Код из SMS" value={code} onChange={e => setCode(e.target.value)} required maxLength={4} inputMode="numeric" autoFocus />
          {error && <div className="login-page__error">{error}</div>}
          <button type="submit" className="login-page__btn-primary" disabled={loading}>
            {loading ? 'Проверка...' : 'Подтвердить'}
          </button>
          <button type="button" className="login-page__link-btn" onClick={() => setStep('phone')}>Изменить номер</button>
        </form>
      )}
    </div>
  );
}

// ── Step: Add email (phone users) ──────────────────────────────────
function AddEmailStep({ jwt, onDone }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    const r = await fetch(`${STRAPI}/users/me/set-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    if (!r.ok) { const d = await r.json().catch(() => ({})); setError(d.error || 'Ошибка'); return; }
    onDone();
  };

  return (
    <div className="onboarding__step">
      <h2 className="onboarding__step-title">Укажите email</h2>
      <p className="onboarding__step-desc">Для уведомлений и восстановления доступа</p>
      <form className="login-page__form" onSubmit={save}>
        <input type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
        {error && <div className="login-page__error">{error}</div>}
        <button type="submit" className="login-page__btn-primary" disabled={loading}>
          {loading ? 'Сохранение...' : 'Сохранить'}
        </button>
      </form>
    </div>
  );
}

// ── Step: Claim artist ──────────────────────────────────────────────
function ClaimArtistStep({ jwt, pendingArtist, onDone }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(pendingArtist || null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const timer = useRef(null);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(`${STRAPI}/artists?filters[full_name][$containsi]=${encodeURIComponent(query)}&pagination[limit]=10`);
        const d = await r.json();
        setResults(Array.isArray(d) ? d : d?.data || []);
      } catch {}
      setLoading(false);
    }, 300);
  }, [query]);

  const save = async () => {
    if (!selected) { onDone(); return; }
    setSaving(true); setError('');
    const r = await fetch(`${STRAPI}/users/me/claim-artist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
      body: JSON.stringify({ artistId: selected.id }),
    });
    setSaving(false);
    if (!r.ok) { const d = await r.json().catch(() => ({})); setError(d.error || 'Ошибка'); return; }
    onDone();
  };

  const artistName = (a) => a?.full_name || a?.attributes?.full_name || '';

  return (
    <div className="onboarding__step">
      <h2 className="onboarding__step-title">Вы художник?</h2>
      <p className="onboarding__step-desc">
        Если вы есть в каталоге, выберите себя. Администратор подтвердит привязку.
      </p>

      {selected ? (
        <div className="onboarding__selected">
          <span className="onboarding__selected-name">{artistName(selected)}</span>
          <button className="login-page__link-btn" onClick={() => { setSelected(null); setQuery(''); }}>
            Изменить
          </button>
        </div>
      ) : (
        <div className="onboarding__search">
          <input
            className="onboarding__search-input"
            type="text"
            placeholder="Найти художника по имени..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {loading && <div className="login-page__hint">Поиск...</div>}
          {results.length > 0 && (
            <ul className="onboarding__results">
              {results.map(a => (
                <li key={a.id} className="onboarding__result-item" onClick={() => { setSelected(a); setResults([]); setQuery(''); }}>
                  {artistName(a)}
                </li>
              ))}
            </ul>
          )}
          {query.trim() && !loading && results.length === 0 && (
            <div className="login-page__hint">Художник не найден</div>
          )}
        </div>
      )}

      {error && <div className="login-page__error">{error}</div>}

      <div className="onboarding__actions">
        <button className="login-page__btn-primary" onClick={save} disabled={saving}>
          {saving ? 'Сохранение...' : selected ? 'Отправить заявку' : 'Пропустить'}
        </button>
        {selected && (
          <button className="login-page__link-btn" onClick={onDone}>Пропустить</button>
        )}
      </div>
    </div>
  );
}

// ── Main onboarding page ────────────────────────────────────────────
export default function Onboarding({ userInfo, sessionJwt, steps }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [info, setInfo] = useState(userInfo);

  if (steps.length === 0) {
    if (typeof window !== 'undefined') Router.replace('/');
    return null;
  }

  const advance = () => {
    if (currentStep + 1 < steps.length) {
      setCurrentStep(s => s + 1);
    } else {
      Router.replace('/');
    }
  };

  const step = steps[currentStep];
  const progress = `${currentStep + 1} / ${steps.length}`;

  return (
    <>
      <Head><title>Настройка профиля | Стена с картинами</title></Head>
      <div className="login-page__wrapper">
        <div className="login-page">
          <div className="login-page__logo">
            <img src="/images/newlogo2.svg" alt="" />
            <div className="login-page__text">Стена с картинами</div>
          </div>

          <div className="onboarding__progress">Шаг {progress}</div>

          {step === 'phone' && <AddPhoneStep onDone={advance} />}
          {step === 'email' && <AddEmailStep jwt={sessionJwt} onDone={advance} />}
          {step === 'artist' && (
            <ClaimArtistStep
              jwt={sessionJwt}
              pendingArtist={info?.pending_artist || null}
              onDone={advance}
            />
          )}

          <div className="login-page__signup-link">
            <Link href="/">Вернуться на главную</Link>
          </div>
        </div>
      </div>
    </>
  );
}

export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions);
  if (!session?.jwt) {
    return { redirect: { destination: '/auth/signin', permanent: false } };
  }

  // Fetch fresh user data from Strapi
  let userInfo = null;
  try {
    const r = await fetch(`${process.env.STRAPI_SERVER_URL || process.env.NEXT_PUBLIC_API_URL}/users/me`, {
      headers: { Authorization: `Bearer ${session.jwt}` },
    });
    if (r.ok) userInfo = await r.json();
  } catch {}

  const smsEnabled = process.env.NEXT_PUBLIC_SMS_ENABLED !== 'false';
  const steps = [];
  if (userInfo) {
    if (smsEnabled && needsPhone(userInfo)) steps.push('phone');
    if (smsEnabled && needsEmail(userInfo)) steps.push('email');
    // Always offer artist claim if not yet claimed
    if (!userInfo.pending_artist) steps.push('artist');
  }

  if (steps.length === 0) {
    return { redirect: { destination: '/', permanent: false } };
  }

  return {
    props: {
      userInfo,
      sessionJwt: session.jwt,
      steps,
    },
  };
}
