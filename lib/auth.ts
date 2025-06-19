import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null
        }

        // Simple string comparison - no hashing
        const validUsername = credentials.username === process.env.ADMIN_USERNAME
        const validPassword = credentials.password === process.env.ADMIN_PASSWORD

        if (validUsername && validPassword) {
          return {
            id: "1",
            name: "Admin",
            email: "admin@stockapp.com"
          }
        }

        return null
      }
    })
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
}