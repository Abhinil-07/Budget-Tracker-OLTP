import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export function useInvestments() {
  return useQuery({
    queryKey: ["investments"],
    queryFn: async () => {
      const response = await api.investments.list();
      if (response.error) throw new Error(response.error.message);
      return response.data || [];
    },
  });
}
