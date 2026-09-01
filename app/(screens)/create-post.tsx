import * as ImagePicker from "expo-image-picker";
import { Button } from "@/components/ui/button";
import { KeyboardAvoidingSafeArea } from "@/components";
import IconBackArrow from "@/components/icons/IconBackArrow";
import Tabs from "@/components/shared/tabs/Tabs";
import { Theme, useTheme } from "@/theme";
import { router } from "expo-router";
import * as React from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { CreatePostRequest, PostType } from "@/types/posts.types";
import { usePostStore } from "@/stores/postStore";
import { Loader } from "@/components/shared/loader";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import { t } from "i18next";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import { AlertPresets } from "@/utils/alert";
import { useAlert } from "@/provider/AlertProvider";

// Extracted Poll Options Component
const PollOptions = React.memo(
  ({
    options,
    onUpdateOption,
    onRemoveOption,
    onAddOption,
    theme,
  }: {
    options: string[];
    onUpdateOption: (text: string, index: number) => void;
    onRemoveOption: (index: number) => void;
    onAddOption: () => void;
    theme: Theme;
  }) => {
    const styles = React.useMemo(() => createPollOptionStyles(theme), [theme]);

    return (
      <View style={styles.container}>
        {options.map((option, index) => (
          <View style={styles.optionRow} key={`poll-option-${index}`}>
            <TextInput
              style={styles.input}
              placeholderTextColor={theme.colors.divider}
              value={option}
              maxLength={50}
              onChangeText={(text) => onUpdateOption(text, index)}
              placeholder={`${t(LocalizedStrings.community.post.option)} ${index + 1}`}
            />
            {options.length > 1 && (
              <TouchableOpacity onPress={() => onRemoveOption(index)} style={styles.deleteBtn}>
                <Text style={styles.deleteIcon}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
        {options.length < 4 && (
          <TouchableOpacity style={styles.addButton} onPress={onAddOption}>
            <Text style={styles.addButtonText}>
              {t(LocalizedStrings.community.post.add_option)}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  },
);

PollOptions.displayName = "PollOptions";

const CreatePost = () => {
  const theme = useTheme();
  const showAlert = useAlert();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  // State management

  const [textPost, setTextPost] = React.useState("");
  const [image, setImage] = React.useState("");
  const [imageCaption, setImageCaption] = React.useState("");
  const [pollQuestion, setPollQuestion] = React.useState("");
  const [pollOptions, setPollOptions] = React.useState([
    t(LocalizedStrings.common.yes),
    t(LocalizedStrings.common.no),
  ]);
  const [selectedType, setSelectedType] = React.useState<PostType>(PostType.TEXT);

  const { createPost, isLoading } = usePostStore();

  const POST_TYPE_CONFIG: Record<PostType, { label: string }> = React.useMemo(
    () => ({
      [PostType.TEXT]: {
        label: t(LocalizedStrings.community.post.textPost),
      },
      [PostType.IMAGE]: {
        label: t(LocalizedStrings.community.post.imagePost),
      },
      [PostType.POLL]: {
        label: t(LocalizedStrings.community.post.pollPost),
      },
      // optional: ignore these in UI
      [PostType.RESULTS]: { label: "" },
      [PostType.ACTIVE]: { label: "" },
    }),
    [t],
  );
  const tabTypes = Object.values(PostType).filter(
    (type) => type !== PostType.RESULTS && type !== PostType.ACTIVE,
  );
  // Tab segments
  const segments = tabTypes.map((type) => ({
    key: type,
    label: POST_TYPE_CONFIG[type].label,
  }));

  // Handlers
  const handleTabSelect = React.useCallback((key: string) => {
    setSelectedType(key as PostType);
  }, []);

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

  const updatePollOption = React.useCallback((text: string, index: number) => {
    setPollOptions((prev) => prev.map((item, idx) => (idx === index ? text : item)));
  }, []);

  const addPollOption = React.useCallback(() => {
    setPollOptions((prev) => [...prev, ""]);
  }, []);

  const removePollOption = React.useCallback((index: number) => {
    setPollOptions((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handlePost = React.useCallback(async () => {
    try {
      let request: CreatePostRequest;
      switch (selectedType) {
        case PostType.TEXT:
          request = {
            type: PostType.TEXT,
            text: textPost,
          };
          break;

        case PostType.POLL:
          request = {
            type: PostType.POLL,
            pollOptions: pollOptions.map((value) => ({ label: value })),
          };
          if (pollQuestion) request = { ...request, text: pollQuestion };

          break;

        default:
          request = {
            type: PostType.IMAGE,
            image: image,
          };

          if (imageCaption) request = { ...request, text: imageCaption };
      }
      const message = await createPost(request);
      Alert.alert(t(LocalizedStrings.common.success), message, [
        {
          text: t(LocalizedStrings.common.ok),
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      showAlert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
    }
  }, [selectedType, textPost, image, imageCaption, pollOptions, createPost, pollQuestion]);

  const handleBack = React.useCallback(() => {
    router.back();
  }, []);

  return (
    <>
      {isLoading && <Loader />}
      <KeyboardAvoidingSafeArea
        style={[{ backgroundColor: theme.colors.background.default, flex: 1 }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <View style={styles.backButtonInner}>
              <IconBackArrow />
            </View>
          </TouchableOpacity>

          <Text style={styles.title}>
            {selectedType === PostType.POLL
              ? t(LocalizedStrings.community.post.createPoll)
              : t(LocalizedStrings.community.post.createPost)}
          </Text>

          {/* Tabs */}
          <View>
            <Tabs variant="no-bg" segments={segments} onSelect={handleTabSelect} />
          </View>

          {/* Text Post */}
          {selectedType === PostType.TEXT && (
            <View>
              <TextInput
                style={styles.textInput}
                multiline
                numberOfLines={4}
                value={textPost}
                maxLength={250}
                onChangeText={setTextPost}
                placeholderTextColor={theme.colors.divider}
                placeholder={t(LocalizedStrings.community.placeHolder.write)}
              />
              <Text style={styles.letterCount}>{textPost.length}/250</Text>
            </View>
          )}

          {/* Image Post */}
          {selectedType === PostType.IMAGE && (
            <View style={{ gap: verticalScale(12) }}>
              <TouchableOpacity
                style={[styles.imagePicker, image && styles.imagePickerWithImage]}
                onPress={pickImageAsync}
              >
                {!image ? (
                  <Text style={styles.imagePickerText}>
                    {t(LocalizedStrings.community.placeHolder.selectImage)}
                  </Text>
                ) : (
                  <Image style={styles.imagePreview} source={{ uri: image }} resizeMode="contain" />
                )}
              </TouchableOpacity>
              <TextInput
                style={styles.captionInput}
                multiline
                maxLength={250}
                value={imageCaption}
                onChangeText={setImageCaption}
                placeholderTextColor={theme.colors.divider}
                placeholder={t(LocalizedStrings.community.placeHolder.addCaption)}
              />
            </View>
          )}

          {/* Poll Post */}
          {selectedType === PostType.POLL && (
            <View>
              <View>
                <TextInput
                  style={styles.textInput}
                  multiline
                  numberOfLines={4}
                  value={pollQuestion}
                  maxLength={250}
                  onChangeText={setPollQuestion}
                  placeholderTextColor={theme.colors.divider}
                  placeholder={t(LocalizedStrings.community.placeHolder.askQuestion)}
                />
              </View>

              <PollOptions
                options={pollOptions}
                onUpdateOption={updatePollOption}
                onRemoveOption={removePollOption}
                onAddOption={addPollOption}
                theme={theme}
              />
            </View>
          )}

          {/* Post Button */}
          <Button
            title={t(LocalizedStrings.community.post.title)}
            onPress={handlePost}
            style={styles.postButton}
            rightIcon={null}
            loading={isLoading}
          />
        </ScrollView>
      </KeyboardAvoidingSafeArea>
    </>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      padding: verticalScale(24),
    },
    scrollContent: {
      padding: verticalScale(24),
      gap: verticalScale(20),
    },
    backButton: {
      marginBottom: verticalScale(10),
    },
    backButtonInner: {
      borderWidth: scale(1),
      backgroundColor: theme.colors.primary.main,
      borderRadius: moderateScale(10),
      borderColor: theme.colors.text.primary,
      height: verticalScale(40),
      aspectRatio: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    title: {
      fontSize: moderateScale(24),
      lineHeight: verticalScale(24),
      fontFamily: "Gascogne-Serial",
      color: theme.colors.text.primary,
    },

    textInput: {
      backgroundColor: theme.colors.white,
      borderColor: theme.colors.border,
      borderWidth: scale(1),
      borderStyle: "solid",
      borderRadius: moderateScale(10),
      minHeight: verticalScale(120),
      paddingHorizontal: scale(15),
      paddingTop: verticalScale(15),
      color: theme.colors.text.primary,
      fontFamily: "Manrope-Regular",
      fontSize: moderateScale(12),
      textAlignVertical: "top",
    },
    letterCount: {
      position: "absolute",
      right: scale(10),
      bottom: verticalScale(10),
      color: theme.colors.divider,
      fontFamily: "Manrope-Regular",
      fontSize: moderateScale(12),
    },
    imagePicker: {
      width: "100%",
      borderWidth: scale(1),
      borderStyle: "dashed",
      borderColor: theme.colors.border,
      borderRadius: moderateScale(10),
      padding: verticalScale(10),
      minHeight: verticalScale(150),
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    imagePickerWithImage: {
      aspectRatio: 1,
      padding: 0,
    },
    imagePickerText: {
      fontSize: moderateScale(14),
      color: theme.colors.text.secondary,
      fontFamily: "Manrope-Regular",
    },
    imagePreview: {
      width: "100%",
      height: "100%",
      borderRadius: moderateScale(10),
    },
    captionInput: {
      fontSize: moderateScale(12),
      color: theme.colors.text.primary,
      fontFamily: "Manrope-Medium",
      fontWeight: "500",
    },
    postButton: {
      backgroundColor: theme.colors.primary.main,
      height: verticalScale(64),
      borderRadius: 999,
      marginTop: verticalScale(10),
      shadowColor: theme.colors.primary.main,
      shadowOffset: { width: 0, height: verticalScale(2) },
      shadowOpacity: 0.12,
      shadowRadius: moderateScale(8),
      elevation: 3,
    },
  });

const createPollOptionStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      marginTop: verticalScale(20),
      gap: verticalScale(10),
    },
    optionRow: {
      flexDirection: "row",
      alignItems: "center",
      position: "relative",
    },
    input: {
      flex: 1,
      backgroundColor: theme.colors.background.paper,
      borderColor: theme.colors.border,
      borderWidth: scale(1),
      borderStyle: "solid",
      borderRadius: moderateScale(10),
      minHeight: verticalScale(40),
      paddingHorizontal: scale(15),
      color: theme.colors.text.primary,
      fontFamily: "Manrope-Regular",
      fontSize: moderateScale(12),
    },
    deleteBtn: {
      position: "absolute",
      right: scale(8),
      backgroundColor: theme.colors.gray[200],
      aspectRatio: 1,
      height: verticalScale(24),
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 999,
    },
    deleteIcon: {
      fontSize: moderateScale(12),
      fontWeight: "bold",
      color: "#666",
    },
    addButton: {
      borderWidth: scale(1),
      borderStyle: "dashed",
      borderColor: theme.colors.border,
      borderRadius: moderateScale(10),
      padding: verticalScale(12),
      paddingHorizontal: scale(15),
    },
    addButtonText: {
      fontSize: moderateScale(12),
      color: theme.colors.divider,
      fontFamily: "Manrope-Medium",
      fontWeight: "500",
    },
  });

export default CreatePost;
