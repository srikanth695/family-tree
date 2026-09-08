import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"

export function useMedia(treeId: string) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ["media", treeId],
    queryFn: async () => {
      const { data } = await api.get(`/media/tree/${treeId}`)
      return data
    },
    enabled: !!treeId,
  })

  const uploadMutation = useMutation({
    mutationFn: async ({ personId, file }: { personId: string | null; file: File }) => {
      const formData = new FormData()
      formData.append("file", file)
      const url = personId
        ? `/media/tree/${treeId}?personId=${encodeURIComponent(personId)}`
        : `/media/tree/${treeId}`
      const { data } = await api.post(url, formData)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media", treeId] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/media/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media", treeId] })
    },
  })

  return {
    media: query.data as any[] | undefined,
    isLoading: query.isLoading,
    isError: query.isError,
    uploadMedia: uploadMutation.mutateAsync,
    deleteMedia: deleteMutation.mutateAsync,
  }
}
