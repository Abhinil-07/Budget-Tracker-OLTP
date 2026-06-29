import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export function useBudget(month?: string) {
  return useQuery({
    queryKey: ["budget", month],
    queryFn: async () => {
      const response = await api.budget.get(month);
      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
  });
}
