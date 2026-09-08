import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import api from "@/lib/api"
import { SystemRole } from "@family-tree/types"

export type ManagedUser = {
  id: string
  email: string
  name: string | null
  role: string
  created_at: string
}

export function useUsers() {
  const queryClient = useQueryClient()
  const { data: session, status } = useSession()
  const isAdmin = session?.user?.role === "admin"
  const hasToken = Boolean(session?.user?.accessToken)

  const query = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data } = await api.get("/users")
      return data as ManagedUser[]
    },
    enabled: status === "authenticated" && hasToken && isAdmin,
  })

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: SystemRole }) => {
      const { data } = await api.patch(`/users/${id}/role`, { role })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
    },
  })

  return {
    users: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    updateRole: updateRoleMutation.mutateAsync,
  }
}
