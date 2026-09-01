import { Button } from "@/components/ui/button";
import Switch from "@/components/ui/Switch";
import * as ImagePicker from "expo-image-picker";
import {
  StyleSheet,
  TouchableOpacity,
  View,
  ScrollView,
  Text,
  KeyboardAvoidingView,
  Image,
  Platform,
  FlatList,
  Alert,
  Pressable,
} from "react-native";
import { ThemeInput, ThemeText } from "@/components";
import { fontFamily, Theme, useTheme } from "@/theme";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import IconBackArrow from "@/components/icons/IconBackArrow";
import { Input } from "@/components/ui/TextInput/input";
import { useForm } from "react-hook-form";
import IconUpload from "@/components/icons/IconUpload";
import IconSearch from "@/components/icons/IconSearch";
import { ActivityIndicator } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useGroupStore } from "@/stores/groupStore";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import { CreateGroupRequest } from "@/types/groups.types";
import { Loader } from "@/components/shared/loader";
import { TagInput } from "@/components/TagInput";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import { t } from "i18next";
import { AlertPresets } from "@/utils/alert";
import { useAlert } from "@/provider/AlertProvider";

interface FormData {
  groupName: string;
  groupType: "Public" | "Private";
  notifyMembers: boolean;
  allowMembers: boolean;
  groupDescription: string;
  tags: string[];
  memberIds: string[];
}

