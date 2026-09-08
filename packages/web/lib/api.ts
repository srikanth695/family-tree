import axios, { AxiosError } from "axios"
import { getSession } from "next-auth/react"

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:3001",
})

api.interceptors.request.use(async (config) => {
  if (typeof window !== "undefined") {
    const session = await getSession()
    const token =
      session?.user?.accessToken ||
      (session as { accessToken?: string } | null)?.accessToken
    if (token) {
      config.headers.set("Authorization", `Bearer ${token}`)
    }
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string | string[] }>) => {
    const payload = error.response?.data?.message
    const message = Array.isArray(payload)
      ? payload.join(", ")
      : payload || error.message || "Request failed"
    const wrapped = new Error(String(message))
    ;(wrapped as Error & { status?: number }).status = error.response?.status
    return Promise.reject(wrapped)
  },
)

export default api

export function mediaUrl(fileUrl?: string | null) {
  if (!fileUrl) return ""
  if (fileUrl.startsWith("http")) return fileUrl
  const base = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:3001"
  return `${base}${fileUrl}`
}
