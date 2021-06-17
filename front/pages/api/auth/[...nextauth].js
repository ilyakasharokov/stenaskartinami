import NextAuth from "next-auth";
import Providers from "next-auth/providers";
import { API_HOST  } from '../../../constants/constants'

const options = {
  providers: [
    Providers.Facebook({
      clientId: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    }), 
    Providers.VK({
      clientId: process.env.VK_CLIENT_ID,
      clientSecret: process.env.VK_CLIENT_SECRET,
    }) 
  ],
  session: {
    jwt: true,
  },
  callbacks: {
    session: async (session, user) => {
      session.jwt = user.jwt;
      session.id = user.id;
      const res = await fetch(API_HOST + '/users/me', {
        headers: {
          Authorization: `Bearer ${session.jwt}`,
        }
      });
      const json = await res.json()
      session.info = json;
      return Promise.resolve(session);
    },
    jwt: async (token, user, account) => {
      const isSignIn = user ? true : false;
      if (isSignIn) {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/${account.provider}/callback?access_token=${account?.accessToken}`
        );
        const data = await response.json();
        token.jwt = data.jwt;
        token.id = data.user.id;
      }
      return Promise.resolve(token);
    },
  },
};

const Auth = (req, res) =>
  NextAuth(req, res, options);

export default Auth;