import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

type UiMode = 'classic' | 'modern'

const USER_UI_MODE: Record<string, UiMode> = {
  GRS: 'classic',
  LKS: 'modern',
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null
        const username = credentials.username.trim()
        const mode = USER_UI_MODE[username]
        if (!mode) return null
        if (credentials.password !== process.env.APP_PASSWORD) return null
        return {
          id: username,
          name: username,
          email: `${username.toLowerCase()}@stockapp.local`,
          username,
          uiMode: mode,
        }
      },
    }),
  ],
  pages: { signIn: '/login' },
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.username = (user as any).username
        token.uiMode = (user as any).uiMode
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as any).username = token.username
        ;(session.user as any).uiMode = token.uiMode
        ;(session.user as any).id = token.username
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}
