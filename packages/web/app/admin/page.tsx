"use client"

import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useState } from "react"
import { useUsers } from "@/hooks/use-users"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  ROLE_RIGHT_LABELS,
  ROLE_RIGHTS,
  SYSTEM_ROLES,
  SystemRole,
  hasRight,
  roleLabel,
} from "@family-tree/types"
import { ThemeToggle } from "@/components/theme-toggle"

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { users, isLoading, isError, updateRole } = useUsers()
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  if (status === "unauthenticated") {
    router.push("/login")
    return null
  }

  if (status === "authenticated" && session?.user?.role !== "admin") {
    router.push("/dashboard")
    return null
  }

  async function onRoleChange(userId: string, role: SystemRole) {
    setSavingId(userId)
    setError(null)
    setSuccess(null)
    try {
      await updateRole({ id: userId, role })
      setSuccess(`Updated role to ${ROLE_LABELS[role]}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role")
    } finally {
      setSavingId(null)
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-12">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Admin</h1>
          <p className="mt-1 text-stone-600 dark:text-stone-300">Signed in as {session?.user?.email}</p>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">Manage user roles and review role rights.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ThemeToggle />
          <Link href="/dashboard">
            <Button type="button" variant="outline">Dashboard</Button>
          </Link>
          <Button type="button" variant="outline" onClick={() => signOut({ callbackUrl: "/" })}>
            Sign out
          </Button>
        </div>
      </div>

      <section className="mb-10">
        <h2 className="mb-3 text-xl font-semibold">Role rights</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {SYSTEM_ROLES.map((role) => (
            <Card key={role} className="bg-white dark:bg-stone-900">
              <CardHeader>
                <CardTitle className="text-lg">{ROLE_LABELS[role]}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-stone-600 dark:text-stone-300">
                <p>{ROLE_DESCRIPTIONS[role]}</p>
                <ul className="list-disc space-y-1 pl-5">
                  {(Object.keys(ROLE_RIGHTS[role]) as Array<keyof typeof ROLE_RIGHT_LABELS>).map((right) => (
                    <li key={right} className={ROLE_RIGHTS[role][right] ? "text-stone-800 dark:text-stone-100" : "text-stone-400"}>
                      {ROLE_RIGHTS[role][right] ? "✓" : "–"} {ROLE_RIGHT_LABELS[right]}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Manage roles</h2>
        {success && <p className="mb-3 text-sm text-emerald-700 dark:text-emerald-400">{success}</p>}
        {(error || isError) && (
          <p className="mb-3 text-sm text-red-600" role="alert">
            {error || "Could not load users."}
          </p>
        )}
        {isLoading || status === "loading" ? (
          <p className="text-stone-500 dark:text-stone-400">Loading users...</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-stone-200 bg-stone-50 text-stone-600 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300">
                <tr>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Current role</th>
                  <th className="px-4 py-3 font-medium">Change role</th>
                </tr>
              </thead>
              <tbody>
                {(users || []).map((user) => (
                  <tr key={user.id} className="border-b border-stone-100 last:border-0 dark:border-stone-800">
                    <td className="px-4 py-3">
                      <div className="font-medium text-stone-900 dark:text-stone-100">{user.name || "Unnamed"}</div>
                      <div className="text-stone-500 dark:text-stone-400">{user.email}</div>
                    </td>
                    <td className="px-4 py-3">{roleLabel(user.role)}</td>
                    <td className="px-4 py-3">
                      <select
                        className="w-full max-w-xs rounded-md border border-stone-200 bg-white px-3 py-2 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
                        value={user.role}
                        disabled={savingId === user.id || !hasRight(session?.user?.role, "manage_roles")}
                        onChange={(e) => onRoleChange(user.id, e.target.value as SystemRole)}
                      >
                        {SYSTEM_ROLES.map((role) => (
                          <option key={role} value={role}>
                            {ROLE_LABELS[role]}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}
