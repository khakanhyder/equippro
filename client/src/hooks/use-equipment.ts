import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Equipment, InsertEquipment } from "@shared/schema";

export function useEquipmentList(status?: string, createdBy?: string) {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (createdBy) params.append('createdBy', createdBy);
  
  const queryString = params.toString();
  const url = queryString ? `/api/equipment?${queryString}` : '/api/equipment';
  
  return useQuery<Equipment[]>({
    queryKey: ['equipment', { status, createdBy }],
    queryFn: async () => {
      const res = await fetch(url, {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error(`${res.status}: ${res.statusText}`);
      }
      return res.json();
    },
    enabled: true,
  });
}

export function useEquipmentMutations() {
  const createEquipment = useMutation({
    mutationFn: async (data: InsertEquipment) => {
      const res = await apiRequest('POST', '/api/equipment', data);
      return res.json() as Promise<Equipment>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
    },
  });

  const updateEquipment = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertEquipment> }) => {
      const res = await apiRequest('PATCH', `/api/equipment/${id}`, data);
      return res.json() as Promise<Equipment>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
    },
  });

  const deleteEquipment = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/equipment/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
    },
  });

  const publishEquipment = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('PATCH', `/api/equipment/${id}`, { listingStatus: 'active' });
      return res.json() as Promise<Equipment>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
    },
  });

  const unpublishEquipment = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('PATCH', `/api/equipment/${id}`, { listingStatus: 'draft' });
      return res.json() as Promise<Equipment>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
    },
  });

  const markAsSold = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('PATCH', `/api/equipment/${id}`, { listingStatus: 'sold' });
      return res.json() as Promise<Equipment>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
    },
  });

  return {
    createEquipment,
    updateEquipment,
    deleteEquipment,
    publishEquipment,
    unpublishEquipment,
    markAsSold,
  };
}
