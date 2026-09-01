/**
 * Comment Types
 * Type definitions for comment-related data structures
 */

export interface Comment {
  id: string;
  postId?: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  likes?: number;
  isLiked?: boolean;
  parentCommentId?: string;
  repliesCount?: number; // Number of replies to this comment
  replies?: Comment[]; // Nested replies (optional, for displaying inline)
}

export interface CommentFormData {
  content: string;
}

export interface CommentItemProps {
  comment: Comment;
  onReply: (commentId: string) => void;
  onLike?: (commentId: string) => void;
  onDelete?: (commentId: string) => void;
  onViewReplies?: (commentId: string, repliesCount: number) => void;
  isNested?: boolean;
  showRepliesButton?: boolean;
}

export interface CommentListProps {
  postId: string;
  onReply: (commentId: string) => void;
  onLike?: (commentId: string) => void;
  onDelete?: (commentId: string) => void;
  onViewReplies?: (commentId: string, repliesCount: number) => void;
}

export interface CommentInputProps {
  postId: string;
  parentCommentId?: string;
  placeholder?: string;
  onCommentCreated?: () => void;
  autoFocus?: boolean;
  userAvatar?: string;
}

/**
 * API Response types
 */
export interface CommentsResponse {
  comments: Comment[];
}

export interface PaginatedCommentsResponse {
  comments: Comment[];
  hasMore: boolean;
  total: number;
  page: number;
  limit: number;
}

export interface PaginatedRepliesResponse {
  parentComment: Comment;
  replies: Comment[];
  hasMore: boolean;
  total: number;
  page: number;
  limit: number;
}

export interface CommentResponse {
  comment: Comment;
}

export interface RepliesResponse {
  replies: Comment[];
}
