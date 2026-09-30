import React, { useCallback } from "react";
import PostCard from "@/components/social/PostCard";
import { CommunityPost } from "@/types/posts.types";

interface ProfilePostItemProps {
  post: CommunityPost;
  onShare: (postId: string, isBookmarked: boolean) => void;
  onLike: (postId: string, isLiked: boolean, userId: string) => void;
  onComment: (postId: string) => void;
  onAuthorPress: (authorId: string) => void;
  onPollSubmit?: (postId: string, optionId: string) => void;
  onMenuPress?: (postId: string) => void;
}

/**
 * Memoized wrapper so PostCard receives stable per-post callbacks instead of fresh
 * inline closures on every parent render.
 */
const ProfilePostItem = React.memo(function ProfilePostItem({
  post,
  onShare,
  onLike,
  onComment,
  onAuthorPress,
  onPollSubmit,
  onMenuPress,
}: ProfilePostItemProps) {
  const handleLikePress = useCallback(
    (postId: string, isLiked: boolean) => onLike(postId, isLiked, post?.user?.id as string),
    [onLike, post?.user?.id],
  );
  return (
    <PostCard
      post={post}
      onApiShare={onShare}
      onApiLike={handleLikePress}
      onApiComment={onComment}
      onApiPollSubmit={onPollSubmit}
      onMenuPress={onMenuPress}
      onAuthorPress={onAuthorPress}
    />
  );
});

export default ProfilePostItem;
