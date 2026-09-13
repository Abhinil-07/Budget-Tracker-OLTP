import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { CreateStudyLogDto, UpdateStudyLogDto, CreateStudyGoalDto, UpdateStudyGoalDto } from "@/types/study";

export function useStudyLogs(params?: { date_from?: string; date_to?: string; topic?: string }) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["study-logs", params],
    queryFn: async () => {
      const res = await api.study.list(params);
      if (res.error) throw new Error(res.error.message);
      return res.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (dto: CreateStudyLogDto) => {
      const res = await api.study.create(dto);
      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["study-logs"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdateStudyLogDto }) => {
      const res = await api.study.update(id, dto);
      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["study-logs"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.study.delete(id);
      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["study-logs"] });
    },
  });

  return {
    ...query,
    logs: query.data || [],
    createLog: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateLog: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteLog: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}

export function useStudyGoals(params?: { month?: string; status?: string }) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["study-goals", params],
    queryFn: async () => {
      const res = await api.study.listGoals(params);
      if (res.error) throw new Error(res.error.message);
      return res.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (dto: CreateStudyGoalDto) => {
      const res = await api.study.createGoal(dto);
      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["study-goals"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdateStudyGoalDto }) => {
      const res = await api.study.updateGoal(id, dto);
      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["study-goals"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.study.deleteGoal(id);
      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["study-goals"] });
    },
  });

  return {
    ...query,
    goals: query.data || [],
    createGoal: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateGoal: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteGoal: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}
