import { LoginForm } from "@/components/auth/login-form"
import { ThemeToggle } from "@/components/theme-toggle"

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-stone-50 px-4 py-12 sm:px-6 lg:px-8 dark:bg-stone-950">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <LoginForm />
    </div>
  )
}
