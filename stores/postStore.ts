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
import { t } from "i18next";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";

type State = {
  userPosts: CommunityPost[];
  post: CommunityPost | null;
  postComments: CommentResponse[];
  bookmarkedPost: CommunityPost[];
  // Feed-level loads only (fetchUserPosts/searchUserPosts) — community.tsx
  // shows a full-screen loader on this, so per-post actions (like, bookmark,
  // comments, poll vote) must never touch it; see isLoadingComments below.
  isLoading: boolean;
  // Comments-drawer loads only (fetchPostComments/replyToCommmentWithId/
  // fetchCommentReplies) — was sharing `isLoading` with the feed, so opening
  // a comment thread (or the drawer fetching replies) blanked the entire
  // Community screen behind it with a full-screen backdrop, and liking a
  // post while the drawer was open showed a spinner in the drawer too.
  isLoadingComments: boolean;
  error: string | null;
  currentPage: number;
  hasMore: boolean;
  postReplies: CommentResponse[];
  otherUserPosts: CommunityPost[];
};

type Actions = {
  createPost: (requestBody: CreatePostRequest) => Promise<string>;
  fetchUserPosts: (
    filter?: CommunityFilter,
    isRefresh?: boolean,
    silent?: boolean,
  ) => Promise<void>;
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
  // Patches the embedded user.avatarUrl snapshot on every already-loaded
  // post/comment/reply authored by `userId` in local state. Called right
  // after the current user updates their profile picture, so their own
  // posts/comments reflect the new avatar immediately instead of only after
  // the next full feed refetch (posts/comments carry a snapshot of the
  // author at fetch time, not a live reference).
  patchUserAvatarInFeed: (userId: string, avatarUrl: string) => void;
  clearError: () => void;
};

const initialState: State = {
  userPosts: [],
  bookmarkedPost: [],
  postComments: [],
  post: null,
  isLoading: false,
  isLoadingComments: false,
  error: null,
  currentPage: 1,
  hasMore: true,
  postReplies: [],
  otherUserPosts: [],
};

