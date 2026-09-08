import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"

export function useRelationships(treeId: string) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ["relationships", treeId],
    queryFn: async () => {
      const { data } = await api.get(`/relationships/tree/${treeId}`)
      return data
    },
    enabled: !!treeId,
  })

  const createMutation = useMutation({
    mutationFn: async (relData: Record<string, unknown>) => {
      const { data } = await api.post(`/relationships/tree/${treeId}`, relData)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["relationships", treeId] })
    },
  })

  const linkParentsMutation = useMutation({
    mutationFn: async (payload: { child_id: string; father_id: string; mother_id: string }) => {
      const { data } = await api.post(`/relationships/tree/${treeId}/link-parents`, payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["relationships", treeId] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const { data: response } = await api.patch(`/relationships/${id}`, data)
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["relationships", treeId] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/relationships/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["relationships", treeId] })
    },
  })

  return {
    relationships: query.data as any[] | undefined,
    isLoading: query.isLoading,
    isError: query.isError,
    createRelationship: createMutation.mutateAsync,
    linkParents: linkParentsMutation.mutateAsync,
    updateRelationship: updateMutation.mutateAsync,
    deleteRelationship: deleteMutation.mutateAsync,
  }
}
