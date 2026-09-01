import { View } from "react-native";
import { useColors } from "@/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabBarBackground() {
  const insets = useSafeAreaInsets();
  const colors = useColors();

  return (
    <View
      style={{
        backgroundColor: colors.background.default,
        height: insets.bottom,
      }}
    />
  );
}

export function useBottomTabOverflow() {
  return 0;
}
