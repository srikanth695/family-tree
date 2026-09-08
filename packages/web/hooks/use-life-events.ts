import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"

export function useLifeEvents(personId: string) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ["life-events", personId],
    queryFn: async () => {
      const { data } = await api.get(`/life-events/person/${personId}`)
      return data
    },
    enabled: !!personId,
  })

  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await api.post(`/life-events/person/${personId}`, payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["life-events", personId] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const { data: responseData } = await api.patch(`/life-events/${id}`, data)
      return responseData
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["life-events", personId] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/life-events/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["life-events", personId] })
    },
  })

  return {
    lifeEvents: query.data as any[] | undefined,
    isLoading: query.isLoading,
    isError: query.isError,
    createLifeEvent: createMutation.mutateAsync,
    updateLifeEvent: updateMutation.mutateAsync,
    deleteLifeEvent: deleteMutation.mutateAsync,
  }
}
