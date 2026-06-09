import { useEffect, useRef } from 'react';

export default function TelegramLoginButton({ onAuth }) {
  const ref = useRef(null);
  const botName = process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME;

  useEffect(() => {
    if (!botName || !ref.current) return;
    window.__telegramAuthCallback = onAuth;
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', botName);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-lang', 'ru');
    script.setAttribute('data-onauth', '__telegramAuthCallback(user)');
    script.setAttribute('data-request-access', 'write');
    script.async = true;
    ref.current.innerHTML = '';
    ref.current.appendChild(script);
    return () => { delete window.__telegramAuthCallback; };
  }, [botName, onAuth]);

  if (!botName) return null;
  return <div ref={ref} />;
}
