import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import api from "@/lib/api"

export type FamilyTreeRecord = {
  id: string
  name: string
  family_name?: string
  display_name?: string
  created?: boolean
  _count?: { people?: number }
}

export function useTrees() {
  const queryClient = useQueryClient()
  const { data: session, status } = useSession()
  const hasToken = Boolean(session?.user?.accessToken)

  const query = useQuery({
    queryKey: ["trees", session?.user?.id],
    queryFn: async () => {
      const { data } = await api.get("/trees")
      return data as FamilyTreeRecord[]
    },
    enabled: status === "authenticated" && hasToken,
    retry: 1,
  })

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const familyName = name.trim()
      if (!familyName) {
        throw new Error("Enter a family name")
      }
      const { data } = await api.post("/trees", { name: familyName })
      if (!data?.id) {
        throw new Error("Server did not return the new family tree")
      }
      return data as FamilyTreeRecord
    },
    onSuccess: (tree) => {
      queryClient.setQueryData<FamilyTreeRecord[] | undefined>(
        ["trees", session?.user?.id],
        (current) => {
          const list = current ? [...current] : []
          const index = list.findIndex((item) => item.id === tree.id)
          const next = {
            ...tree,
            display_name: tree.display_name || `${tree.name} family tree`,
            _count: tree._count || { people: 0 },
          }
          if (index >= 0) list[index] = { ...list[index], ...next }
          else list.push(next)
          return list.sort((a, b) =>
            String(a.name).localeCompare(String(b.name), undefined, { sensitivity: "base" }),
          )
        },
      )
      queryClient.invalidateQueries({ queryKey: ["trees"] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (treeId: string) => {
      const { data } = await api.delete(`/trees/${treeId}`)
      return data as { id: string; deleted: boolean; name?: string; people_removed?: number }
    },
    onSuccess: (_data, treeId) => {
      queryClient.setQueryData<FamilyTreeRecord[] | undefined>(
        ["trees", session?.user?.id],
        (current) => (current || []).filter((tree) => tree.id !== treeId),
      )
      queryClient.invalidateQueries({ queryKey: ["trees"] })
      queryClient.removeQueries({ queryKey: ["people", treeId] })
      queryClient.removeQueries({ queryKey: ["relationships", treeId] })
      queryClient.removeQueries({ queryKey: ["tree", treeId] })
    },
  })

  return {
    trees: query.data,
    isLoading: status === "loading" || (hasToken && query.isLoading),
    isError: query.isError,
    hasToken,
    createTree: createMutation.mutateAsync,
    deleteTree: deleteMutation.mutateAsync,
    refetchTrees: query.refetch,
  }
}
