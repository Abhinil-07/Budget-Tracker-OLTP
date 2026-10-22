import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuthStore } from "../stores/useAuthStore";

export function useAccounts() {
  const { token, hydrated } = useAuthStore();
  return useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const response = await api.accounts.list();
      if (response.error) throw new Error(response.error.message);
      return response.data || [];
    },
    enabled: hydrated && !!token,
  });
}
