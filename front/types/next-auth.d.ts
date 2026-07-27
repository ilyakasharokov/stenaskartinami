import NextAuth, { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session extends DefaultSession {
    jwt?: string
    error?: string
    info?: {
      id?: number
      strapiUserId?: number
      username?: string
      email?: string
      isModerator?: boolean
      is_moderator?: boolean
      location?: string
      bio?: string
      website?: string
      instagram?: string
      telegram_handle?: string
      confirmed?: boolean
      createdAt?: string
      cover_image?: { url: string } | null
      profile_image?: { url: string } | null
      arts?: Array<{ id: number }>
      [key: string]: any
    }
  }
}
