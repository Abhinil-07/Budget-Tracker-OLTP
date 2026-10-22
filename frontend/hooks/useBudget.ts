import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuthStore } from "../stores/useAuthStore";

export function useBudget(month?: string) {
  const { token, hydrated } = useAuthStore();
  return useQuery({
    queryKey: ["budget", month],
    queryFn: async () => {
      const response = await api.budget.get(month);
      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    enabled: hydrated && !!token,
  });
}
