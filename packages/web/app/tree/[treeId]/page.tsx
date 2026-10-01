"use client"

import React, { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { usePeople } from "@/hooks/use-people"
import { useRelationships } from "@/hooks/use-relationships"
import { useTrees } from "@/hooks/use-trees"
import FamilyTree from "@/components/tree/FamilyTree"
import { MemberForm } from "@/components/tree/MemberForm"
import { RelationshipForm } from "@/components/tree/RelationshipForm"
import { PersonDetails } from "@/components/tree/PersonDetails"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import api from "@/lib/api"
import { titleCaseWords } from "@/lib/utils"
import { hasRight } from "@family-tree/types"
import { ThemeToggle } from "@/components/theme-toggle"

export default function TreePage() {
  const params = useParams()
  const router = useRouter()
  const treeId = params.treeId as string
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const { deleteTree } = useTrees()
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null)
  const [deletingTree, setDeletingTree] = useState(false)

  const canDeleteTree =
    session?.user?.role === "admin" && hasRight(session?.user?.role, "delete_family_tree")

  const { people, isLoading: peopleLoading, isError: peopleError } = usePeople(treeId)
  const { relationships, isLoading: relsLoading } = useRelationships(treeId)
  const treeQuery = useQuery({
    queryKey: ["tree", treeId],
    queryFn: async () => {
      const { data } = await api.get(`/trees/${treeId}`)
      return data
    },
    enabled: !!treeId,
  })

  const selectedPerson = people?.find((p) => p.id === selectedPersonId) || null
  const treeTitle =
    treeQuery.data?.display_name ||
    (treeQuery.data?.name
      ? `${String(treeQuery.data.name).replace(/\s+family\s+tree$/i, "").trim()} family tree`
      : "Family tree")

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["people", treeId] })
    queryClient.invalidateQueries({ queryKey: ["relationships", treeId] })
    queryClient.invalidateQueries({ queryKey: ["trees"] })
  }

  async function onDeleteTree() {
    if (!canDeleteTree) return
    const peopleCount = people?.length ?? 0
    const confirmed = window.confirm(
      `Delete ${treeTitle}? This permanently removes the tree${peopleCount ? ` and its ${peopleCount} ${peopleCount === 1 ? "person" : "people"}` : ""}, relationships, and media. This cannot be undone.`,
    )
    if (!confirmed) return
    setDeletingTree(true)
    try {
      await deleteTree(treeId)
      router.push("/dashboard")
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to delete family tree")
      setDeletingTree(false)
    }
  }

  if (peopleLoading || relsLoading) {
    return (
      <div className="relative flex min-h-screen items-center justify-center">
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>
        <p className="text-xl text-stone-500 dark:text-stone-400">Loading your family tree...</p>
      </div>
    )
  }

  if (peopleError) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center gap-4">
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>
        <p className="text-stone-700 dark:text-stone-200">You do not have access to this tree, or it does not exist.</p>
        <Link className="underline" href="/dashboard">Back to dashboard</Link>
      </div>
    )
  }

  return (
    <main className="flex h-screen w-full overflow-hidden bg-stone-50 dark:bg-stone-950">
      <aside className="flex w-80 flex-col border-r border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
        <div className="border-b border-stone-200 p-4 dark:border-stone-800">
          <div className="flex items-center justify-between gap-2">
            <Link href="/dashboard" className="text-sm text-stone-500 hover:underline dark:text-stone-400">Dashboard</Link>
            <ThemeToggle />
          </div>
          <h2 className="mt-2 text-lg font-semibold text-stone-900 dark:text-stone-50">{treeTitle}</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            <RelationshipForm
              treeId={treeId}
              people={people || []}
              familyName={treeQuery.data?.family_name}
              onSuccess={refresh}
            />
            <MemberForm
              treeId={treeId}
              people={people || []}
              familyName={treeQuery.data?.family_name}
              onSuccess={refresh}
            />
          </div>
          {canDeleteTree && (
            <Button
              type="button"
              variant="destructive"
              className="mt-3 min-h-11 w-full"
              disabled={deletingTree}
              onClick={onDeleteTree}
            >
              {deletingTree ? "Deleting..." : "Delete family tree"}
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {selectedPerson ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-stone-900 dark:text-stone-50">
                  {titleCaseWords(selectedPerson.first_name)} {titleCaseWords(selectedPerson.last_name)}
                </h3>
              </div>
              <PersonDetails
                person={selectedPerson}
                treeId={treeId}
                onDeleted={() => {
                  setSelectedPersonId(null)
                  refresh()
                }}
                onUpdated={refresh}
              />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-center text-sm text-stone-400 dark:text-stone-500">
              Select a person in the tree to view details
            </div>
          )}
        </div>
      </aside>

      <div className="relative flex-1">
        <FamilyTree
          treeId={treeId}
          people={people || []}
          relationships={relationships || []}
          onNodeClick={(id) => setSelectedPersonId(id)}
        />
      </div>
    </main>
  )
}
