import Link from "next/link"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center space-y-8 p-24">
      <div className="space-y-4 text-center">
        <h1 className="text-5xl font-extrabold tracking-tight text-stone-900">Family Tree App</h1>
        <p className="max-w-md text-xl text-stone-600">
          Collaboratively document your genealogy, stories, and heritage.
        </p>
      </div>
      <div className="flex gap-4">
        <Link
          href="/dashboard"
          className="rounded-md bg-stone-900 px-6 py-3 font-medium text-stone-50 hover:bg-stone-800"
        >
          Get Started
        </Link>
        <Link
          href="/login"
          className="rounded-md border border-stone-200 bg-white px-6 py-3 font-medium text-stone-900 hover:bg-stone-50"
        >
          Sign In
        </Link>
      </div>
      <p className="text-sm text-stone-500">Demo login: demo@family.local / demo12345</p>
    </main>
  )
}
