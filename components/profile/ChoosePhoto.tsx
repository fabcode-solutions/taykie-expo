import * as ImagePicker from "expo-image-picker";
import React, { useCallback, useState } from "react";
import { BottomDrawer } from "../BottomDrawer";
import { Button } from "@/components/ui/button";
import { Image, ImageSourcePropType, Pressable, View } from "react-native";
import { Images } from "@/assets";
import IconCamera from "../icons/IconCamera";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import { t } from "i18next";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import { useTheme } from "@/theme";

interface ChoosePhotoProps {
  isVisible: boolean;
  onClose: () => void;
  OnSelectImage: (image: { source: ImageSourcePropType; url: string }) => void;
  setImage: (image: string) => void;
}

const ChoosePhoto = ({ isVisible, onClose, OnSelectImage, setImage }: ChoosePhotoProps) => {
  const [imageUri, setImageUrl] = useState("");
  const theme = useTheme();
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleSelectImage = (key: keyof typeof Images.cover) => {
    OnSelectImage({
      source: Images.cover[key],
      url: key, // 👈 THIS is what goes to form
    });
    handleClose();
  };

  const pickImageAsync = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.5,
      aspect: [1, 1],
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      setImageUrl(result.assets[0].uri);
    } else {
      alert(t(LocalizedStrings.errors.image_not_selected));
    }
  }, [setImage]);

  return (
    <BottomDrawer
      isVisible={isVisible}
      onClose={handleClose}
      title={t(LocalizedStrings.profile.choose_photo)}
      height="50%"
      showHandle
      closeOnSwipeDown
      headingStyle={{ fontSize: moderateScale(24), fontWeight: "500" as const }}
    >
      <View
        style={{
          flexDirection: "row",
          gap: scale(20),
          flexWrap: "wrap",
          justifyContent: "space-between",
          paddingHorizontal: scale(20),
          marginTop: verticalScale(20),
        }}
      >
        <Pressable
          style={{
            width: "20%",
            height: verticalScale(80),
            aspectRatio: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: theme.colors.white,
            borderRadius: moderateScale(80),
          }}
          onPress={pickImageAsync}
        >
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={{
                width: "100%",
                height: verticalScale(80),
                aspectRatio: 1,
                borderRadius: 999,
              }}
            />
          ) : (
            <IconCamera />
          )}
        </Pressable>

        {(Object.keys(Images.cover) as (keyof typeof Images.cover)[]).map((item, index) => {
          return (
            <Pressable
              key={`image-${index}`}
              style={{ width: "20%", height: verticalScale(80), aspectRatio: 1 }}
              onPress={() => handleSelectImage(item)}
            >
              <Image
                source={Images.cover[item]}
                style={{
                  width: "100%",
                  height: verticalScale(80),
                  aspectRatio: 1,
                  borderRadius: 999,
                }}
              />
            </Pressable>
          );
        })}
      </View>

      <View style={{ padding: verticalScale(20), width: "100%", marginTop: verticalScale(30) }}>
        <Button
          onPress={handleClose}
          title={t(LocalizedStrings.profile.save_changes)}
          textStyle={{ fontSize: moderateScale(20) }}
        ></Button>
      </View>
    </BottomDrawer>
  );
};

export default ChoosePhoto;
