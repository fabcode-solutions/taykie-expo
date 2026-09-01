import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { TouchableOpacity, Text } from "react-native";
import BlurModal from "../ui/Modal";
import { useTheme } from "@/theme";
import AlertModal from "../ui/Alert/AlertModal";
import { moderateScale } from "@/utils/scale";

const SocialPost = () => {
  const theme = useTheme();
  const [searchVisible, setSearchVisible] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  return (
    <>
      <BlurModal
        heading="Search"
        visible={searchVisible}
        onRequestClose={() => setSearchVisible(false)}
      >
        <Text>Text</Text>
      </BlurModal>

      <AlertModal
        visible={showSuccess}
        heading="Successfully Created!"
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
