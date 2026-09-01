import {
  Comment,
  CommentResponse,
  CommunityFilter,
  CommunityPost,
  CreatePostRequest,
} from "@/types/posts.types";
import {
  addComment,
  bookmarkById,
  createPost,
  deleteComment,
  deletePost,
  getBookmarkedPost,
  getCommentReplies,
  getComments,
  getPostById,
  getPostsByUserId,
  getUserPosts,
  likePostById,
  replyToComment,
  reportPost,
  searchBookmarkedPosts,
  searchPosts,
  unBookmarkById,
  unlikePostById,
  updatePost,
  voteOnPoll,
} from "@/hooks/queries/posts";
import { create } from "zustand";
import { useUploadStore } from "./uploadStore";
import { ReportRequest } from "@/services/api/auth";

type State = {
  userPosts: CommunityPost[];
  post: CommunityPost | null;
  postComments: CommentResponse[];
  bookmarkedPost: CommunityPost[];
  isLoading: boolean;
  error: string | null;
  currentPage: number;
  hasMore: boolean;
  postReplies: CommentResponse[];
  otherUserPosts: CommunityPost[];
};

type Actions = {
  createPost: (requestBody: CreatePostRequest) => Promise<string>;
  fetchUserPosts: (filter?: CommunityFilter, isRefresh?: boolean) => Promise<void>;
  fetchBookmarkedPosts: (isRefresh?: boolean) => Promise<void>;
  fetchPostById: (postId: string) => Promise<void>;
  deletePost: (scheduleId: string) => Promise<void>;
  updatePost: (scheduleId: string, updateRequest: CreatePostRequest) => Promise<void>;
  likePost: (postId: string) => Promise<void>;
  unLikePost: (postId: string) => Promise<void>;
  bookmarkPost: (postId: string) => Promise<void>;
  unBookmarkPost: (postId: string) => Promise<void>;
  fetchPostComments: (postId: string) => Promise<void>;
  addCommentToPost: (postId: string, content: string) => Promise<void>;
  removeCommentFromPost: (postId: string, commentId: string) => Promise<void>;
  voteOnPollPost: (postId: string, optionId: string) => Promise<void>;
  replyToCommmentWithId: (postId: string, request: Comment) => Promise<void>;
  fetchCommentReplies: (commentId: string) => Promise<void>;
  searchUserPosts: (
    searchText: string,
    filter: CommunityFilter,
    isRefresh?: boolean,
  ) => Promise<void>;
  submitPostReport: (postId: string, request: ReportRequest) => Promise<string>;
  fetchPostsByUserId: (userId: string, isRefresh?: boolean) => Promise<void>;
  searchInBookmarkedPosts: (searchText: string, isRefresh?: boolean) => Promise<void>;
  clearError: () => void;
};

const initialState: State = {
  userPosts: [],
  bookmarkedPost: [],
  postComments: [],
  post: null,
  isLoading: false,
  error: null,
  currentPage: 1,
  hasMore: true,
  postReplies: [],
  otherUserPosts: [],
};

export const getErrorMessage = (error: any, fallback: string = "Something went wrong"): string => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.errors?.errorCode ||
    error?.data?.message ||
    error?.message ||
    fallback
  );
};
// API base URL now handled by the shared api client + endpoints

