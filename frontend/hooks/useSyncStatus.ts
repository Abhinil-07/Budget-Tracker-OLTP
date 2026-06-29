import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export function useSyncStatus() {
  return useQuery({
    queryKey: ["sync-status"],
    queryFn: async () => {
      const response = await api.sync.status();
      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    refetchInterval: 60 * 1000, // Refresh status every minute
  });
}
