import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { TransactionQuery } from "../types/transaction";

export function useTransactions(params: TransactionQuery = {}) {
  return useQuery({
    queryKey: ["transactions", params],
    queryFn: async () => {
      const response = await api.transactions.list(params);
      if (response.error) throw new Error(response.error.message);
      return response.data || { items: [], total: 0, page: 1, page_size: 10 };
    },
  });
}
