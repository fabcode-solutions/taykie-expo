import { ViewStyle, TextStyle } from "react-native";

export type AlertType = "success" | "error" | "warning" | "info";
export type AlertPosition = "top" | "bottom";

export interface AlertConfig {
  id?: string;
  type: AlertType;
  title: string;
  message?: string;
  duration?: number;
  position?: AlertPosition;
  onPress?: () => void;
  onDismiss?: () => void;
  dismissible?: boolean;
  showIcon?: boolean;
  customIcon?: React.ReactNode;
  action?: {
    text: string;
    onPress: () => void;
  };
}

export interface AlertStyles {
  container: ViewStyle;
  contentContainer: ViewStyle;
  iconContainer: ViewStyle;
  textContainer: ViewStyle;
  titleText: TextStyle;
  messageText: TextStyle;
  actionButton: ViewStyle;
  actionText: TextStyle;
  closeButton?: ViewStyle;
}
export interface Errors {
  message: string;
  status: number;
  success: boolean;
}
export interface AlertContextValue {
  show: (config: Omit<AlertConfig, "id">) => string;
  hide: (id?: string) => void;
  hideAll: () => void;
}
