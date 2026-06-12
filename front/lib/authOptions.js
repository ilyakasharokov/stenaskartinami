import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import crypto from "crypto";
import { API_HOST } from '@/constants/constants';

const SECRET = process.env.NEXTAUTH_SECRET;
const STRAPI_INTERNAL = process.env.STRAPI_SERVER_URL || process.env.NEXT_PUBLIC_API_URL;

function vkEmail(vkId) {
  return `vk_${vkId}@vk.stenaskartinami.ru`;
}
function vkPassword(vkId) {
  return crypto.createHmac('sha256', SECRET).update('vk:' + vkId).digest('hex');
}

async function strapiRegisterOrLogin(email, password, username) {
  const regRes = await fetch(`${STRAPI_INTERNAL}/auth/local/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: username || email.split('@')[0], email, password }),
  });
  const regData = await regRes.json();
  if (regData.jwt) return regData;

  const loginRes = await fetch(`${STRAPI_INTERNAL}/auth/local`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: email, password }),
  });
  const loginData = await loginRes.json();
  if (loginData.jwt) return loginData;

  throw new Error(loginData?.error?.message || 'Strapi auth error');
}

// Custom VK OAuth2 provider
const VKProvider = {
  id: 'vk',
  name: 'VK',
  type: 'oauth',
  authorization: {
    url: 'https://oauth.vk.com/authorize',
    params: { scope: 'email', response_type: 'code', v: '5.131' },
  },
  token: 'https://oauth.vk.com/access_token',
  userinfo: {
    async request({ tokens }) {
      try {
        const res = await fetch(
          `https://api.vk.com/method/users.get?fields=photo_100&v=5.131&access_token=${tokens.access_token}`
        );
        const data = await res.json();
        const u = data.response?.[0] || {};
        return {
          id: String(tokens.user_id || u.id),
          name: [u.first_name, u.last_name].filter(Boolean).join(' ') || `VK ${tokens.user_id}`,
          email: tokens.email || null,
          image: u.photo_100 || null,
          vk_id: String(tokens.user_id || u.id),
        };
      } catch {
        return { id: String(tokens.user_id), name: `VK ${tokens.user_id}`, vk_id: String(tokens.user_id) };
      }
    },
  },
  profile(profile) {
    return {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      image: profile.image,
      vk_id: profile.vk_id,
    };
  },
  clientId: process.env.VK_CLIENT_ID,
  clientSecret: process.env.VK_CLIENT_SECRET,
};

export const authOptions = {
  providers: [
    ...(process.env.DEV_AUTO_EMAIL ? [
      CredentialsProvider({
        id: 'dev-auto',
        name: 'Dev Auto',
        credentials: {},
        async authorize() {
          const apiUrl = STRAPI_INTERNAL;
          try {
            const res = await fetch(`${apiUrl}/auth/local`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ identifier: process.env.DEV_AUTO_EMAIL, password: process.env.DEV_AUTO_PASSWORD }),
            });
            const data = await res.json();
            if (data.jwt) return { id: data.user.id, jwt: data.jwt, name: data.user.username, email: data.user.email };
          } catch {}
          return null;
        },
      }),
    ] : []),

    // Phone OTP (existing)
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

    // Email OTP
    CredentialsProvider({
      id: 'email-otp',
      name: 'Email OTP',
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

    // Telegram
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

    // Email + password (legacy)
    CredentialsProvider({
      id: 'credentials',
      name: 'Email',
      credentials: {
        email: { type: 'email' },
        password: { type: 'password' },
      },
      async authorize(credentials) {
        const res = await fetch(`${STRAPI_INTERNAL}/auth/local`, {
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

    VKProvider,
  ],

  pages: {
    signIn: '/auth/signin',
  },

  session: { strategy: 'jwt' },

  callbacks: {
    async jwt({ token, user, account }) {
      // Direct credentials providers (phone, email-otp, telegram, dev-auto)
      if (['phone', 'email-otp', 'telegram', 'credentials', 'dev-auto'].includes(account?.provider)) {
        token.jwt = user.jwt;
        token.id = user.id;
      } else if (account?.provider === 'google') {
        try {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/auth/google/callback?access_token=${account.access_token}`
          );
          const data = await response.json();
          if (data?.jwt) {
            token.jwt = data.jwt;
            token.id = data.user.id;
          } else {
            token.error = data?.error?.message || 'OAuth error';
          }
        } catch (e) {
          token.error = e.message;
        }
      } else if (account?.provider === 'vk' && user) {
        // VK: create/login in Strapi using VK user ID
        try {
          const vkId = user.vk_id || user.id;
          const email = vkEmail(vkId);
          const password = vkPassword(vkId);
          const username = (user.name || `vk_${vkId}`).slice(0, 30);
          const data = await strapiRegisterOrLogin(email, password, username);
          token.jwt = data.jwt;
          token.id = data.user.id;
          if (!token.picture && user.image) token.picture = user.image;
          if (!token.name && user.name) token.name = user.name;
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
          const res = await fetch(API_HOST + '/users/me/profile', {
            headers: { Authorization: `Bearer ${token.jwt}` },
          });
          if (res.ok) session.info = await res.json();
        } catch {}
      }
      return session;
    },
  },
};
