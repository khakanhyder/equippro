import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { WishlistProject, InsertWishlistProject, WishlistItem, InsertWishlistItem, Match } from "@shared/schema";

export function useProjects(createdBy?: string) {
  const params = new URLSearchParams();
  if (createdBy) params.append('createdBy', createdBy);
  
  const queryString = params.toString();
  const url = queryString ? `/api/wishlist-projects?${queryString}` : '/api/wishlist-projects';
  
  return useQuery<WishlistProject[]>({
    queryKey: ['projects', { createdBy }],
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

export function useProject(id: number) {
  return useQuery<WishlistProject>({
    queryKey: ['projects', id],
    queryFn: async () => {
      const res = await fetch(`/api/wishlist-projects/${id}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error(`${res.status}: ${res.statusText}`);
      }
      return res.json();
    },
    enabled: !!id,
  });
}

export function useProjectMutations() {
  const createProject = useMutation({
    mutationFn: async (data: InsertWishlistProject) => {
      const res = await apiRequest('POST', '/api/wishlist-projects', data);
      return res.json() as Promise<WishlistProject>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const updateProject = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertWishlistProject> }) => {
      const res = await apiRequest('PATCH', `/api/wishlist-projects/${id}`, data);
      return res.json() as Promise<WishlistProject>;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['projects', variables.id] });
    },
  });

  const deleteProject = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/wishlist-projects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  return {
    createProject,
    updateProject,
    deleteProject,
  };
}

export function useWishlistItems(projectId?: number) {
  const params = new URLSearchParams();
  if (projectId) params.append('projectId', projectId.toString());
  
  const queryString = params.toString();
  const url = queryString ? `/api/wishlist-items?${queryString}` : '/api/wishlist-items';
  
  return useQuery<WishlistItem[]>({
    queryKey: ['wishlist', { projectId }],
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

export function useWishlistItem(id: number) {
  return useQuery<WishlistItem>({
    queryKey: ['wishlist', id],
    queryFn: async () => {
      const res = await fetch(`/api/wishlist-items/${id}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error(`${res.status}: ${res.statusText}`);
      }
      return res.json();
    },
    enabled: !!id,
  });
}

export function useWishlistMutations() {
  const createWishlistItem = useMutation({
    mutationFn: async (data: InsertWishlistItem) => {
      const res = await apiRequest('POST', '/api/wishlist-items', data);
      return res.json() as Promise<WishlistItem>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const updateWishlistItem = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertWishlistItem> }) => {
      const res = await apiRequest('PATCH', `/api/wishlist-items/${id}`, data);
      return res.json() as Promise<WishlistItem>;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      queryClient.invalidateQueries({ queryKey: ['wishlist', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const deleteWishlistItem = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/wishlist-items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  return {
    createWishlistItem,
    updateWishlistItem,
    deleteWishlistItem,
  };
}

export function useMatches(wishlistItemId: number) {
  return useQuery<Match[]>({
    queryKey: ['matches', wishlistItemId],
    queryFn: async () => {
      const res = await fetch(`/api/wishlist-items/${wishlistItemId}/matches`, {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error(`${res.status}: ${res.statusText}`);
      }
      return res.json();
    },
    enabled: !!wishlistItemId,
  });
}

export function useFindMatches() {
  return useMutation({
    mutationFn: async (wishlistItemId: number) => {
      const res = await apiRequest('POST', `/api/wishlist-items/${wishlistItemId}/find-matches`);
      return res.json() as Promise<Match[]>;
    },
    onSuccess: (_, wishlistItemId) => {
      queryClient.invalidateQueries({ queryKey: ['matches', wishlistItemId] });
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
  });
}

export function useMatchMutations() {
  const updateMatch = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { status: string } }) => {
      const res = await apiRequest('PATCH', `/api/matches/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
  });

  return {
    updateMatch,
  };
}
