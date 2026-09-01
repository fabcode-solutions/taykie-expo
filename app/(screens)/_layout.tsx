import { Stack } from "expo-router";
import { useTheme } from "@/theme";

export default function ScreenLayout() {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: "Back",
        headerStyle: {
          backgroundColor: theme.colors.background.paper,
        },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="create-post"
        options={{
          title: "Create post",
          headerShown: false,
          animation: "slide_from_left",
          animationDuration: 250,
          animationTypeForReplace: "pop",
        }}
      />
      <Stack.Screen
        name="bookmarked"
        options={{
          title: "Bookmarked",
          headerShown: false,
          animation: "slide_from_left",
          animationDuration: 250,
          animationTypeForReplace: "pop",
        }}
      />
    </Stack>
  );
}
