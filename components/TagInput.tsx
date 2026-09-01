import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import { Theme } from "@/theme";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import { t } from "i18next";
import React from "react";
import { TextInput, View, StyleSheet, Text, TouchableOpacity } from "react-native";

// 1. New TagInput Component
export const TagInput = React.memo(
  ({
    tags,
    onAddTag,
    onRemoveTag,
    theme,
  }: {
    tags: string[];
    onAddTag: (tag: string) => void;
    onRemoveTag: (index: number) => void;
    theme: Theme;
  }) => {
    const [currentTag, setCurrentTag] = React.useState("");
    const styles = React.useMemo(() => createTagStyles(theme), [theme]);

    const handleAdd = () => {
      const trimmed = currentTag.trim();
      if (trimmed && !tags.includes(trimmed)) {
        onAddTag(trimmed);
        setCurrentTag("");
      }
    };

    return (
      <View style={styles.container}>
        <Text style={styles.label}>{t(LocalizedStrings.groups.tags)}</Text>

        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            value={currentTag}
            onChangeText={setCurrentTag}
            placeholder={t(LocalizedStrings.groups.addTags)}
            placeholderTextColor={theme.colors.divider}
            onSubmitEditing={handleAdd}
            blurOnSubmit={false}
            returnKeyType="done"
          />
          s
          <TouchableOpacity
            style={[
              styles.addBtn,
              {
                backgroundColor: currentTag ? theme.colors.primary.main : theme.colors.gray[300],
              },
            ]}
            onPress={handleAdd}
            disabled={!currentTag}
          >
            <Text style={styles.addBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tagList}>
          {tags.map((tag, index) => (
            <View key={`tag-${index}`} style={styles.tagBadge}>
              <Text style={styles.tagText}>{tag}</Text>
              <TouchableOpacity onPress={() => onRemoveTag(index)}>
                <Text style={styles.removeText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>
    );
  },
);

TagInput.displayName = "TagInput";

const createTagStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      marginTop: verticalScale(10),
      gap: verticalScale(8),
    },
    label: {
      fontSize: moderateScale(14),
      fontFamily: "Manrope-Bold",
      color: theme.colors.text.primary,
    },
    tagList: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: scale(8),
      marginBottom: verticalScale(10),
    },
    tagBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.primary.main,
      paddingHorizontal: scale(10),
      paddingVertical: verticalScale(4),
      borderRadius: 99,
      borderWidth: scale(1),
      borderColor: theme.colors.primary.main,
    },
    tagText: {
      fontSize: moderateScale(12),
      color: theme.colors.text.primary,
      fontFamily: "Manrope-Medium",
      marginRight: scale(6),
    },
    removeText: {
      fontSize: moderateScale(12),
      color: theme.colors.icon,
    },
    inputWrapper: {
      flexDirection: "row",
      alignItems: "center",
      gap: scale(8),
    },
    input: {
      flex: 1,
      backgroundColor: theme.colors.white,
      borderWidth: scale(1),
      borderColor: theme.colors.border,
      borderRadius: moderateScale(8),
      height: verticalScale(40),
      paddingHorizontal: scale(12),
      fontSize: moderateScale(12),
    },
    addBtn: {
      width: verticalScale(40),
      height: verticalScale(40),
      borderRadius: moderateScale(8),
      justifyContent: "center",
      alignItems: "center",
    },
    addBtnText: {
      color: theme.colors.icon,
      fontSize: moderateScale(20),
    },
  });
