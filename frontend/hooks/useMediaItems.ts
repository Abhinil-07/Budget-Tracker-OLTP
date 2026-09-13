import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { CreateMediaItemDto, UpdateMediaItemDto } from "@/types/media";

export function useMediaItems(params?: { media_type?: string; status?: string }) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["media-items", params],
    queryFn: async () => {
      const res = await api.media.list(params);
      if (res.error) throw new Error(res.error.message);
      return res.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (dto: CreateMediaItemDto) => {
      const res = await api.media.create(dto);
      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media-items"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdateMediaItemDto }) => {
      const res = await api.media.update(id, dto);
      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media-items"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.media.delete(id);
      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media-items"] });
    },
  });

  return {
    ...query,
    items: query.data || [],
    createItem: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateItem: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteItem: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}