export default function CreateGroupScreen() {
  const theme = useTheme();
  const showAlert = useAlert();
  const router = useRouter();
  const [image, setImage] = React.useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const { createGroup, isLoading, fetchFriends, groupFriends } = useGroupStore();
  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
  }, []);
  const styles = useMemo(() => createStyles(theme), [theme]);
  const handleBack = React.useCallback(() => {
    router.back();
  }, [router]);
  const { control, handleSubmit, setValue, watch } = useForm<FormData>({
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      groupName: "",
      groupDescription: "",
      allowMembers: false,
      notifyMembers: true,
      groupType: "Public",
      tags: [],
      memberIds: [],
    },
  });

  useEffect(() => {
    fetchGroupFriends();
  }, []);

  const formValues = watch();

  const fetchGroupFriends = useCallback(async () => {
    try {
      await fetchFriends();
    } catch (error) {
      showAlert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
    }
  }, []);

  const onSubmit = async (data: FormData) => {
    const request: CreateGroupRequest = {
      groupName: data.groupName,
      groupType: data.groupType,
      notifyMembersWhenAdded: data.notifyMembers,
      allowMembersToPost: data.allowMembers,
      ...(data.tags && { tags: data.tags }),
      ...(data.groupDescription && { groupDescription: data.groupDescription }),
      ...(image && { uploadGroupPhoto: image }),
    };
    try {
      const message = await createGroup(request);

      Alert.alert(t(LocalizedStrings.common.success), message, [
        {
          text: t(LocalizedStrings.common.ok),
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      showAlert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
    }
  };

  const pickImageAsync = React.useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.5,
      aspect: [1, 1],
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    } else {
      alert(t(LocalizedStrings.errors.image_not_selected));
    }
  }, []);

  const handleAddTag = React.useCallback(
    (tag: string) => {
      if (formValues.tags.length < 5) {
        setValue("tags", [...formValues.tags, tag]);
      } else {
        showAlert.show(
          AlertPresets.error(
            t(LocalizedStrings.errors.limitReached),
            t(LocalizedStrings.errors.tag_add_error),
          ),
        );
      }
    },
    [formValues.tags, t],
  );

  const handleRemoveTag = React.useCallback(
    (index: number) => {
      setValue(
        "tags",
        formValues.tags.filter((_, i) => i !== index),
      );
    },
    [formValues.tags],
  );

  const handleFriendClick = useCallback(
    (id: string) => {
      const currentIds = formValues.memberIds || [];
      if (currentIds.includes(id)) {
        setValue(
          "memberIds",
          currentIds.filter((memberId) => memberId !== id),
        );
      } else {
        setValue("memberIds", [...currentIds, id]);
      }
    },
    [formValues.memberIds, setValue],
  );

  const filteredFriends = useMemo(() => {
    if (!searchQuery.trim()) return groupFriends;

    return groupFriends.filter((friend) =>
      `${friend?.firstName} ${friend?.lastName || ""}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase()),
    );
  }, [searchQuery, groupFriends]);

  return (
    <>
      {isLoading && <Loader />}
      <KeyboardAvoidingView
        style={[styles.safeArea, { backgroundColor: theme.colors.background.default }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        <ScrollView
          style={styles.container}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: verticalScale(80) }}
        >
          <View>
            <TouchableOpacity onPress={handleBack} style={styles.backButton} activeOpacity={0.7}>
              <View style={styles.backButtonInner}>
                <IconBackArrow />
              </View>
            </TouchableOpacity>
          </View>
          <View style={styles.headerRow}>
            <ThemeText variant="manrope.h2" style={styles.header}>
              {t(LocalizedStrings.groups.createGroup)}
            </ThemeText>
          </View>
          <View style={styles.section}>
            <Input
              label={t(LocalizedStrings.groups.groupName)}
              control={control}
              name="groupName"
              rules={{
                required: t(LocalizedStrings.groups.nameRequired),
                validate: (value: string) => {
                  if (value.length < 3) {
                    return t(LocalizedStrings.groups.nameTooShort);
                  }
                  if (value.length > 50) {
                    return t(LocalizedStrings.groups.nameTooLong);
                  }
                },
              }}
              placeholder={t(LocalizedStrings.groups.enterGroupName)}
              returnKeyType="go"
            />

            <Input
              label={t(LocalizedStrings.groups.groupDescription)}
              control={control}
              name="groupDescription"
              placeholder={t(LocalizedStrings.groups.addDescription)}
              multiline
            />

            <View style={{ gap: verticalScale(4) }}>
              <Text style={styles.inputLabel}>{t(LocalizedStrings.groups.uploadPhoto)}</Text>
              <TouchableOpacity
                style={[styles.imagePicker, image && styles.imagePickerWithImage]}
                onPress={pickImageAsync}
              >
                {!image ? (
                  <IconUpload />
                ) : (
                  <Image style={styles.imagePreview} source={{ uri: image }} resizeMode="contain" />
                )}
              </TouchableOpacity>
            </View>

            <TagInput
              tags={formValues.tags}
              onAddTag={handleAddTag}
              onRemoveTag={handleRemoveTag}
              theme={theme}
            />

            <Text style={styles.inputLabel}>{t(LocalizedStrings.groups.groupType)}</Text>
            <View style={styles.radioWrapper}>
              {["Public", "Private"].map((item) => (
                <TouchableOpacity
                  key={item}
                  onPress={() => setValue("groupType", item as "Public" | "Private")}
                  style={[styles.radioInnerWrapper]}
                >
                  <View
                    style={[
                      formValues.groupType === item
                        ? styles.radioOuterActive
                        : styles.radioOuterInctive,
                      styles.radioOuter,
                    ]}
                  >
                    {formValues.groupType === item && <View style={styles.radioInner}></View>}
                  </View>
                  <Text style={styles.radioText}>{t(`groups.${item.toLowerCase()}`)}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {groupFriends.length > 0 && (
              <>
                <View style={styles.divider}></View>
                <Text style={styles.inputLabel}>{t(LocalizedStrings.groups.addMembers)}</Text>
                <View style={styles.serachWrapper}>
                  <ThemeInput
                    placeholder={t(LocalizedStrings.groups.searchUsers)}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    leftIcon={<IconSearch />}
                    rightIcon={
                      isLoading ? (
                        <ActivityIndicator size="small" color={theme.colors.primary.main} />
                      ) : searchQuery ? (
                        <TouchableOpacity onPress={handleClearSearch}>
                          <Ionicons
                            name="close-circle"
                            size={moderateScale(18)}
                            color={theme.colors.text.hint}
                          />
                        </TouchableOpacity>
                      ) : undefined
                    }
                    containerStyle={styles.searchContainer}
                    placeholderClassName="text-[#B3B3B3] text-xs font-normal"
                    returnKeyType="search"
                  />
                </View>

                <FlatList
                  data={filteredFriends}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: scale(10) }}
                  horizontal
                  keyExtractor={(item) => item.id.toString()} // Good practice to add a keyExtractor
                  renderItem={({ item }) => {
                    // Check if this specific user is selected
                    const isSelected = formValues.memberIds.includes(item.id);

                    return (
                      <Pressable
                        style={[
                          styles.userItem,
                          isSelected && {
                            backgroundColor: theme.colors.primary.light, // Or any highlight color
                            borderColor: theme.colors.primary.main,
                          },
                        ]}
                        onPress={() => handleFriendClick(item.id)}
                      >
                        <Image
                          source={{ uri: item.avatarUrl ?? "https://i.pravatar.cc/150?img=1" }}
                          style={styles.userImage}
                        />
                        <Text
                          style={[
                            styles.userName,
                            isSelected && { color: theme.colors.primary.dark },
                          ]}
                        >
                          {item.firstName}
                        </Text>
                        {isSelected && (
                          <Ionicons
                            name="checkmark-circle"
                            size={scale(14)}
                            color={theme.colors.primary.main}
                          />
                        )}
                      </Pressable>
                    );
                  }}
                />
              </>
            )}
            <View style={styles.switchWrapper}>
              <Text style={styles.switchText}>{t(LocalizedStrings.groups.notifyMembersDesc)}</Text>

              <Switch
                value={formValues.notifyMembers}
                style={styles.switch}
                trackColors={{
                  on: theme.colors.slateCharcoal,
                  off: theme.colors.gray[300],
                }}
                onPress={() => setValue("notifyMembers", !formValues.notifyMembers)}
              />
            </View>

            <View style={styles.switchWrapper}>
              <Text style={styles.switchText}>{t(LocalizedStrings.groups.allowMembersPost)}</Text>

              <Switch
                value={formValues.allowMembers}
                style={styles.switch}
                trackColors={{
                  on: theme.colors.slateCharcoal,
                  off: theme.colors.gray[300],
                }}
                onPress={() => setValue("allowMembers", !formValues.allowMembers)}
              />
            </View>
            <Button
              title={t(LocalizedStrings.groups.createFirstGroup)}
              onPress={handleSubmit(onSubmit)}
              loading={isLoading}
              style={styles.button}
              textStyle={styles.btnTextStyle}
              rightIcon={null}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      paddingTop: verticalScale(40),
    },
    container: {
      padding: verticalScale(16),
      paddingTop: verticalScale(30),
    },
    header: {
      fontSize: moderateScale(24),
      fontWeight: "400" as const,
      fontFamily: fontFamily.gascogneSerial.regular,
      color: theme.colors.text.primary,
    },
    headerRow: {
      flexDirection: "row",
      marginTop: verticalScale(30),
      alignItems: "center",
    },
    backButton: {
      aspectRatio: 1,
      height: verticalScale(40),
      borderRadius: moderateScale(10),
      backgroundColor: theme.colors.primary.main,
      borderWidth: scale(1),
      borderColor: theme.colors.slateCharcoal,
      justifyContent: "center",
      alignItems: "center",
    },
    backButtonInner: {
      aspectRatio: 1,
      height: verticalScale(16),
      justifyContent: "center",
      alignItems: "center",
    },
    section: {
      marginTop: verticalScale(20),
      gap: verticalScale(5),
    },
    switch: {
      width: scale(30),
      height: verticalScale(16),
    },
    inputLabel: {
      fontSize: moderateScale(14),
      fontWeight: "500" as const,
      fontFamily: fontFamily.manrope.medium,
      color: theme.colors.text.primary,
      marginBottom: verticalScale(6),
    },
    textInput: {
      backgroundColor: theme.colors.white,
      borderColor: theme.colors.border,
      borderWidth: scale(1),
      borderStyle: "solid",
      borderRadius: moderateScale(10),
      minHeight: verticalScale(80),
      paddingHorizontal: scale(15),
      paddingTop: verticalScale(15),
      paddingBottom: verticalScale(35),
      color: theme.colors.text.primary,
      fontFamily: "Manrope-Regular",
      fontSize: moderateScale(12),
      textAlignVertical: "top",
      marginBottom: verticalScale(1),
    },
    imagePicker: {
      width: "100%",
      borderWidth: scale(1),
      borderStyle: "solid",
      backgroundColor: theme.colors.white,
      borderColor: theme.colors.border,
      borderRadius: moderateScale(10),
      padding: verticalScale(10),
      minHeight: verticalScale(100),
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      marginBottom: verticalScale(10),
    },
    imagePickerWithImage: {
      aspectRatio: 1,
      padding: 0,
    },
    imagePreview: {
      width: "100%",
      height: "100%",
      borderRadius: moderateScale(10),
    },
    radioWrapper: {
      flexDirection: "row",
      gap: scale(15),
    },
    radioInnerWrapper: {
      flexDirection: "row",
      gap: scale(5),
    },
    radioOuter: {
      aspectRatio: 1,
      height: verticalScale(16),
      borderRadius: moderateScale(16),
      justifyContent: "center",
      alignItems: "center",
    },
    radioOuterActive: {
      borderWidth: scale(1),
      borderColor: theme.colors.slateCharcoal,
    },
    radioOuterInctive: {
      borderWidth: scale(1),
      borderColor: theme.colors.border,
    },
    radioInner: {
      aspectRatio: 1,
      height: verticalScale(8),
      borderRadius: moderateScale(8),
      backgroundColor: theme.colors.slateCharcoal,
    },
    radioText: {
      fontSize: moderateScale(14),
      fontWeight: "400" as const,
      fontFamily: fontFamily.manrope.regular,
      color: theme.colors.primary.dark,
    },
    searchContainer: {
      marginBottom: theme.spacing.md,
      borderRadius: moderateScale(60),
      borderColor: theme.colors.white,
      padding: 0,
      height: verticalScale(40),
    },
    serachWrapper: {
      marginTop: 0,
      overflow: "hidden",
    },
    searchResultWrapper: {
      marginVertical: verticalScale(30),
    },
    divider: {
      marginTop: verticalScale(10),
    },
    switchWrapper: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: verticalScale(20),
    },
    switchText: {
      fontSize: moderateScale(14),
      fontWeight: "500" as const,
      fontFamily: fontFamily.manrope.medium,
      color: theme.colors.text.primary,
    },
    button: {
      marginTop: verticalScale(30),
    },
    btnTextStyle: {
      fontSize: moderateScale(20),
    },
    userList: {
      gap: scale(10),
      flexDirection: "row",
      flexWrap: "wrap",
    },
    userItem: {
      gap: scale(5),
      flexDirection: "row",
      alignItems: "center",
      padding: verticalScale(5),
      paddingRight: scale(10),
      borderWidth: scale(1),
      borderColor: theme.colors.divider,
      borderRadius: moderateScale(50),
    },
    userImage: {
      width: scale(30),
      height: verticalScale(30),
      borderRadius: moderateScale(40),
      objectFit: "cover",
    },
    userName: {
      fontSize: moderateScale(14),
      fontWeight: "500" as const,
      fontFamily: fontFamily.manrope.medium,
      color: theme.colors.text.primary,
    },
  });
