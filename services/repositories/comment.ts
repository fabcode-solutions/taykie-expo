import { apiClient } from "@/services/api/client";
import type { Comment, CommentFormData } from "@/types/comment.types";

/**
 * Pagination parameters for comments
 */
interface PaginationParams {
  page: number;
  limit: number;
}

/**
 * Paginated response structure
 */
interface PaginatedCommentsResponse {
  comments: Comment[];
  hasMore: boolean;
  total: number;
  page: number;
  limit: number;
}

/**
 * Paginated replies response with parent comment
 */
interface PaginatedRepliesResponse {
  parentComment: Comment;
  replies: Comment[];
  hasMore: boolean;
  total: number;
  page: number;
  limit: number;
}

/**
 * Comment Repository
 * Handles all API calls related to comments
 */
export const commentRepository = {
  /**
   * Get comments for a post (basic - no pagination)
   */
  async getCommentsByPostId(postId: string): Promise<Comment[]> {
    const response = await apiClient.get<{ comments: Comment[] }>(
      `/posts/${encodeURIComponent(postId)}/comments`,
    );
    return response.comments;
  },

  /**
   * Get comments for a post with pagination (for infinite scroll)
   * @param postId - The post ID
   * @param params - Pagination parameters
   * @returns Paginated comments response
   */
  async getCommentsByPostIdPaginated(
    postId: string,
    params: PaginationParams,
  ): Promise<PaginatedCommentsResponse> {
    const response = await apiClient.get<PaginatedCommentsResponse>(
      `/posts/${encodeURIComponent(postId)}/comments/paginated`,
      {
        params: {
          page: params.page,
          limit: params.limit,
        },
      },
    );
    return response;
  },

  /**
   * Get a single comment by ID
   */
  async getCommentById(commentId: string): Promise<Comment> {
    const response = await apiClient.get<{ comment: Comment }>(
      `/comments/${encodeURIComponent(commentId)}`,
    );
    return response.comment;
  },

  /**
   * Get replies for a comment (basic - no pagination)
   */
  async getCommentReplies(commentId: string): Promise<Comment[]> {
    const response = await apiClient.get<{ replies: Comment[] }>(
      `/comments/${encodeURIComponent(commentId)}/replies`,
    );
    return response.replies;
  },

  /**
   * Get replies for a comment with pagination (for infinite scroll)
   * @param commentId - The parent comment ID
   * @param params - Pagination parameters
   * @returns Paginated replies response with parent comment
   */
  async getCommentRepliesPaginated(
    commentId: string,
    params: PaginationParams,
  ): Promise<PaginatedRepliesResponse> {
    const response = await apiClient.get<PaginatedRepliesResponse>(
      `/comments/${encodeURIComponent(commentId)}/replies/paginated`,
      {
        params: {
          page: params.page,
          limit: params.limit,
        },
      },
    );
    return response;
  },

  /**
   * Create a new comment on a post
   */
  async createComment(postId: string, data: CommentFormData): Promise<Comment> {
    const response = await apiClient.post<{ comment: Comment }>(
      `/posts/${encodeURIComponent(postId)}/comments`,
      data,
    );
    return response.comment;
  },

  /**
   * Reply to a comment
   */
  async replyToComment(
    postId: string,
    parentCommentId: string,
    data: CommentFormData,
  ): Promise<Comment> {
    const response = await apiClient.post<{ comment: Comment }>(
      `/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(parentCommentId)}/replies`,
      data,
    );
    return response.comment;
  },

  /**
   * Update a comment
   */
  async updateComment(commentId: string, content: string): Promise<Comment> {
    const response = await apiClient.patch<{ comment: Comment }>(
      `/comments/${encodeURIComponent(commentId)}`,
      { content },
    );
    return response.comment;
  },

  /**
   * Delete a comment
   */
  async deleteComment(commentId: string): Promise<void> {
    await apiClient.delete(`/comments/${encodeURIComponent(commentId)}`);
  },

  /**
   * Toggle like on a comment
   */
  async toggleCommentLike(commentId: string): Promise<Comment> {
    const response = await apiClient.post<{ comment: Comment }>(
      `/comments/${encodeURIComponent(commentId)}/like`,
    );
    return response.comment;
  },
};
