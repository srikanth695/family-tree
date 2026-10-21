"use client"

import React, { useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { usePeople } from "@/hooks/use-people"
import { useRelationships } from "@/hooks/use-relationships"
import { useTrees, type FamilyTreeRecord } from "@/hooks/use-trees"
import FamilyTree from "@/components/tree/FamilyTree"
import { MemberForm } from "@/components/tree/MemberForm"
import { RelationshipForm } from "@/components/tree/RelationshipForm"
import { FamilyInsights } from "@/components/tree/FamilyInsights"
import { PersonDetails } from "@/components/tree/PersonDetails"
import { Button } from "@/components/ui/button"
import { useFeedback } from "@/components/feedback-provider"
import Link from "next/link"
import api, { mediaFileUrl } from "@/lib/api"
import { useMedia } from "@/hooks/use-media"
import { familySurname } from "@/lib/person-display"
import { titleCaseWords } from "@/lib/utils"
import { familyTreeTitle, hasRight, type TreeLayout } from "@family-tree/types"
import { ThemeToggle } from "@/components/theme-toggle"

export default function TreePage() {
  const params = useParams()
  const router = useRouter()
  const treeId = params.treeId as string
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const { deleteTree } = useTrees()
  const { confirm, notify } = useFeedback()
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null)
  const [deletingTree, setDeletingTree] = useState(false)

  const canDeleteTree =
    session?.user?.role === "admin" && hasRight(session?.user?.role, "delete_family_tree")

  const { people, isLoading: peopleLoading, isError: peopleError } = usePeople(treeId)
  const { relationships, isLoading: relsLoading } = useRelationships(treeId)
  const { media } = useMedia(treeId)
  const accessToken =
    session?.user?.accessToken || (session as { accessToken?: string } | null)?.accessToken

  // A chosen profile photo wins; otherwise the newest photo uploaded for the person is used.
  const photoUrls = useMemo(() => {
    const photos = (media || []).filter((item) => item.type === "photo" && item.person_id)
    const photoIds = new Set(photos.map((item) => item.id))
    const newest = new Map<string, { id: string; at: number }>()
    for (const item of photos) {
      const at = new Date(item.created_at).getTime() || 0
      const current = newest.get(item.person_id)
      if (!current || at > current.at) newest.set(item.person_id, { id: item.id, at })
    }
    const urls: Record<string, string> = {}
    for (const [personId, { id }] of newest) urls[personId] = mediaFileUrl(id, accessToken)
    for (const person of people || []) {
      if (person.profile_media_id && photoIds.has(person.profile_media_id)) {
        urls[person.id] = mediaFileUrl(person.profile_media_id, accessToken)
      }
    }
    return urls
  }, [media, people, accessToken])
  const treeQuery = useQuery({
    queryKey: ["tree", treeId],
    queryFn: async () => {
      const { data } = await api.get(`/trees/${treeId}`)
      return data as FamilyTreeRecord
    },
    enabled: !!treeId,
  })

  // Mirrors the server: system roles with edit rights, or an owner/editor membership.
  const canEditLayout =
    hasRight(session?.user?.role, "edit_family_data") ||
    treeQuery.data?.my_role === "owner" ||
    treeQuery.data?.my_role === "editor"

  const setCachedLayout = (layout: TreeLayout | null) => {
    queryClient.setQueryData<FamilyTreeRecord | undefined>(["tree", treeId], (current) =>
      current ? { ...current, layout } : current,
    )
  }

  const saveLayout = useMutation({
    mutationFn: async (layout: TreeLayout) => {
      await api.put(`/trees/${treeId}/layout`, layout)
      return layout
    },
    onSuccess: setCachedLayout,
    onError: (error) =>
      notify(error instanceof Error ? error.message : "Could not save the tree layout"),
  })

  const resetLayout = useMutation({
    mutationFn: async () => {
      await api.delete(`/trees/${treeId}/layout`)
    },
    onSuccess: () => setCachedLayout(null),
    onError: (error) =>
      notify(error instanceof Error ? error.message : "Could not reset the tree layout"),
  })

  const selectedPerson = people?.find((p) => p.id === selectedPersonId) || null
  const treeTitle = familyTreeTitle(treeQuery.data)

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["people", treeId] })
    queryClient.invalidateQueries({ queryKey: ["relationships", treeId] })
    queryClient.invalidateQueries({ queryKey: ["trees"] })
  }

  async function onDeleteTree() {
    if (!canDeleteTree) return
    const peopleCount = people?.length ?? 0
    const confirmed = await confirm({
      title: `Delete ${treeTitle}?`,
      description: `This permanently removes the tree${peopleCount ? ` and its ${peopleCount} ${peopleCount === 1 ? "person" : "people"}` : ""}, relationships, and media. This cannot be undone.`,
      confirmLabel: "Delete family tree",
      destructive: true,
    })
    if (!confirmed) return
    setDeletingTree(true)
    try {
      await deleteTree(treeId)
      router.push("/dashboard")
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to delete family tree")
      setDeletingTree(false)
    }
  }

  // The saved layout must be known before the canvas first lays people out.
  if (peopleLoading || relsLoading || treeQuery.isLoading) {
    return (
      <div className="relative flex min-h-dvh items-center justify-center">
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>
        <p className="text-xl text-stone-500 dark:text-stone-400">Loading your family tree...</p>
      </div>
    )
  }

  if (peopleError) {
    return (
      <div className="relative flex min-h-dvh flex-col items-center justify-center gap-4">
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>
        <p className="text-stone-700 dark:text-stone-200">You do not have access to this tree, or it does not exist.</p>
        <Link className="underline" href="/dashboard">Back to dashboard</Link>
      </div>
    )
  }

  const memberForm = (
    <MemberForm
      treeId={treeId}
      people={people || []}
      familyName={treeQuery.data?.family_name}
      onSuccess={refresh}
    />
  )

  return (
    <main className="grid h-dvh w-full grid-rows-[auto_minmax(0,1fr)] overflow-hidden bg-stone-50 md:grid-cols-[20rem_minmax(0,1fr)] dark:bg-stone-950">
      <header className="border-b border-stone-200 bg-white p-4 md:col-start-1 md:row-start-1 md:border-r dark:border-stone-800 dark:bg-stone-900">
        <div className="flex items-center justify-between gap-2">
          <Link href="/dashboard" className="text-sm text-stone-600 hover:underline dark:text-stone-400">Dashboard</Link>
          <ThemeToggle />
        </div>
        <h1 className="mt-2 text-lg font-semibold text-stone-900 dark:text-stone-50">{treeTitle}</h1>
        <div className="mt-4 flex flex-wrap gap-2">
          <RelationshipForm
            treeId={treeId}
            people={people || []}
            familyName={treeQuery.data?.family_name}
            onSuccess={refresh}
          />
          {memberForm}
        </div>
        <FamilyInsights
          people={people || []}
          relationships={relationships || []}
          onSelectPerson={(id) => setSelectedPersonId(id)}
        />
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
      </header>

      {/* Bottom sheet over the canvas on phones; the left column from md up. */}
      <section
        aria-label="Person details"
        className={`fixed inset-x-0 bottom-0 z-30 max-h-[65dvh] overflow-y-auto rounded-t-xl border-t border-stone-200 bg-white p-4 shadow-2xl md:static md:col-start-1 md:row-start-2 md:block md:max-h-none md:rounded-none md:border-r md:border-t-0 md:shadow-none dark:border-stone-800 dark:bg-stone-900 ${
          selectedPerson ? "" : "hidden"
        }`}
      >
        {selectedPerson ? (
          <div className="space-y-6">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-lg font-bold text-stone-900 dark:text-stone-50">
                {titleCaseWords(selectedPerson.first_name)} {titleCaseWords(selectedPerson.last_name)}
              </h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="md:hidden"
                onClick={() => setSelectedPersonId(null)}
              >
                Close
              </Button>
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
          <div className="flex h-full items-center justify-center text-center text-sm text-stone-500 dark:text-stone-400">
            Select a person in the tree to view details
          </div>
        )}
      </section>

      <div className="relative row-start-2 md:col-start-2 md:row-span-2 md:row-start-1">
        <FamilyTree
          treeId={treeId}
          people={people || []}
          relationships={relationships || []}
          selectedId={selectedPersonId}
          onNodeClick={(id) => setSelectedPersonId(id)}
          savedLayout={treeQuery.data?.layout}
          canEdit={canEditLayout}
          onSaveLayout={(layout) => saveLayout.mutate(layout)}
          onResetLayout={() => resetLayout.mutate()}
          emptyState={memberForm}
          photoUrls={photoUrls}
          familyName={familySurname(treeQuery.data)}
        />
      </div>
    </main>
  )
}
