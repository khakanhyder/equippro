import { useQuery } from "@tanstack/react-query";

export interface DashboardStats {
  surplusCount: number;
  publishedCount: number;
  wishlistCount: number;
  bidsReceivedCount: number;
  activeBidsCount: number;
  totalBidValue: number;
  matchesCount: number;
  newMatchesToday: number;
}

export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });
}