export const getErrorMessage = (
  error: any,
  fallback: string = t(LocalizedStrings.errors.unknown),
): string => {
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
      const message = getErrorMessage(error, t(LocalizedStrings.errors.api.createPost));
      set({
        isLoading: false,
        error: message,
      });

      throw new Error(message);
    }
  },
  // Inside usePostStore
  // `silent` skips the isLoading flips — used by voteOnPollPost's
  // after-the-fact refresh so it doesn't blank the whole feed (community.tsx
  // shows a full-screen loader on isLoading) for what the user experiences
  // as a single tap, not a fresh page load. Note the early-return below still
  // applies: a silent call made while a real (non-silent) load is already in
  // flight is a no-op, same as any other overlapping call.
  fetchUserPosts: async (filter = "new", isRefresh = true, silent = false) => {
    const { currentPage, hasMore, isLoading } = get();

    if (isLoading || (!isRefresh && !hasMore)) return;

    set({ error: null });
    if (!silent) set({ isLoading: true });

    try {
      const pageToFetch = isRefresh ? 1 : currentPage + 1;
      const response = await getUserPosts(filter, pageToFetch);
      const newPosts = (response?.data ?? []).filter((post: CommunityPost) => post?.id);

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
      const newPosts = (response?.data ?? []).filter((post: CommunityPost) => post?.id);

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
      const errorMessage = getErrorMessage(
        error,
        t(LocalizedStrings.errors.api.fetchBookmarkedPosts),
      );
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
      const message = getErrorMessage(error, t(LocalizedStrings.errors.api.fetchPost));

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
      const message = getErrorMessage(error, t(LocalizedStrings.errors.api.deletePost));

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
      const message = getErrorMessage(error, t(LocalizedStrings.errors.api.updatePost));

      set({
        isLoading: false,
        error: message,
      });

      throw new Error(message);
    }
  },
  // Optimistic: flips the tapped post's state immediately (no isLoading —
  // this used to share the feed's full-screen loading flag, so every single
  // like tap blanked the whole Community screen behind a backdrop for the
  // length of the network round trip). Rolls back to the pre-tap state on
  // failure instead of waiting for the response to update anything.
  likePost: async (postId) => {
    set({ error: null });
    set((state) => ({
      userPosts: state.userPosts.map((p) =>
        p.id === postId ? { ...p, isLiked: true, likesCount: (p.likesCount || 0) + 1 } : p,
      ),
    }));

    try {
      await likePostById(postId);
    } catch (error) {
      set((state) => ({
        userPosts: state.userPosts.map((p) =>
          p.id === postId
            ? { ...p, isLiked: false, likesCount: Math.max(0, (p.likesCount || 1) - 1) }
            : p,
        ),
      }));

      const message = getErrorMessage(error, t(LocalizedStrings.errors.api.likePost));
      set({ error: message });
      throw new Error(message);
    }
  },
  unLikePost: async (postId) => {
    set({ error: null });
    set((state) => ({
      userPosts: state.userPosts.map((p) =>
        p.id === postId
          ? { ...p, isLiked: false, likesCount: Math.max(0, (p.likesCount || 1) - 1) }
          : p,
      ),
    }));

    try {
      await unlikePostById(postId);
    } catch (error) {
      set((state) => ({
        userPosts: state.userPosts.map((p) =>
          p.id === postId ? { ...p, isLiked: true, likesCount: (p.likesCount || 0) + 1 } : p,
        ),
      }));

      const message = getErrorMessage(error, t(LocalizedStrings.errors.api.unlikePost));
      set({ error: message });
      throw new Error(message);
    }
  },

  bookmarkPost: async (postId) => {
    set({ error: null });
    set((state) => ({
      userPosts: state.userPosts.map((p) => (p.id === postId ? { ...p, isBookmarked: true } : p)),
    }));

    try {
      await bookmarkById(postId);
    } catch (error) {
      set((state) => ({
        userPosts: state.userPosts.map((p) =>
          p.id === postId ? { ...p, isBookmarked: false } : p,
        ),
      }));

      const message = getErrorMessage(error, t(LocalizedStrings.errors.api.bookmarkPost));
      set({ error: message });
      throw new Error(message);
    }
  },
  unBookmarkPost: async (postId) => {
    set({ error: null });
    set((state) => ({
      userPosts: state.userPosts.map((p) => (p.id === postId ? { ...p, isBookmarked: false } : p)),
    }));

    try {
      await unBookmarkById(postId);
    } catch (error) {
      set((state) => ({
        userPosts: state.userPosts.map((p) => (p.id === postId ? { ...p, isBookmarked: true } : p)),
      }));

      const message = getErrorMessage(error, t(LocalizedStrings.errors.api.unbookmarkPost));
      set({ error: message });
      throw new Error(message);
    }
  },

  // Uses isLoadingComments, not the feed's isLoading — see its declaration.
  fetchPostComments: async (postId) => {
    set({ isLoadingComments: true, error: null });
    try {
      const result = await getComments(postId);
      set({ isLoadingComments: false, postComments: result.data });
    } catch (error) {
      const message = getErrorMessage(error, t(LocalizedStrings.errors.api.fetchPostComments));
      set({
        isLoadingComments: false,
        error: message,
      });

      throw new Error(message);
    }
  },
  addCommentToPost: async (postId, content) => {
    set({ isLoadingComments: true, error: null });
    try {
      await addComment(postId, content);
      await get().fetchPostComments(postId);
      await get().fetchUserPosts(undefined, true, true);
      set({ isLoadingComments: false });
    } catch (error) {
      const message = getErrorMessage(error, t(LocalizedStrings.errors.api.addComment));
      set({
        isLoadingComments: false,
        error: message,
      });

      throw new Error(message);
    }
  },
  removeCommentFromPost: async (postId, commentId) => {
    set({ isLoadingComments: true, error: null });
    try {
      await deleteComment(commentId);
      await get().fetchPostComments(postId);
      await get().fetchUserPosts(undefined, true, true);
      set({ isLoadingComments: false });
    } catch (error) {
      const message = getErrorMessage(error, t(LocalizedStrings.errors.api.removeComment));
      set({
        isLoadingComments: false,
        error: message,
      });

      throw new Error(message);
    }
  },

  // No loading flag: the feed refetch below already gives visible feedback
  // (the post's option counts update), and gating this on the shared
  // isLoading used to blank the whole feed for every vote.
  voteOnPollPost: async (postId, optionId) => {
    set({ error: null });
    try {
      await voteOnPoll(postId, optionId);
      await get().fetchUserPosts(undefined, true, true);
    } catch (error) {
      const message = getErrorMessage(error, t(LocalizedStrings.errors.api.votePost));
      set({ error: message });
      throw new Error(message);
    }
  },
  replyToCommmentWithId: async (postId, request) => {
    set({ isLoadingComments: true, error: null });
    try {
      await replyToComment(postId, request);
      await get().fetchPostComments(postId);
      set({ isLoadingComments: false });
    } catch (error) {
      const message = getErrorMessage(error, t(LocalizedStrings.errors.api.replyPost));
      set({
        isLoadingComments: false,
        error: message,
      });
      throw new Error(message);
    }
  },
  fetchCommentReplies: async (commentId) => {
    set({ isLoadingComments: true, error: null, postReplies: [] });
    try {
      const response = await getCommentReplies(commentId);
      set({ postReplies: response.data.replies });
    } catch (error) {
      const message = getErrorMessage(error, t(LocalizedStrings.errors.api.fetchReplies));
      set({
        error: message,
      });
    } finally {
      set({ isLoadingComments: false });
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

      const newPosts = (response?.data ?? []).filter((post: CommunityPost) => post?.id);
      const totalFromApi = response?.meta?.total ?? 0;

      const updatedPosts = isRefresh ? newPosts : [...userPosts, ...newPosts];

      set({
        userPosts: updatedPosts,
        currentPage: pageToFetch,
        hasMore: updatedPosts.length < totalFromApi,
        isLoading: false,
      });
    } catch (error) {
      const message = getErrorMessage(error, t(LocalizedStrings.errors.api.searchPosts));
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

    // Clear only on a refresh (opening a profile / pull-to-refresh), so another user's
    // posts never flash. Clearing on load-more too meant page 2 was appended to an
    // empty list — the already-loaded posts vanished on every scroll to the end.
    set(isRefresh ? { isLoading: true, otherUserPosts: [] } : { isLoading: true });

    try {
      const pageToFetch = isRefresh ? 1 : currentPage + 1;
      const response = await getPostsByUserId(userId, pageToFetch);
      const newPosts = (response?.data ?? []).filter((post: CommunityPost) => post?.id);

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

      const newPosts = (response?.data ?? []).filter((post: CommunityPost) => post?.id);
      const totalFromApi = response?.meta?.total ?? 0;

      const updatedPosts = isRefresh ? newPosts : [...bookmarkedPost, ...newPosts];

      set({
        bookmarkedPost: updatedPosts,
        currentPage: pageToFetch,
        hasMore: updatedPosts.length < totalFromApi,
        isLoading: false,
      });
    } catch (error) {
      const message = getErrorMessage(error, t(LocalizedStrings.errors.api.searchPosts));
      set({ isLoading: false, error: message });
      throw Error(message);
    }
  },
  patchUserAvatarInFeed: (userId, avatarUrl) => {
    const patchPost = (p: CommunityPost) =>
      p.userId === userId ? { ...p, user: { ...p.user, avatarUrl } } : p;
    const patchComment = (c: CommentResponse) =>
      c.userId === userId ? { ...c, user: c.user ? { ...c.user, avatarUrl } : c.user } : c;

    set((state) => ({
      userPosts: state.userPosts.map(patchPost),
      otherUserPosts: state.otherUserPosts.map(patchPost),
      bookmarkedPost: state.bookmarkedPost.map(patchPost),
      post: state.post ? patchPost(state.post) : state.post,
      postComments: state.postComments.map(patchComment),
      postReplies: state.postReplies.map(patchComment),
    }));
  },

  clearError: () => set({ error: null }),

  reset: () => set(initialState),
}));
