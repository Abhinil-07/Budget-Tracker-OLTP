import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { CreateGymSessionDto, UpdateGymSessionDto } from "@/types/gym";

export function useGymSessions(params?: { date_from?: string; date_to?: string; split_type?: string }) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["gym-sessions", params],
    queryFn: async () => {
      const res = await api.gym.list(params);
      if (res.error) throw new Error(res.error.message);
      return res.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (dto: CreateGymSessionDto) => {
      const res = await api.gym.create(dto);
      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gym-sessions"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdateGymSessionDto }) => {
      const res = await api.gym.update(id, dto);
      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gym-sessions"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.gym.delete(id);
      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gym-sessions"] });
    },
  });

  return {
    ...query,
    sessions: query.data || [],
    createSession: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateSession: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteSession: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}
