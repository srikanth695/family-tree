import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"

export function usePeople(treeId: string) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ["people", treeId],
    queryFn: async () => {
      const { data } = await api.get(`/people/tree/${treeId}`)
      return data
    },
    enabled: !!treeId,
  })

  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await api.post(`/people/tree/${treeId}`, payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["people", treeId] })
      queryClient.invalidateQueries({ queryKey: ["relationships", treeId] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const { data: responseData } = await api.patch(`/people/${id}`, data)
      return responseData
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["people", treeId] })
      queryClient.invalidateQueries({ queryKey: ["relationships", treeId] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/people/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["people", treeId] })
      queryClient.invalidateQueries({ queryKey: ["relationships", treeId] })
      queryClient.invalidateQueries({ queryKey: ["media", treeId] })
    },
  })

  return {
    people: query.data as any[] | undefined,
    isLoading: query.isLoading,
    isError: query.isError,
    createPerson: createMutation.mutateAsync,
    updatePerson: updateMutation.mutateAsync,
    deletePerson: deleteMutation.mutateAsync,
  }
}
