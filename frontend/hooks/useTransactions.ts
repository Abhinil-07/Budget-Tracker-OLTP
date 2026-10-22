import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { TransactionQuery } from "../types/transaction";
import { useAuthStore } from "../stores/useAuthStore";

export function useTransactions(params: TransactionQuery = {}) {
  const { token, hydrated } = useAuthStore();
  return useQuery({
    queryKey: ["transactions", params],
    queryFn: async () => {
      const response = await api.transactions.list(params);
      if (response.error) throw new Error(response.error.message);
      return response.data || { items: [], total: 0, page: 1, page_size: 10 };
    },
    enabled: hydrated && !!token,
  });
}
