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

type PresetKey = keyof typeof Images.cover;

const ChoosePhoto = ({ isVisible, onClose, OnSelectImage, setImage }: ChoosePhotoProps) => {
  // Tapping a photo/preset only stages it locally — nothing is committed to
  // the profile form until "Save Changes" is pressed (see handleSaveChanges).
  // Previously every tap committed AND closed the drawer immediately, which
  // made "Save Changes" dead code: the drawer was always already gone by
  // the time it could be pressed.
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<PresetKey | null>(null);
  const theme = useTheme();

  const resetSelection = useCallback(() => {
    setLocalImageUri(null);
    setSelectedPreset(null);
  }, []);

  const handleClose = useCallback(() => {
    resetSelection();
    onClose();
  }, [onClose, resetSelection]);

  // Staged, not committed — see the note on localImageUri/selectedPreset above.
  const handleSelectPreset = useCallback((key: PresetKey) => {
    setSelectedPreset(key);
    setLocalImageUri(null);
  }, []);

  const pickImageAsync = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.5,
      aspect: [1, 1],
    });

    if (!result.canceled) {
      setLocalImageUri(result.assets[0].uri);
      setSelectedPreset(null);
    } else {
      alert(t(LocalizedStrings.errors.image_not_selected));
    }
  }, []);

  const hasSelection = Boolean(localImageUri || selectedPreset);

  // The actual commit step — was previously just an alias for onClose (a
  // no-op besides closing), since every selection above closed the drawer
  // on its own before this could ever be pressed.
  const handleSaveChanges = useCallback(() => {
    if (localImageUri) {
      setImage(localImageUri);
    } else if (selectedPreset) {
      OnSelectImage({ source: Images.cover[selectedPreset], url: selectedPreset });
    } else {
      return; // Button is disabled in this case; guard just in case.
    }
    resetSelection();
    onClose();
  }, [localImageUri, selectedPreset, setImage, OnSelectImage, onClose, resetSelection]);

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
            borderWidth: localImageUri ? moderateScale(3) : 0,
            borderColor: theme.colors.primary.main,
          }}
          onPress={pickImageAsync}
          accessibilityRole="button"
          accessibilityLabel={t(LocalizedStrings.profile.choose_photo)}
        >
          {localImageUri ? (
            <Image
              source={{ uri: localImageUri }}
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

        {(Object.keys(Images.cover) as PresetKey[]).map((item, index) => {
          const isSelected = selectedPreset === item;
          return (
            <Pressable
              key={`image-${index}`}
              style={{
                width: "20%",
                height: verticalScale(80),
                aspectRatio: 1,
                borderRadius: 999,
                borderWidth: isSelected ? moderateScale(3) : 0,
                borderColor: theme.colors.primary.main,
              }}
              onPress={() => handleSelectPreset(item)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
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
          onPress={handleSaveChanges}
          disabled={!hasSelection}
          title={t(LocalizedStrings.profile.save_changes)}
          textStyle={{ fontSize: moderateScale(20) }}
        ></Button>
      </View>
    </BottomDrawer>
  );
};

export default ChoosePhoto;
