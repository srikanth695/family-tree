"use client"

import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { FormEvent, MouseEvent, useState } from "react"
import { useTrees } from "@/hooks/use-trees"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardTitle } from "@/components/ui/card"
import { hasRight, roleLabel } from "@family-tree/types"
import { ThemeToggle } from "@/components/theme-toggle"

function familyTreeLabel(tree: { name?: string; display_name?: string; family_name?: string }) {
  if (tree.display_name) return tree.display_name
  const base = (tree.family_name || tree.name || "").trim().replace(/\s+family\s+tree$/i, "")
  return base ? `${base} family tree` : "Family tree"
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { trees, isLoading, isError, hasToken, createTree, deleteTree, refetchTrees } = useTrees()
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const canCreateTrees = hasRight(session?.user?.role, "create_family_tree")
  const canDeleteTrees = session?.user?.role === "admin" && hasRight(session?.user?.role, "delete_family_tree")
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

  async function onDeleteTree(event: MouseEvent, tree: { id: string; name?: string; display_name?: string; family_name?: string; _count?: { people?: number } }) {
    event.preventDefault()
    event.stopPropagation()
    if (!canDeleteTrees) return

    const label = familyTreeLabel(tree)
    const peopleCount = tree._count?.people ?? 0
    const confirmed = window.confirm(
      `Delete ${label}? This permanently removes the tree${peopleCount ? ` and its ${peopleCount} ${peopleCount === 1 ? "person" : "people"}` : ""}, relationships, and media. This cannot be undone.`,
    )
    if (!confirmed) return

    setDeletingId(tree.id)
    setError(null)
    setSuccess(null)
    try {
      await deleteTree(tree.id)
      setSuccess(`Deleted ${label}.`)
      await refetchTrees()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete family tree")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl bg-transparent px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold">Family trees</h1>
          <p className="mt-1 text-stone-600 dark:text-stone-300">
            Hello, {session?.user?.name || session?.user?.email}
            {session?.user?.role ? ` · ${roleLabel(session.user.role)}` : ""}
          </p>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            {canCreateTrees
              ? "Create an empty family tree by family name, then open it to add people."
              : "Open a family tree to view family data. Ask an admin if you need create access."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ThemeToggle />
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
        <p className="mb-4 text-sm text-emerald-700 dark:text-emerald-400" role="status">
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
        <p className="text-stone-500 dark:text-stone-400">Loading family trees...</p>
      ) : trees && trees.length > 0 ? (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,16rem),1fr))] gap-4">
          {trees.map((tree) => {
            const peopleCount = tree._count?.people ?? 0
            return (
            <Card key={tree.id} className="flex h-full min-h-[11rem] flex-col overflow-hidden border-stone-300 bg-white shadow-md transition hover:border-stone-500 hover:shadow-lg dark:border-stone-600 dark:bg-stone-800 dark:hover:border-stone-400">
              <Link href={`/tree/${tree.id}`} className="flex min-h-0 flex-1 flex-col p-5">
                <CardTitle className="text-lg leading-snug break-words">
                  {familyTreeLabel(tree)}
                </CardTitle>
                <div className="mt-auto pt-6">
                  <p className="text-4xl font-bold tabular-nums tracking-tight text-stone-900 dark:text-stone-50">
                    {peopleCount}
                  </p>
                  <p className="mt-1 text-sm font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                    {peopleCount === 1 ? "person" : "people"}
                  </p>
                </div>
              </Link>
              {canDeleteTrees && (
                <div className="border-t border-stone-100 px-5 pb-4 dark:border-stone-800">
                  <Button
                    type="button"
                    variant="destructive"
                    className="mt-3 min-h-11 w-full"
                    disabled={deletingId === tree.id}
                    onClick={(event) => onDeleteTree(event, tree)}
                  >
                    {deletingId === tree.id ? "Deleting..." : "Delete family tree"}
                  </Button>
                </div>
              )}
            </Card>
            )
          })}
        </div>
      ) : (
        <p className="text-stone-500 dark:text-stone-400">
          {canCreateTrees
            ? "No family trees yet. Enter a family name above to create an empty one."
            : "No family trees yet. Ask an administrator to create one."}
        </p>
      )}
    </main>
  )
}
