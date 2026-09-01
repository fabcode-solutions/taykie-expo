import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000, // 10 seconds - minimal caching for real-time updates
      refetchOnMount: true, // Refresh data when component mounts
      refetchOnReconnect: true,
      refetchOnWindowFocus: true, // Refresh when app comes back to focus
      retry: 2,
    },
    mutations: {
      retry: 0,
    },
  },
});