export const usePostStore = create<State & Actions>()((set, get) => ({
  ...initialState,

  // Actions
  createPost: async (requestBody) => {
    set({ isLoading: true, error: null });
    let imageUrl = null;
    try {
      if (requestBody.image) {
        const url = await useUploadStore.getState().uploadImage(requestBody.image);
        imageUrl = url;
      }
      const response = await createPost({
        ...requestBody,
        ...(imageUrl && { image: imageUrl }),
      });
      await get().fetchUserPosts();
      set({ isLoading: false });
      return response.message;
    } catch (error) {
      const message = getErrorMessage(error, "Create Post failed");
      set({
        isLoading: false,
        error: message,
      });

      throw new Error(message);
    }
  },
  // Inside usePostStore
  fetchUserPosts: async (filter = "new", isRefresh = true) => {
    const { currentPage, hasMore, isLoading } = get();

    if (isLoading || (!isRefresh && !hasMore)) return;

    set({ isLoading: true });

    try {
      const pageToFetch = isRefresh ? 1 : currentPage + 1;
      const response = await getUserPosts(filter, pageToFetch);
      const newPosts = response?.data ?? [];

      set((state) => {
        const combined = isRefresh ? newPosts : [...state.userPosts, ...newPosts];
        const uniqueMap = new Map();
        combined.forEach((post) => uniqueMap.set(post.id, post));
        const finalPosts = Array.from(uniqueMap.values());

        return {
          userPosts: finalPosts,
          currentPage: pageToFetch,
          hasMore: finalPosts.length < (response?.meta?.total ?? 0),
          isLoading: false,
        };
      });
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      set({ isLoading: false, error: errorMessage });
      throw Error(errorMessage);
    }
  },
  fetchBookmarkedPosts: async (isRefresh = true) => {
    const { currentPage, hasMore, isLoading } = get();

    if (isLoading || (!isRefresh && !hasMore)) return;

    set({ isLoading: true });

    try {
      const pageToFetch = isRefresh ? 1 : currentPage + 1;
      // Ensure getBookmarkedPost accepts pageToFetch!
      const response = await getBookmarkedPost(pageToFetch, 10);
      const newPosts = response?.data ?? [];

      set((state) => {
        const combined = isRefresh ? newPosts : [...state.bookmarkedPost, ...newPosts];
        // Ensure no duplicates using Map (Exact same as your community screen)
        const uniqueMap = new Map();
        combined.forEach((post) => uniqueMap.set(post.id, post));
        const finalPosts = Array.from(uniqueMap.values());

        return {
          bookmarkedPost: finalPosts,
          currentPage: pageToFetch,
          hasMore: finalPosts.length < (response?.meta?.total ?? 0),
          isLoading: false,
        };
      });
    } catch (error) {
      const errorMessage = getErrorMessage(error, "Fetch Bookmarked Post failed");
      set({ isLoading: false, error: errorMessage });
      throw Error(errorMessage);
    }
  },

  fetchPostById: async (postId) => {
    set({ isLoading: true, error: null });
    try {
      const result = await getPostById(postId);
      set({ isLoading: false, post: result.data });
    } catch (error) {
      const message = getErrorMessage(error, "Fetch Post By ID failed");

      set({
        isLoading: false,
        error: message,
      });

      throw new Error(message);
    }
  },

  deletePost: async (postId) => {
    set({ isLoading: true, error: null });
    try {
      await deletePost(postId);
      await get().fetchUserPosts();
      set({ isLoading: false });
    } catch (error) {
      const message = getErrorMessage(error, "Delete Post failed");

      set({
        isLoading: false,
        error: message,
      });

      throw new Error(message);
    }
  },

  updatePost: async (scheduleId, request) => {
    set({ isLoading: true, error: null });
    try {
      await updatePost(scheduleId, request);
      await get().fetchUserPosts();
      set({ isLoading: false });
    } catch (error) {
      const message = getErrorMessage(error, "Update Post failed");

      set({
        isLoading: false,
        error: message,
      });

      throw new Error(message);
    }
  },
  likePost: async (postId) => {
    set({ isLoading: true, error: null });

    try {
      await likePostById(postId);
      set((state) => ({
        userPosts: state.userPosts.map((p) =>
          p.id === postId ? { ...p, isLiked: true, likesCount: (p.likesCount || 0) + 1 } : p,
        ),
      }));

      set({ isLoading: false });
    } catch (error) {
      set((state) => ({
        userPosts: state.userPosts.map((p) =>
          p.id === postId
            ? { ...p, isLiked: false, likesCount: Math.max(0, p.likesCount || 1) }
            : p,
        ),
      }));
      set({ isLoading: false });

      const message = getErrorMessage(error, "Like Post failed");
      throw new Error(message);
    }
  },
  unLikePost: async (postId) => {
    set({ isLoading: true, error: null });
    try {
      await unlikePostById(postId);
      set((state) => ({
        userPosts: state.userPosts.map((p) =>
          p.id === postId
            ? { ...p, isLiked: false, likesCount: Math.max(0, (p.likesCount || 1) - 1) }
            : p,
        ),
      }));
      set({ isLoading: false });
    } catch (error) {
      const message = getErrorMessage(error, "Unlike Post failed");
      set((state) => ({
        userPosts: state.userPosts.map((p) =>
          p.id === postId ? { ...p, isLiked: true, likesCount: Math.max(0, p.likesCount || 1) } : p,
        ),
      }));
      set({
        isLoading: false,
        error: message,
      });

      throw new Error(message);
    }
  },

  bookmarkPost: async (postId) => {
    set({ isLoading: true, error: null });
    try {
      await bookmarkById(postId);
      set((state) => ({
        userPosts: state.userPosts.map((p) => (p.id === postId ? { ...p, isBookmarked: true } : p)),
      }));
      set({ isLoading: false });
    } catch (error) {
      const message = getErrorMessage(error, "Bookmark Post failed");
      set((state) => ({
        userPosts: state.userPosts.map((p) =>
          p.id === postId ? { ...p, isBookmarked: false } : p,
        ),
      }));
      set({
        isLoading: false,
        error: message,
      });
      throw new Error(message);
    }
  },
  unBookmarkPost: async (postId) => {
    set({ isLoading: true, error: null });
    try {
      await unBookmarkById(postId);
      set((state) => ({
        userPosts: state.userPosts.map((p) =>
          p.id === postId ? { ...p, isBookmarked: false } : p,
        ),
      }));
      set({ isLoading: false });
    } catch (error) {
      const message = getErrorMessage(error, "Unbookmark Post failed");

      set((state) => ({
        userPosts: state.userPosts.map((p) => (p.id === postId ? { ...p, isBookmarked: true } : p)),
      }));
      set({
        isLoading: false,
        error: message,
      });

      throw new Error(message);
    }
  },

  fetchPostComments: async (postId) => {
    set({ isLoading: true, error: null });
    try {
      const result = await getComments(postId);
      set({ isLoading: false, postComments: result.data });
    } catch (error) {
      const message = getErrorMessage(error, "Fetch Post Comments failed");
      set({
        isLoading: false,
        error: message,
      });

      throw new Error(message);
    }
  },
  addCommentToPost: async (postId, content) => {
    set({ isLoading: true, error: null });
    try {
      await addComment(postId, content);
      await get().fetchPostComments(postId);
      await get().fetchUserPosts();
      set({ isLoading: false });
    } catch (error) {
      const message = getErrorMessage(error, "Add Comment to Post failed");
      set({
        isLoading: false,
        error: message,
      });

      throw new Error(message);
    }
  },
  removeCommentFromPost: async (postId, commentId) => {
    set({ isLoading: true, error: null });
    try {
      await deleteComment(commentId);
      await get().fetchPostComments(postId);
      await get().fetchUserPosts();
      set({ isLoading: false });
    } catch (error) {
      const message = getErrorMessage(error, "Remove Comment from Post failed");
      set({
        isLoading: false,
        error: message,
      });

      throw new Error(message);
    }
  },

  voteOnPollPost: async (postId, optionId) => {
    set({ isLoading: true, error: null });
    try {
      await voteOnPoll(postId, optionId);
      await get().fetchUserPosts();
      set({ isLoading: false });
    } catch (error) {
      const message = getErrorMessage(error, "Vote on Post failed");
      set({
        isLoading: false,
        error: message,
      });
      throw new Error(message);
    }
  },
  replyToCommmentWithId: async (postId, request) => {
    set({ isLoading: true, error: null });
    try {
      await replyToComment(postId, request);
      await get().fetchPostComments(postId);
      set({ isLoading: false });
    } catch (error) {
      const message = getErrorMessage(error, "Reply on Post failed");
      set({
        isLoading: false,
        error: message,
      });
      throw new Error(message);
    }
  },
  fetchCommentReplies: async (commentId) => {
    set({ isLoading: true, error: null, postReplies: [] });
    try {
      const response = await getCommentReplies(commentId);
      set({ postReplies: response.data.replies });
    } catch (error) {
      const message = getErrorMessage(error, "Fetch Commnet Reples failed");
      set({
        error: message,
      });
    } finally {
      set({ isLoading: false });
    }
  },
  searchUserPosts: async (
    searchText: string,
    filter: CommunityFilter = "new",
    isRefresh = true,
  ) => {
    const { userPosts, currentPage } = get();
    const pageToFetch = isRefresh ? 1 : currentPage + 1;
    set({ isLoading: true, error: null });

    try {
      const response = await searchPosts(searchText, filter, pageToFetch);

      const newPosts = response?.data ?? [];
      const totalFromApi = response?.meta?.total ?? 0;

      const updatedPosts = isRefresh ? newPosts : [...userPosts, ...newPosts];

      set({
        userPosts: updatedPosts,
        currentPage: pageToFetch,
        hasMore: updatedPosts.length < totalFromApi,
        isLoading: false,
      });
    } catch (error) {
      const message = getErrorMessage(error, "Search User Posts failed");
      set({ isLoading: false, error: message });
      throw Error(message);
    }
  },

  submitPostReport: async (postId, request) => {
    set({ isLoading: true, error: null });
    try {
      const response = await reportPost(postId, request);
      set({ isLoading: false });
      return response.message;
    } catch (error) {
      const message = getErrorMessage(error);
      set({ isLoading: false, error: message });
      throw Error(message);
    }
  },
  fetchPostsByUserId: async (userId, isRefresh = true) => {
    const { currentPage, hasMore, isLoading } = get();

    if (isLoading || (!isRefresh && !hasMore)) return;

    set({ isLoading: true, otherUserPosts: [] });

    try {
      const pageToFetch = isRefresh ? 1 : currentPage + 1;
      const response = await getPostsByUserId(userId, pageToFetch);
      const newPosts = response?.data ?? [];

      set((state) => {
        const combined = isRefresh ? newPosts : [...state.otherUserPosts, ...newPosts];
        const uniqueMap = new Map();
        combined.forEach((post) => uniqueMap.set(post.id, post));
        const finalPosts = Array.from(uniqueMap.values());

        return {
          otherUserPosts: finalPosts,
          currentPage: pageToFetch,
          hasMore: finalPosts.length < (response?.meta?.total ?? 0),
          isLoading: false,
        };
      });
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      set({ isLoading: false, error: errorMessage });
      throw Error(errorMessage);
    }
  },
  searchInBookmarkedPosts: async (searchText: string, isRefresh = true) => {
    const { bookmarkedPost, currentPage } = get();
    const pageToFetch = isRefresh ? 1 : currentPage + 1;
    set({ isLoading: true, error: null });

    try {
      const response = await searchBookmarkedPosts(searchText, pageToFetch);

      const newPosts = response?.data ?? [];
      const totalFromApi = response?.meta?.total ?? 0;

      const updatedPosts = isRefresh ? newPosts : [...bookmarkedPost, ...newPosts];

      set({
        bookmarkedPost: updatedPosts,
        currentPage: pageToFetch,
        hasMore: updatedPosts.length < totalFromApi,
        isLoading: false,
      });
    } catch (error) {
      const message = getErrorMessage(error, "Search User Posts failed");
      set({ isLoading: false, error: message });
      throw Error(message);
    }
  },
  clearError: () => set({ error: null }),

  reset: () => set(initialState),
}));
