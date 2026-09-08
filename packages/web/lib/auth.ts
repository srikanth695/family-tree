import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"

const apiUrl =
  process.env.API_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3001"

async function loginWithApi(email: string, password: string) {
  const res = await fetch(`${apiUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok || !data?.user || !data?.access_token) {
    return null
  }
  return {
    id: data.user.id,
    email: data.user.email,
    name: data.user.name,
    role: data.user.role,
    accessToken: data.access_token,
  }
}

async function oauthWithApi(email: string, name?: string | null, image?: string | null) {
  const res = await fetch(`${apiUrl}/auth/oauth`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-secret": process.env.INTERNAL_AUTH_SECRET || "",
    },
    body: JSON.stringify({ email, name, avatar_url: image }),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok || !data?.user || !data?.access_token) {
    return null
  }
  return {
    id: data.user.id,
    email: data.user.email,
    name: data.user.name,
    role: data.user.role,
    accessToken: data.access_token,
  }
}

const providers: NextAuthOptions["providers"] = [
  CredentialsProvider({
    name: "Credentials",
    credentials: {
      email: { label: "Email", type: "text" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) {
        return null
      }
      try {
        return await loginWithApi(credentials.email, credentials.password)
      } catch (error) {
        console.error("Auth error:", error)
        return null
      }
    },
  }),
]

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  )
}

export const authOptions: NextAuthOptions = {
  providers,
  callbacks: {
    async jwt({ token, user, account }) {
      if (user && account?.provider === "google" && user.email) {
        const synced = await oauthWithApi(user.email, user.name, user.image)
        if (synced) {
          token.id = synced.id
          token.role = synced.role
          token.accessToken = synced.accessToken
        }
        return token
      }
      if (user) {
        token.id = (user as { id?: string }).id
        token.role = (user as { role?: string }).role
        token.accessToken = (user as { accessToken?: string }).accessToken
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.accessToken = token.accessToken as string
      }
      ;(session as { accessToken?: string }).accessToken = token.accessToken as string
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7,
  },
  secret: process.env.NEXTAUTH_SECRET,
}
