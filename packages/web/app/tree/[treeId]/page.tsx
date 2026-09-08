"use client"

import React, { useState } from "react"
import { useParams } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { usePeople } from "@/hooks/use-people"
import { useRelationships } from "@/hooks/use-relationships"
import FamilyTree from "@/components/tree/FamilyTree"
import { MemberForm } from "@/components/tree/MemberForm"
import { RelationshipForm } from "@/components/tree/RelationshipForm"
import { PersonDetails } from "@/components/tree/PersonDetails"
import Link from "next/link"
import api from "@/lib/api"

export default function TreePage() {
  const params = useParams()
  const treeId = params.treeId as string
  const queryClient = useQueryClient()
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null)

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

  if (peopleLoading || relsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-xl text-stone-500">Loading your family tree...</p>
      </div>
    )
  }

  if (peopleError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-stone-700">You do not have access to this tree, or it does not exist.</p>
        <Link className="underline" href="/dashboard">Back to dashboard</Link>
      </div>
    )
  }

  return (
    <main className="flex h-screen w-full overflow-hidden bg-stone-50">
      <aside className="flex w-80 flex-col border-r border-stone-200 bg-white">
        <div className="border-b border-stone-200 p-4">
          <Link href="/dashboard" className="text-sm text-stone-500 hover:underline">Dashboard</Link>
          <h2 className="mt-2 text-lg font-semibold text-stone-900">{treeTitle}</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            <RelationshipForm treeId={treeId} people={people || []} onSuccess={refresh} />
            <MemberForm treeId={treeId} people={people || []} onSuccess={refresh} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {selectedPerson ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-stone-900">
                  {selectedPerson.first_name} {selectedPerson.last_name}
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
            <div className="flex h-full items-center justify-center text-center text-sm text-stone-400">
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
