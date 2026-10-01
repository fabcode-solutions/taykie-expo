import { useCallback } from "react";
import { t } from "i18next";
import { usePostStore, getErrorMessage } from "@/stores/postStore";
import { useAuthStore } from "@/stores/authStore";
import { useNotificationStore } from "@/stores/notificationStore";
import { NotificationRequest } from "@/services/api/notification";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import { AlertPresets } from "@/utils/alert";
import { useAlert } from "@/provider/AlertProvider";

/**
 * Like / unlike handler for PostCard's `onApiLike`, for screens that show posts
 * outside the feed (bookmarks, other users' profiles). The store applies the change
 * to every list the post appears in, so the heart stays in sync across screens.
 */
export function usePostLike() {
  const alert = useAlert();
  const user = useAuthStore((s) => s.user);
  const likePost = usePostStore((s) => s.likePost);
  const unLikePost = usePostStore((s) => s.unLikePost);
  const sendNotification = useNotificationStore((s) => s.sendNotification);

  return useCallback(
    async (postId: string, isLiked: boolean, authorId?: string) => {
      try {
        if (isLiked) {
          await unLikePost(postId);
          return;
        }
        await likePost(postId);
        // Liking your own post doesn't notify anyone.
        if (authorId && user?.id && authorId !== user.id) {
          const request: NotificationRequest = {
            fromUserId: user.id,
            toUserId: authorId,
            type: "Like",
            heading: t(LocalizedStrings.community.post.new_like),
            context: t(LocalizedStrings.community.post.user_liked_post, { user: user.firstName }),
          };
          await sendNotification(request);
        }
      } catch (error) {
        alert.show(AlertPresets.error(t(LocalizedStrings.common.error), getErrorMessage(error)));
      }
    },
    [likePost, unLikePost, sendNotification, user?.id, user?.firstName, alert],
  );
}
