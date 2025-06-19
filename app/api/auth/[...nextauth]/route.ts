import NextAuth from 'next-auth'
import CredentialsProvider from "next-auth/providers/credentials"

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        console.log('Login attempt:', {
          username: credentials?.username,
          password: credentials?.password
        });

        if (!credentials?.username || !credentials?.password) {
          console.log('Missing credentials');
          return null;
        }

        // Simple string comparison
        const validUsername = credentials.username === process.env.ADMIN_USERNAME;
        const validPassword = credentials.password === process.env.ADMIN_PASSWORD;

        console.log('Validation:', {
          expectedUsername: process.env.ADMIN_USERNAME,
          expectedPassword: process.env.ADMIN_PASSWORD,
          usernameMatch: validUsername,
          passwordMatch: validPassword
        });

        if (validUsername && validPassword) {
          console.log('✅ Login successful');
          return {
            id: "1",
            name: "GRS",
            email: "grs@stockapp.com"
          };
        }

        console.log('❌ Login failed');
        return null;
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
  debug: true,
})

export { handler as GET, handler as POST }