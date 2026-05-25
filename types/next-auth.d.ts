import 'next-auth'
import 'next-auth/jwt'

export type UiMode = 'classic' | 'modern'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name: string
      email?: string | null
      username: string
      uiMode: UiMode
    }
  }
  interface User {
    id: string
    name: string
    username: string
    uiMode: UiMode
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    username: string
    uiMode: UiMode
  }
}
