import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import type { User } from "@shared/schema";

type LoginCredentials = {
  username: string;
  password: string;
};

type SignupCredentials = LoginCredentials & {
  email?: string;
};

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<Omit<User, 'password'> | null>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    user: user ?? undefined,
    isLoading,
    error,
    isAuthenticated: !!user,
  };
}

export function useLogin() {
  return useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      return await apiRequest("POST", "/api/auth/login", credentials);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });
}

export function useSignup() {
  return useMutation({
    mutationFn: async (credentials: SignupCredentials) => {
      return await apiRequest("POST", "/api/auth/signup", credentials);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
      queryClient.clear();
    },
  });
}

export function useUpdatePassword() {
  return useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      return await apiRequest("PATCH", "/api/auth/password", data);
    },
  });
}

export function useUpdateProfile() {
  return useMutation({
    mutationFn: async (data: { email?: string; firstName?: string; lastName?: string }) => {
      return await apiRequest("PATCH", "/api/auth/profile", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });
}
