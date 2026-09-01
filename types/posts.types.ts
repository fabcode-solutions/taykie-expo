import { GroupResponse } from "./groups.types";
export type CommunityFilter = "popular" | "new" | "following";

export interface CreatePostRequest {
  type?: PostType;
  groupId?: string | null;
  text?: string;
  image?: string;
  pollOptions?: { label: string }[]; // For poll posts
}

export interface VoteData {
  id: string;
  postId: string;
  userId: string;
  postPollId: string;
  createdAt: string;
  updatedAt: string;
}
export interface PollOption {
  id: string;
  postId: string;
  userId: string;
  label: string;
  value: number;
  votes: VoteData[];
  createdAt: string;
  updatedAt: string;
}

export enum PostType {
  TEXT = "Text Post",
  IMAGE = "Image Post",
  POLL = "Poll / Question",
  RESULTS = "pollResults",
  ACTIVE = "pollActive",
}

export interface PostUser {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}

export interface Comment {
  id?: string;
  parentCommentId?: string | null;
  content?: string;
  postId?: string;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
  user?: PostUser;
  replies?: any[];
  repliesCount?: number;
}

export interface CommentResponse extends Comment {
  replies?: any[];
  likesCount?: number;
  isLiked?: boolean;
}

export interface PostReply {
  id: string;
  parentCommentId: string;
  content: string;
  postId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  user: PostUser;
}

export interface LikeData {
  id: string;
  userId: string;
}

export interface CommunityPost {
  id: string;
  userId: string;
  groupId?: string | null;
  image: string | null;
  text: string | null;
  type: PostType;
  hashtags?: string[] | null;
  createdAt?: string;
  updatedAt?: string;
  user: PostUser;
  group?: GroupResponse | null;
  likes?: LikeData[];
  comments?: Comment[];
  polls?: PollOption[];
  likesCount: number;
  commentsCount: number;
  isLiked?: boolean;
  isBookmarked?: boolean;
}
