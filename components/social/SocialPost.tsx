import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { TouchableOpacity, Text } from "react-native";
import BlurModal from "../ui/Modal";
import { useTheme } from "@/theme";
import AlertModal from "../ui/Alert/AlertModal";
import { moderateScale } from "@/utils/scale";
import { useTranslation } from "react-i18next";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";

const SocialPost = () => {
  const theme = useTheme();
  const { t } = useTranslation();
  const [searchVisible, setSearchVisible] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  return (
    <>
      <BlurModal
        heading={t(LocalizedStrings.schedule.placeHolders.search)}
        visible={searchVisible}
        onRequestClose={() => setSearchVisible(false)}
      >
        <Text>{t(LocalizedStrings.community.post.textPost)}</Text>
      </BlurModal>

      <AlertModal
        visible={showSuccess}
        heading={t(LocalizedStrings.community.post.postCreated)}
        onRequestClose={() => setShowSuccess(false)}
      />
      <TouchableOpacity
        onPress={() => router.push("/(screens)/create-post")}
        activeOpacity={0.85}
        className="absolute w-[60px] h-[60px] rounded-[32px] bg-primary  bottom-28 flex items-center justify-center right-10"
      >
        <Ionicons name="add" size={moderateScale(28)} color={theme.colors.text.primary} />
      </TouchableOpacity>
    </>
  );
};

export default SocialPost;
