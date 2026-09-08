"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Mail, Lock } from "lucide-react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }),
})

type LoginFormValues = z.infer<typeof formSchema>

export function LoginForm({ isAdmin = false }: { isAdmin?: boolean }) {
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const router = useRouter()
  const showGoogle = process.env.NEXT_PUBLIC_GOOGLE_ENABLED === "true"

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", password: "" },
  })

  async function onSubmit(values: LoginFormValues) {
    setIsLoading(true)
    setError(null)
    try {
      const result = await signIn("credentials", {
        redirect: false,
        email: values.email,
        password: values.password,
      })

      if (result?.error) {
        setError("Invalid email or password")
      } else {
        router.push(isAdmin ? "/admin" : "/dashboard")
        router.refresh()
      }
    } catch (err) {
      console.error("Auth error:", err)
      setError("Unable to sign in")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className={cn(
        "w-full max-w-sm space-y-6 rounded-xl border p-8 shadow-lg",
        isAdmin
          ? "border-stone-800 bg-stone-900/50 text-white backdrop-blur-md"
          : "border-stone-200 bg-white/80 text-stone-900 backdrop-blur-sm",
      )}
    >
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          {isAdmin ? "Admin Login" : "Welcome back"}
        </h1>
        <p className={cn("text-sm", isAdmin ? "text-stone-400" : "text-stone-500")}>
          {isAdmin
            ? "Restricted access for authorized administrators"
            : "Enter your credentials to access your family tree"}
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="email">Email</label>
          <div className="relative">
            <Mail className={cn("absolute left-3 top-3 h-4 w-4", isAdmin ? "text-stone-500" : "text-stone-400")} aria-hidden="true" />
            <Input
              id="email"
              {...form.register("email")}
              placeholder="email@example.com"
              className={cn("pl-10", isAdmin ? "border-stone-700 bg-stone-800 text-white placeholder:text-stone-500" : "border-stone-200 bg-stone-50")}
            />
          </div>
          {form.formState.errors.email && (
            <p className="text-xs text-red-500">{form.formState.errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="password">Password</label>
          <div className="relative">
            <Lock className={cn("absolute left-3 top-3 h-4 w-4", isAdmin ? "text-stone-500" : "text-stone-400")} aria-hidden="true" />
            <Input
              id="password"
              {...form.register("password")}
              type="password"
              placeholder="••••••••"
              className={cn("pl-10", isAdmin ? "border-stone-700 bg-stone-800 text-white placeholder:text-stone-500" : "border-stone-200 bg-stone-50")}
            />
          </div>
          {form.formState.errors.password && (
            <p className="text-xs text-red-500">{form.formState.errors.password.message}</p>
          )}
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <Button
          type="submit"
          className={cn("w-full", isAdmin ? "bg-white text-stone-900 hover:bg-stone-200" : "bg-stone-900 text-stone-50 hover:bg-stone-800")}
          disabled={isLoading}
        >
          {isLoading ? "Signing in..." : isAdmin ? "Admin Sign In" : "Sign In"}
        </Button>
      </form>

      {showGoogle && (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => signIn("google", { callbackUrl: isAdmin ? "/admin" : "/dashboard" })}
        >
          Continue with Google
        </Button>
      )}

      {!isAdmin && (
        <p className="text-center text-sm text-stone-500">
          No account?{" "}
          <Link href="/register" className="font-medium text-stone-900 underline">
            Create one
          </Link>
        </p>
      )}
    </div>
  )
}
