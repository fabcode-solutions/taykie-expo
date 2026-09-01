import { persist } from "zustand/middleware";
import { mmkvJSONStateStorage, setTokenInNative } from "./stateStorage";
import { setAuthToken } from "@/services/api/token";
import { CreateLogRequest, Medication, ProductRequest } from "@/types/products.types";
import {
  createLog,
  createProduct,
  deleteProduct,
  getProductById,
  getPublicProducts,
  getUserProducts,
  updateProduct,
} from "@/hooks/queries/products";
import { create } from "zustand";
import { getErrorMessage } from "./postStore";

export interface User {
  id: string;
  email: string;
  emailVerified?: boolean;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  bio?: string | null;
  birthYear?: number | null;
  gender?: string | null;
  country?: string | null;
  phoneNumber: string | null;
  locale?: string;
  timezone?: string;
  preferences?: Record<string, any>;
  notificationUid?: string | null;
  loginCount?: number;
}
// type User = AuthUser & { name?: string };

type State = {
  products: Medication[];
  userProducts: Medication[];
  currentPage: number;
  hasMore: boolean;
  isLoading: boolean;
  error: string | null;
};

type Actions = {
  createProduct: (requestBody: ProductRequest) => Promise<string>;
  fetchUserProducts: (isRefresh?: boolean) => Promise<void>;
  fetchPublicProducts: () => Promise<void>;
  fetchProductById: (productId: string) => Promise<Medication>;
  deleteProductById: (productId: string) => Promise<void>;
  updateProduct: (productId: string, updateRequest: ProductRequest) => Promise<string>;
  fetchProducts: (isRefresh?: boolean) => Promise<void>;
  createProductLog: (scheduleId: string, request: CreateLogRequest) => Promise<string>;
  clearError: () => void;
};

const initialState: State = {
  products: [],
  userProducts: [],
  isLoading: false,
  currentPage: 1,
  hasMore: true,
  error: null,
};

// API base URL now handled by the shared api client + endpoints

export const useProductStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Actions
      createProduct: async (requestBody) => {
        set({ isLoading: true, error: null });
        try {
          const response = await createProduct(requestBody);
          await get().fetchProducts();

          set({ isLoading: false });
          return response.data.id;
        } catch (error) {
          const message = getErrorMessage(error);
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : "Create Product failed",
          });
          throw Error(message);
        }
      },
      fetchPublicProducts: async () => {
        set({ isLoading: true, error: null });
        try {
          const result = await getPublicProducts();
          set({ isLoading: false, products: result?.data });
        } catch (error) {
          const message = getErrorMessage(error);
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : "Fetch Public Products failed",
          });
          throw Error(message);
        }
      },
      fetchUserProducts: async (isRefresh = true) => {
        const { currentPage, hasMore, isLoading } = get();

        if (isLoading || (!isRefresh && !hasMore)) return;

        set({ isLoading: true, error: null });

        try {
          const pageToFetch = isRefresh ? 1 : currentPage + 1;
          const result = await getUserProducts(pageToFetch);
          const newProducts = result?.data ?? [];

          set((state) => {
            const combined = isRefresh ? newProducts : [...state.userProducts, ...newProducts];
            const uniqueMap = new Map();
            combined.forEach((p) => uniqueMap.set(p.id, p));
            const finalProducts = Array.from(uniqueMap.values());

            return {
              userProducts: finalProducts,
              currentPage: pageToFetch,
              hasMore: finalProducts.length < (result?.meta?.total ?? 0),
              isLoading: false,
            };
          });
        } catch (error) {
          const message = getErrorMessage(error);
          set({ isLoading: false, error: message });
          throw Error(message);
        }
      },
      fetchProductById: async (productId) => {
        set({ isLoading: true, error: null });
        try {
          const result = await getProductById(productId);
          set({ isLoading: false });
          return result.data;
        } catch (error) {
          const message = getErrorMessage(error);
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : "Fetch Product By ID failed",
          });
          throw Error(message);
        }
      },

      deleteProductById: async (productId) => {
        set({ isLoading: true, error: null });
        try {
          await deleteProduct(productId);
          set({ isLoading: false });
        } catch (error) {
          const message = getErrorMessage(error);
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : "Delete Product failed",
          });
          throw Error(message);
        }
      },

      updateProduct: async (productId, request) => {
        set({ isLoading: true, error: null });
        try {
          const response = await updateProduct(productId, request);
          await get().fetchProducts();
          set({ isLoading: false });
          return response.message;
        } catch (error) {
          const message = getErrorMessage(error);
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : "Update Product failed",
          });
          throw Error(message);
        }
      },
      fetchProducts: async (isRefresh = true) => {
        try {
          await get().fetchUserProducts(isRefresh);
          await get().fetchPublicProducts();
        } catch (error) {
          const message = getErrorMessage(error);
          set({ isLoading: false, error: message });
          throw Error(message);
        }
      },

      createProductLog: async (scheduleId, request) => {
        set({ isLoading: true, error: null });
        try {
          const response = await createLog(scheduleId, request);
          set({ isLoading: false });
          return response.message;
        } catch (error) {
          const message = getErrorMessage(error);
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : "Create Product Log failed",
          });
          throw Error(message);
        }
      },
      clearError: () => set({ error: null }),

      reset: () => set(initialState),
    }),
    {
      name: "product-store",
      storage: mmkvJSONStateStorage,
      partialize: (state) => ({
        products: state.products,
        userProducts: state.userProducts,
      }),
      onRehydrateStorage: () => (state) => {
        try {
          const token = state?.token ?? null;
          setAuthToken(token);
          if (token) {
            // Ensure native side also has the token on cold start
            setTokenInNative(token);
          }
        } catch {}
      },
    },
  ),
);
