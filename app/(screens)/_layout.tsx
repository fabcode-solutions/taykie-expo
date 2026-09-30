import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/theme";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";

export default function ScreenLayout() {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: t(LocalizedStrings.navigation.back),
        headerStyle: {
          backgroundColor: theme.colors.background.paper,
        },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="create-post"
        options={{
          title: t(LocalizedStrings.navigation.screens.createPost),
          headerShown: false,
          animation: "slide_from_left",
          animationDuration: 250,
          animationTypeForReplace: "pop",
        }}
      />
      <Stack.Screen
        name="bookmarked"
        options={{
          title: t(LocalizedStrings.navigation.screens.bookmarked),
          headerShown: false,
          animation: "slide_from_left",
          animationDuration: 250,
          animationTypeForReplace: "pop",
        }}
      />
    </Stack>
  );
}
