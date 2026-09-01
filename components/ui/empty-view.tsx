import { ThemeText, ThemeView } from "../primitives";
import { StyleSheet, View } from "react-native";
import { Theme, useTheme } from "@/theme";
import { useMemo } from "react";
import { moderateScale, verticalScale } from "@/utils/scale";
import { Button } from "./button";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import { t } from "i18next";
import IconInfoCircle from "../icons/IconInfoCircle";

interface EmptyViewProps {
  showIcon?: boolean;
  title?: string;
  message?: string;
  buttonTitle?: string;
  showButton?: boolean;
  onPressButton?: () => void;
}

const EmptyView = ({
  showIcon = true,
  title,
  message,
  buttonTitle = "Create",
  showButton = false,
  onPressButton,
}: EmptyViewProps) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <ThemeView style={styles.container}>
      <View style={{ gap: verticalScale(7) }}>
        {showIcon && (
          <ThemeView style={styles.iconContainer}>
            <IconInfoCircle />
          </ThemeView>
        )}

        <ThemeText align="center" variant="manrope.h6">
          {title ?? t(LocalizedStrings.logs.nothing_here)}
        </ThemeText>

        <ThemeText align="center" variant="manrope.caption" color={theme.colors.tab.text.secondary}>
          {message}
        </ThemeText>
      </View>

      {showButton && (
        <Button
          size="small"
          fullWidth={false}
          style={styles.button}
          textStyle={styles.buttonText}
          variant="outline"
          title={buttonTitle}
          onPress={() => onPressButton?.()}
        />
      )}
    </ThemeView>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    iconContainer: {
      alignSelf: "center",
    },
    container: {
      gap: verticalScale(19),
      borderRadius: moderateScale(10),
      padding: verticalScale(10),
    },
    button: {
      alignSelf: "center",
      borderColor: theme.colors.text.primary,
    },
    buttonText: {
      color: theme.colors.text.primary,
    },
  });
export default EmptyView;
