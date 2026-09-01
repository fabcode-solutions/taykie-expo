import React, { memo } from "react";
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  Platform,
} from "react-native";
import { useTheme, Theme, fontFamily } from "@/theme";
import { moderateScale, scale, verticalScale } from "@/utils/scale";

interface GroupFormInputProps extends TextInputProps {
  label: string;
  error?: string;
  containerStyle?: ViewStyle;
  required?: boolean;
  characterLimit?: number;
  currentLength?: number;
}

const GroupFormInputComponent: React.FC<GroupFormInputProps> = ({
  label,
  error,
  containerStyle,
  required = false,
  multiline = false,
  characterLimit,
  currentLength = 0,
  style,
  ...inputProps
}) => {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.labelContainer}>
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
        {characterLimit && (
          <Text style={styles.characterCount}>
            {currentLength}/{characterLimit}
          </Text>
        )}
      </View>

      <TextInput
        style={[
          styles.input,
          multiline && styles.multilineInput,
          error && styles.inputError,
          { color: theme.colors.text.primary },
          style,
        ]}
        placeholderTextColor={theme.colors.text.hint}
        textAlignVertical={multiline ? "top" : "center"}
        multiline={multiline}
        maxLength={characterLimit}
        {...inputProps}
      />

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      marginBottom: verticalScale(16),
    },
    labelContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: verticalScale(8),
    },
    label: {
      fontSize: moderateScale(14),
      fontWeight: "500",
      fontFamily: fontFamily.manrope.medium,
      color: theme.colors.text.primary,
    },
    required: {
      color: theme.colors.error.main,
    },
    characterCount: {
      fontSize: moderateScale(12),
      color: theme.colors.text.hint,
      fontFamily: fontFamily.manrope.regular,
    },
    input: {
      borderWidth: scale(1),
      borderColor: theme.colors.border,
      borderRadius: moderateScale(12),
      paddingHorizontal: scale(16),
      paddingVertical: verticalScale(Platform.OS === "ios" ? 14 : 12),
      fontSize: moderateScale(14),
      fontFamily: fontFamily.manrope.regular,
      backgroundColor: theme.colors.background.default,
      minHeight: verticalScale(48),
    },
    multilineInput: {
      minHeight: verticalScale(100),
      paddingTop: verticalScale(12),
      textAlignVertical: "top",
    },
    inputError: {
      borderColor: theme.colors.error.main,
    },
    errorText: {
      fontSize: moderateScale(12),
      color: theme.colors.error.main,
      marginTop: verticalScale(4),
      fontFamily: fontFamily.manrope.regular,
    },
  });

export const GroupFormInput = memo(GroupFormInputComponent);
