import { Alert, Platform } from "react-native";

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
}

interface AlertOptions {
  cancelable?: boolean;
}

const webAlert = (
  title: string,
  message?: string,
  buttons?: AlertButton[],
  _options?: AlertOptions,
) => {
  // Combine title and message, prioritizing message if it exists
  const displayText = message || title;

  // For single button or no buttons, just show alert
  if (!buttons || buttons.length <= 1) {
    window.alert(displayText);
    buttons?.[0]?.onPress?.();
    return;
  }

  // For multiple buttons, use confirm
  const result = window.confirm(displayText);

  if (result) {
    // Find the non-cancel button (the "confirm" action)
    const confirmButton = buttons.find(({ style }) => style !== "cancel");
    confirmButton?.onPress?.();
  } else {
    // Find the cancel button
    const cancelButton = buttons.find(({ style }) => style === "cancel");
    cancelButton?.onPress?.();
  }
};

const crossPlatformAlert = Platform.OS === "web" ? webAlert : Alert.alert;

export default crossPlatformAlert;
