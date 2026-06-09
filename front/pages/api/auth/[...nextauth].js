import NextAuth from "next-auth";
import FacebookProvider from "next-auth/providers/facebook";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { API_HOST } from '@/constants/constants';

export const authOptions = {
  providers: [
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
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/local`, {
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

    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
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
      if (account?.provider === 'phone' || account?.provider === 'telegram' || account?.provider === 'credentials') {
        token.jwt = user.jwt;
        token.id = user.id;
      } else if (user && account) {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/${account.provider}/callback?access_token=${account?.access_token}`
        );
        const data = await response.json();
        token.jwt = data.jwt;
        token.id = data.user.id;
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

export default NextAuth(authOptions);
