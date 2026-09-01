import { AlertConfig, AlertType } from "@/types/alert";

/**
 * Utility class for creating common alert configurations
 * Following the Builder pattern for flexibility
 */
export class AlertBuilder {
  private config: Partial<AlertConfig> = {
    type: "info",
    dismissible: true,
    showIcon: true,
  };

  type(type: AlertType): this {
    this.config.type = type;
    return this;
  }

  title(title: string): this {
    this.config.title = title;
    return this;
  }

  message(message: string): this {
    this.config.message = message;
    return this;
  }

  duration(duration: number): this {
    this.config.duration = duration;
    return this;
  }

  position(position: "top" | "bottom"): this {
    this.config.position = position;
    return this;
  }

  dismissible(dismissible: boolean): this {
    this.config.dismissible = dismissible;
    return this;
  }

  showIcon(showIcon: boolean): this {
    this.config.showIcon = showIcon;
    return this;
  }

  action(text: string, onPress: () => void): this {
    this.config.action = { text, onPress };
    return this;
  }

  onPress(onPress: () => void): this {
    this.config.onPress = onPress;
    return this;
  }

  onDismiss(onDismiss: () => void): this {
    this.config.onDismiss = onDismiss;
    return this;
  }

  build(): Omit<AlertConfig, "id"> {
    if (!this.config.title) {
      throw new Error("Alert title is required");
    }
    return this.config as Omit<AlertConfig, "id">;
  }
}

/**
 * Preset alert configurations for common use cases
 */
export const AlertPresets = {
  success: (title: string, message?: string) =>
    new AlertBuilder()
      .type("success")
      .title(title)
      .message(message || "")
      .build(),

  error: (title: string, message?: string) =>
    new AlertBuilder()
      .type("error")
      .title(title)
      .message(message || "")
      .duration(6000) // Errors stay longer
      .build(),

  warning: (title: string, message?: string) =>
    new AlertBuilder()
      .type("warning")
      .title(title)
      .message(message || "")
      .build(),

  info: (title: string, message?: string) =>
    new AlertBuilder()
      .type("info")
      .title(title)
      .message(message || "")
      .build(),

  networkError: () =>
    new AlertBuilder()
      .type("error")
      .title("Network Error")
      .message("Please check your internet connection")
      .duration(5000)
      .build(),

  authError: (message: string = "Authentication failed") =>
    new AlertBuilder()
      .type("error")
      .title("Authentication Error")
      .message(message)
      .duration(5000)
      .build(),

  loginSuccess: (userName?: string) =>
    new AlertBuilder()
      .type("success")
      .title("Welcome back!")
      .message(userName ? `Logged in as ${userName}` : "Login successful")
      .duration(3000)
      .build(),

  signupSuccess: () =>
    new AlertBuilder()
      .type("success")
      .title("Account created!")
      .message("Welcome to Pocket")
      .duration(3000)
      .build(),

  saveSuccess: (itemName?: string) =>
    new AlertBuilder()
      .type("success")
      .title("Saved!")
      .message(itemName ? `"${itemName}" has been saved` : "Item saved successfully")
      .duration(3000)
      .build(),

  deleteWarning: (onConfirm: () => void) =>
    new AlertBuilder()
      .type("warning")
      .title("Delete Item?")
      .message("This action cannot be undone")
      .action("Delete", onConfirm)
      .dismissible(true)
      .duration(0) // Don't auto-dismiss
      .build(),
};
