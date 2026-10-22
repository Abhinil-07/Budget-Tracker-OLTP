import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuthStore } from "../stores/useAuthStore";

export function useInvestments() {
  const { token, hydrated } = useAuthStore();
  return useQuery({
    queryKey: ["investments"],
    queryFn: async () => {
      const response = await api.investments.list();
      if (response.error) throw new Error(response.error.message);
      return response.data || [];
    },
    enabled: hydrated && !!token,
  });
}
