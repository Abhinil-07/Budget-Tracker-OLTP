import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export function useAccounts() {
  return useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const response = await api.accounts.list();
      if (response.error) throw new Error(response.error.message);
      return response.data || [];
    },
  });
}
