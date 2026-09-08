"use client"

import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { FormEvent, useState } from "react"
import { useTrees } from "@/hooks/use-trees"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { hasRight, roleLabel } from "@family-tree/types"

function familyTreeLabel(tree: { name?: string; display_name?: string; family_name?: string }) {
  if (tree.display_name) return tree.display_name
  const base = (tree.family_name || tree.name || "").trim().replace(/\s+family\s+tree$/i, "")
  return base ? `${base} family tree` : "Family tree"
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { trees, isLoading, isError, hasToken, createTree, refetchTrees } = useTrees()
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const canCreateTrees = hasRight(session?.user?.role, "create_family_tree")
  const canManageRoles = hasRight(session?.user?.role, "manage_roles")
  const canCreate =
    status === "authenticated" && canCreateTrees && Boolean(hasToken || session?.user?.accessToken)

  if (status === "unauthenticated") {
    router.push("/login")
    return null
  }

  async function createEmptyFamilyTree(event?: FormEvent) {
    event?.preventDefault()
    if (!canCreateTrees) {
      setError("You do not have permission to create family trees.")
      setSuccess(null)
      return
    }

    const familyName = name.trim()
    if (!familyName) {
      setError("Enter a family name to create an empty family tree.")
      setSuccess(null)
      return
    }
    if (!hasToken && !session?.user?.accessToken) {
      setError("Your session is missing an API token. Please sign out and sign in again.")
      setSuccess(null)
      return
    }

    setCreating(true)
    setError(null)
    setSuccess(null)
    try {
      const tree = await createTree(familyName)
      setName("")
      await refetchTrees()
      const label = familyTreeLabel(tree)
      setSuccess(
        tree.created === false
          ? `${label} already exists. Opening it so you can add people.`
          : `Created empty ${label}. Opening it so you can add people.`,
      )
      router.push(`/tree/${tree.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create family tree")
    } finally {
      setCreating(false)
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Family trees</h1>
          <p className="mt-1 text-stone-600">
            Hello, {session?.user?.name || session?.user?.email}
            {session?.user?.role ? ` · ${roleLabel(session.user.role)}` : ""}
          </p>
          <p className="mt-1 text-sm text-stone-500">
            {canCreateTrees
              ? "Create an empty family tree by family name, then open it to add people."
              : "Open a family tree to view family data. Ask an admin if you need create access."}
          </p>
        </div>
        <div className="flex gap-2">
          {canManageRoles && (
            <Link href="/admin">
              <Button type="button" variant="outline">Manage roles</Button>
            </Link>
          )}
          <Button variant="outline" type="button" onClick={() => signOut({ callbackUrl: "/" })}>
            Sign out
          </Button>
        </div>
      </div>

      {canCreateTrees && (
        <form onSubmit={createEmptyFamilyTree} className="mb-6 flex flex-col gap-3 sm:flex-row">
          <Input
            aria-label="New family name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Family name (e.g. Sharma)"
            disabled={creating || !canCreate}
          />
          <Button type="submit" disabled={creating || !canCreate} className="sm:shrink-0">
            {creating ? "Creating..." : "Add family tree"}
          </Button>
        </form>
      )}

      {success && (
        <p className="mb-4 text-sm text-emerald-700" role="status">
          {success}
        </p>
      )}

      {(error || isError) && (
        <p className="mb-6 text-sm text-red-600" role="alert">
          {error ||
            (!hasToken
              ? "Could not load trees because your session has no API token. Sign out and sign in again."
              : "Could not load your trees. Sign out and sign in again, then retry.")}
        </p>
      )}

      {isLoading || status === "loading" ? (
        <p className="text-stone-500">Loading family trees...</p>
      ) : trees && trees.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {trees.map((tree) => (
            <Link key={tree.id} href={`/tree/${tree.id}`} className="block">
              <Card className="h-full bg-white transition hover:border-stone-400">
                <CardHeader>
                  <CardTitle>{familyTreeLabel(tree)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-stone-500">
                    {tree._count?.people ?? 0} {(tree._count?.people ?? 0) === 1 ? "person" : "people"}
                  </p>
                  <p className="mt-2 text-sm font-medium text-stone-700">Open to add people</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-stone-500">
          {canCreateTrees
            ? "No family trees yet. Enter a family name above to create an empty one."
            : "No family trees yet. Ask an administrator to create one."}
        </p>
      )}
    </main>
  )
}
