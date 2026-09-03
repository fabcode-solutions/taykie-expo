import React, { useCallback } from "react";
import ReusableActionMenu, { ActionMenuItem, ActionMenuPosition } from "./ReusableActionMenu";
import { useTheme } from "@/theme";
import { Share } from "react-native";
import crossPlatformAlert from "@/utils/crossPlatformAlert";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import { scale } from "@/utils/scale";

interface ArticleActionMenuProps {
  item: any;
  position?: ActionMenuPosition;
  visible?: boolean;
  onClose: () => void;
}

/**
 * Article-specific implementation of the ActionMenu
 * This component uses the ReusableActionMenu with pre-configured options for article actions
 */
const ArticleActionMenu: React.FC<ArticleActionMenuProps> = ({
  item,
  position = {},
  visible = false,
  onClose,
}) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();

  // Open tag editor
  const handleEditTags = useCallback(() => {
    onClose();
    setTimeout(() => {
      router.push({
        pathname: "/edit-tags",
        params: { itemId: item.id },
      });
    }, 300);
  }, [onClose, router, item]);

  // Share article
  const shareArticle = useCallback(async () => {
    try {
      // Close action menu first
      onClose();

      // Prepare share content
      setTimeout(async () => {
        const title = item.title ?? "Article";
        const url = item.url;

        await Share.share({
          message: url as string,
          title: title,
          url: url,
        });
      }, 100);
    } catch (error) {
      console.error("Error sharing article:", error);
    }
  }, [item, onClose]);

  // Toggle favorite status
  const toggleFavorite = useCallback(async () => {
    try {
      await item.toggleFavorite();
      onClose();
    } catch (error) {
      console.error("Error toggling favorite:", error);
    }
  }, [item, onClose]);

  // Toggle archived status
  const toggleArchived = useCallback(async () => {
    try {
      await item.toggleArchived();
      onClose();
    } catch (error) {
      console.error("Error toggling archive:", error);
    }
  }, [item, onClose]);

  // Delete article with confirmation
  const confirmDelete = useCallback(() => {
    // Close action menu first
    onClose();

    // Show confirmation alert
    crossPlatformAlert(
      t("menu.deleteConfirmation.title"),
      t("menu.deleteConfirmation.message"),
      [
        {
          text: t("menu.deleteConfirmation.cancel"),
          style: "cancel",
        },
        {
          text: t("menu.deleteConfirmation.confirm"),
          style: "destructive",
          onPress: async () => {
            try {
              // await deleteItem(item);
            } catch (error) {
              console.error("Error deleting item:", error);
            }
          },
        },
      ],
      { cancelable: true },
    );
  }, [item, onClose, t]);

  // Generate menu items based on the item state
  const getMenuItems = useCallback((): ActionMenuItem[] => {
    return [
      {
        id: "share",
        label: t("menu.share"),
        icon: "share",
        onPress: shareArticle,
        dividerAfter: true,
      },
      {
        id: "favorite",
        label: item.favorite ? t("menu.unfavorite") : t("menu.favorite"),
        icon: item.favorite ? "favorite" : "favorite",
        iconColor: item.favorite ? theme.colors.favorite : undefined,
        onPress: toggleFavorite,
        dividerAfter: true,
      },
      {
        id: "tag",
        label: t("menu.editTags"),
        icon: "tag",
        onPress: handleEditTags,
        dividerAfter: true,
      },
      {
        id: "archive",
        label: item.archived ? t("menu.unarchive") : t("menu.archive"),
        icon: "archive",
        onPress: toggleArchived,
        dividerAfter: true,
      },
      {
        id: "delete",
        label: t("menu.delete"),
        icon: "trash",
        destructive: true,
        onPress: confirmDelete,
      },
    ];
  }, [
    item,
    theme.colors.favorite,
    shareArticle,
    toggleFavorite,
    handleEditTags,
    toggleArchived,
    confirmDelete,
    t,
  ]);

  return (
    <ReusableActionMenu
      visible={visible}
      items={getMenuItems()}
      onClose={onClose}
      position={position}
      width={scale(240)}
    />
  );
};

export default ArticleActionMenu;
