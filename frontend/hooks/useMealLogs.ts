import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { CreateMealLogDto, UpdateMealLogDto } from "@/types/food";

export function useMealLogs(params?: { date_from?: string; date_to?: string; meal_slot?: string; tag?: string }) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["meal-logs", params],
    queryFn: async () => {
      const res = await api.food.list(params);
      if (res.error) throw new Error(res.error.message);
      return res.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (dto: CreateMealLogDto) => {
      const res = await api.food.create(dto);
      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meal-logs"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdateMealLogDto }) => {
      const res = await api.food.update(id, dto);
      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meal-logs"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.food.delete(id);
      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meal-logs"] });
    },
  });

  return {
    ...query,
    meals: query.data || [],
    createMeal: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateMeal: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteMeal: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}
