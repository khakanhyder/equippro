import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Bid, InsertBid } from "@shared/schema";

export function useBidsReceived() {
  return useQuery<Array<{ bid: Bid; equipment: any }>>({
    queryKey: ["/api/bids/received"],
  });
}

export function useBidMutations() {
  const createBid = useMutation({
    mutationFn: async (data: InsertBid) => {
      const res = await apiRequest('POST', '/api/bids', data);
      return res.json() as Promise<Bid>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bids/received'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
    },
  });

  const updateBidStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest('PATCH', `/api/bids/${id}/status`, { status });
      return res.json() as Promise<Bid>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bids/received'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
    },
  });

  return {
    createBid,
    updateBidStatus,
  };
}
