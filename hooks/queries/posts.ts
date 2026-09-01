import { ReportRequest } from "@/services/api/auth";
import { apiClient } from "@/services/api/client";
import { endpoints } from "@/services/api/endpoints";
import { ApiResponse } from "@/types/api.types";
import { Comment, CommunityFilter, CommunityPost, CreatePostRequest } from "@/types/posts.types";

type PostResponse = ApiResponse<CommunityPost[]>;

export async function createPost(requestBody: CreatePostRequest): Promise<any> {
  return apiClient.post(endpoints.post.posts, requestBody);
}

export async function getUserPosts(
  filter: CommunityFilter,
  page: number = 1,
  limit: number = 10,
): Promise<PostResponse> {
  return apiClient.get(`${endpoints.post.posts}?feed=${filter}&page=${page}&limit=${limit}`);
}

export async function getPostById(postId: string): Promise<any> {
  return apiClient.get(`${endpoints.post.posts}/${postId}`);
}

export async function updatePost(postId: string, updateRequest: CreatePostRequest): Promise<any> {
  return apiClient.put(`${endpoints.post.posts}/${postId}`, updateRequest);
}

export async function deletePost(postId: string): Promise<any> {
  return apiClient.delete(`${endpoints.post.posts}/${postId}`);
}

export async function likePostById(postId: string): Promise<any> {
  return apiClient.post(`${endpoints.post.posts}/${postId}/like`);
}
export async function unlikePostById(postId: string): Promise<any> {
  return apiClient.delete(`${endpoints.post.posts}/${postId}/like`);
}

export async function bookmarkById(postId: string): Promise<any> {
  return apiClient.post(`${endpoints.post.posts}/${postId}/bookmark`);
}
export async function unBookmarkById(postId: string): Promise<any> {
  return apiClient.delete(`${endpoints.post.posts}/${postId}/bookmark`);
}

export async function getBookmarkedPost(page: number = 1, limit: number = 10): Promise<any> {
  return apiClient.get(`${endpoints.post.bookmark}?page=${page}&limit=${limit}`);
}

export async function getComments(
  postId: string,
  page: number = 1,
  limit: number = 20,
): Promise<any> {
  return apiClient.get(`${endpoints.post.posts}/${postId}/comments?page=${page}&limit=${limit}`);
}

export async function addComment(postId: string, content: string): Promise<any> {
  return apiClient.post(`${endpoints.post.posts}/${postId}/comments`, { content });
}

export async function deleteComment(commentId: string): Promise<any> {
  return apiClient.delete(`${endpoints.post.comments}/${commentId}`);
}

export async function getCommentReplies(parentCommentId: string): Promise<any> {
  return apiClient.get(`${endpoints.post.posts}/comments/${parentCommentId}/replies`);
}

export async function replyToComment(postId: string, request: Comment): Promise<any> {
  return apiClient.post(`${endpoints.post.posts}/${postId}/comments`, request);
}

export async function voteOnPoll(postId: string, pollOptionId: string): Promise<any> {
  return apiClient.post(`${endpoints.post.posts}/${postId}/vote`, { pollOptionId });
}

export async function searchPosts(
  searchText: string,
  feed: string,
  page: number = 1,
  limit: number = 10,
): Promise<any> {
  return apiClient.get(
    `${endpoints.post.posts}?feed=${feed}&search=${searchText}&page=${page}&limit=${limit}`,
  );
}

export async function reportPost(postId: string, request: ReportRequest): Promise<any> {
  return apiClient.post(`${endpoints.post.posts}/${postId}/report`, request);
}

export async function getPostsByUserId(
  userId: string,
  page: number = 1,
  limit: number = 10,
): Promise<any> {
  return apiClient.get(`/users/${userId}/posts?&page=${page}&limit=${limit}`);
}

export async function searchBookmarkedPosts(
  searchText: string,
  page: number = 1,
  limit: number = 10,
): Promise<any> {
  return apiClient.get(
    `${endpoints.post.bookmark}/search?search=${searchText}&page=${page}&limit=${limit}`,
  );
}
