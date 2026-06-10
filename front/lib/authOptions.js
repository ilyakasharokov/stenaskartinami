import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { API_HOST } from '@/constants/constants';

export const authOptions = {
  providers: [
    ...(process.env.DEV_AUTO_EMAIL ? [
      CredentialsProvider({
        id: 'dev-auto',
        name: 'Dev Auto',
        credentials: {},
        async authorize() {
          const apiUrl = process.env.STRAPI_SERVER_URL || process.env.NEXT_PUBLIC_API_URL
          try {
            const res = await fetch(`${apiUrl}/auth/local`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ identifier: process.env.DEV_AUTO_EMAIL, password: process.env.DEV_AUTO_PASSWORD }),
            })
            const data = await res.json()
            if (data.jwt) return { id: data.user.id, jwt: data.jwt, name: data.user.username, email: data.user.email }
          } catch {}
          return null
        },
      }),
    ] : []),
    CredentialsProvider({
      id: 'phone',
      name: 'Phone',
      credentials: {
        strapiJwt: { type: 'text' },
        userId: { type: 'text' },
        userName: { type: 'text' },
        userEmail: { type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.strapiJwt) return null;
        return {
          id: credentials.userId,
          jwt: credentials.strapiJwt,
          name: credentials.userName,
          email: credentials.userEmail,
        };
      },
    }),

    CredentialsProvider({
      id: 'telegram',
      name: 'Telegram',
      credentials: {
        strapiJwt: { type: 'text' },
        userId: { type: 'text' },
        userName: { type: 'text' },
        userPhoto: { type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.strapiJwt) return null;
        return {
          id: credentials.userId,
          jwt: credentials.strapiJwt,
          name: credentials.userName,
          image: credentials.userPhoto || null,
        };
      },
    }),

    CredentialsProvider({
      id: 'credentials',
      name: 'Email',
      credentials: {
        email: { type: 'email' },
        password: { type: 'password' },
      },
      async authorize(credentials) {
        const apiUrl = process.env.STRAPI_SERVER_URL || process.env.NEXT_PUBLIC_API_URL;
        const res = await fetch(`${apiUrl}/auth/local`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: credentials.email, password: credentials.password }),
        });
        const data = await res.json();
        if (data.jwt) {
          return { id: data.user.id, jwt: data.jwt, name: data.user.username || data.user.email, email: data.user.email };
        }
        return null;
      },
    }),

    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],

  pages: {
    signIn: '/auth/signin',
  },

  session: { strategy: 'jwt' },

  callbacks: {
    async jwt({ token, user, account }) {
      if (account?.provider === 'phone' || account?.provider === 'telegram' || account?.provider === 'credentials' || account?.provider === 'dev-auto') {
        token.jwt = user.jwt;
        token.id = user.id;
      } else if (user && account) {
        try {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/auth/${account.provider}/callback?access_token=${account?.access_token}`
          );
          const data = await response.json();
          if (data?.jwt && data?.user) {
            token.jwt = data.jwt;
            token.id = data.user.id;
          } else {
            token.error = data?.error?.message || 'OAuth error';
          }
        } catch (e) {
          token.error = e.message;
        }
      }
      return token;
    },

    async session({ session, token }) {
      session.jwt = token.jwt;
      session.id = token.id;
      if (token.jwt) {
        try {
          const res = await fetch(API_HOST + '/users/me', {
            headers: { Authorization: `Bearer ${token.jwt}` },
          });
          if (res.ok) session.info = await res.json();
        } catch {}
      }
      return session;
    },
  },
};
