import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import Head from 'next/head';
import Router from 'next/router';
import AuthForm from '@/components/auth/AuthForm';

const ERROR_MESSAGES = {
  Callback: 'Ошибка при входе через внешний сервис. Попробуйте другой способ.',
  OAuthSignin: 'Не удалось начать вход через OAuth.',
  OAuthCallback: 'Ошибка ответа от OAuth-провайдера.',
  OAuthAccountNotLinked: 'Этот аккаунт уже привязан к другому способу входа.',
  Default: 'Произошла ошибка. Попробуйте ещё раз.',
};

export default function SignIn({ authError }) {
  return (
    <>
      <Head><title>Вход или регистрация | Стена с картинами</title><meta name="robots" content="noindex" /></Head>
      <div className="login-page__wrapper">
        <AuthForm authError={authError} onDone={() => Router.push('/auth/onboarding')} />
      </div>
    </>
  );
}

export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions as any);
  if (session) {
    return { redirect: { destination: '/', permanent: false } };
  }
  const errorKey = context.query?.error || null;
  const authError = errorKey ? (ERROR_MESSAGES[errorKey] || ERROR_MESSAGES.Default) : null;
  return { props: { authError } };
}
