import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import type { Comment, CommentFormData } from "@/types/comment.types";
import { commentRepository } from "@/services/repositories/comment";

// Query keys for caching
export const commentKeys = {
  all: ["comments"] as const,
  lists: () => [...commentKeys.all, "list"] as const,
  list: (postId: string) => [...commentKeys.lists(), postId] as const,
  details: () => [...commentKeys.all, "detail"] as const,
  detail: (id: string) => [...commentKeys.details(), id] as const,
  replies: (commentId: string) => [...commentKeys.all, "replies", commentId] as const,
  infiniteList: (postId: string) => [...commentKeys.lists(), postId, "infinite"] as const,
  infiniteReplies: (commentId: string) => [...commentKeys.replies(commentId), "infinite"] as const,
};

/**
 * Hook to fetch comments for a post (basic - no pagination)
 */
export const useComments = (postId: string) => {
  return useQuery({
    queryKey: commentKeys.list(postId),
    queryFn: () => commentRepository.getCommentsByPostId(postId),
    enabled: !!postId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to fetch comments with infinite scroll pagination
 *
 * Returns paginated data with fetchNextPage support
 * Initial load: 50 comments
 * Subsequent loads: 20 comments per page
 */
export const useInfiniteComments = (postId: string) => {
  return useInfiniteQuery({
    queryKey: commentKeys.infiniteList(postId),
    queryFn: ({ pageParam = 1 }) =>
      commentRepository.getCommentsByPostIdPaginated(postId, {
        page: pageParam,
        limit: pageParam === 1 ? 50 : 20, // Initial load 50, then 20 per page
      }),
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.hasMore) {
        return pages.length + 1;
      }
      return undefined;
    },
    enabled: !!postId,
    staleTime: 5 * 60 * 1000,
    initialPageParam: 1,
  });
};

/**
 * Hook to fetch replies for a comment with infinite scroll
 *
 * Returns:
 * - parentComment: The original comment being replied to
 * - replies: Paginated list of replies
 */
export const useInfiniteReplies = (commentId: string) => {
  return useInfiniteQuery({
    queryKey: commentKeys.infiniteReplies(commentId),
    queryFn: ({ pageParam = 1 }) =>
      commentRepository.getCommentRepliesPaginated(commentId, {
        page: pageParam,
        limit: 20,
      }),
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.hasMore) {
        return pages.length + 1;
      }
      return undefined;
    },
    enabled: !!commentId,
    staleTime: 5 * 60 * 1000,
    initialPageParam: 1,
  });
};

/**
 * Hook to fetch a single comment
 */
export const useComment = (commentId: string) => {
  return useQuery({
    queryKey: commentKeys.detail(commentId),
    queryFn: () => commentRepository.getCommentById(commentId),
    enabled: !!commentId,
  });
};

/**
 * Hook to fetch replies for a comment (basic - no pagination)
 */
export const useCommentReplies = (commentId: string) => {
  return useQuery({
    queryKey: commentKeys.replies(commentId),
    queryFn: () => commentRepository.getCommentReplies(commentId),
    enabled: !!commentId,
  });
};

/**
 * Hook to create a comment
 */
export const useCreateComment = (postId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CommentFormData) => commentRepository.createComment(postId, data),
    onSuccess: () => {
      // Invalidate both regular and infinite queries
      queryClient.invalidateQueries({ queryKey: commentKeys.list(postId) });
      queryClient.invalidateQueries({ queryKey: commentKeys.infiniteList(postId) });
    },
  });
};

/**
 * Hook to reply to a comment
 */
export const useReplyToComment = (postId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ parentCommentId, data }: { parentCommentId: string; data: CommentFormData }) =>
      commentRepository.replyToComment(postId, parentCommentId, data),
    onSuccess: (_, variables) => {
      // Invalidate comments list, replies, and infinite queries
      queryClient.invalidateQueries({ queryKey: commentKeys.list(postId) });
      queryClient.invalidateQueries({ queryKey: commentKeys.infiniteList(postId) });
      queryClient.invalidateQueries({ queryKey: commentKeys.replies(variables.parentCommentId) });
      queryClient.invalidateQueries({
        queryKey: commentKeys.infiniteReplies(variables.parentCommentId),
      });
    },
  });
};

/**
 * Hook to update a comment
 */
export const useUpdateComment = (postId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ commentId, content }: { commentId: string; content: string }) =>
      commentRepository.updateComment(commentId, content),
    onSuccess: (updatedComment) => {
      // Update the cache with the new comment data
      queryClient.setQueryData(commentKeys.detail(updatedComment.id), updatedComment);
      // Invalidate the comments list and infinite list
      queryClient.invalidateQueries({ queryKey: commentKeys.list(postId) });
      queryClient.invalidateQueries({ queryKey: commentKeys.infiniteList(postId) });
    },
  });
};

/**
 * Hook to delete a comment
 */
export const useDeleteComment = (postId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: string) => commentRepository.deleteComment(commentId),
    onSuccess: () => {
      // Invalidate comments list and infinite list to refetch
      queryClient.invalidateQueries({ queryKey: commentKeys.list(postId) });
      queryClient.invalidateQueries({ queryKey: commentKeys.infiniteList(postId) });
    },
  });
};

/**
 * Hook to toggle comment like
 */
export const useToggleCommentLike = (postId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: string) => commentRepository.toggleCommentLike(commentId),
    onMutate: async (commentId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: commentKeys.list(postId) });
      await queryClient.cancelQueries({ queryKey: commentKeys.infiniteList(postId) });

      // Snapshot the previous value
      const previousComments = queryClient.getQueryData<Comment[]>(commentKeys.list(postId));

      // Optimistically update the cache
      if (previousComments) {
        queryClient.setQueryData<Comment[]>(
          commentKeys.list(postId),
          previousComments.map((comment) =>
            comment.id === commentId ? { ...comment, likes: (comment.likes || 0) + 1 } : comment,
          ),
        );
      }

      return { previousComments };
    },
    onError: (err, commentId, context) => {
      // Rollback on error
      if (context?.previousComments) {
        queryClient.setQueryData(commentKeys.list(postId), context.previousComments);
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: commentKeys.list(postId) });
      queryClient.invalidateQueries({ queryKey: commentKeys.infiniteList(postId) });
    },
  });
};
