import { AlertConfig, AlertType } from "@/types/alert";
import { t } from "i18next";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";

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
      .title(t(LocalizedStrings.alerts.networkError.title))
      .message(t(LocalizedStrings.alerts.networkError.message))
      .duration(5000)
      .build(),

  authError: (message: string = t(LocalizedStrings.alerts.authError.message)) =>
    new AlertBuilder()
      .type("error")
      .title(t(LocalizedStrings.alerts.authError.title))
      .message(message)
      .duration(5000)
      .build(),

  loginSuccess: (userName?: string) =>
    new AlertBuilder()
      .type("success")
      .title(t(LocalizedStrings.alerts.loginSuccess.title))
      .message(
        userName
          ? t(LocalizedStrings.alerts.loginSuccess.loggedInAs, { name: userName })
          : t(LocalizedStrings.alerts.loginSuccess.message),
      )
      .duration(3000)
      .build(),

  signupSuccess: () =>
    new AlertBuilder()
      .type("success")
      .title(t(LocalizedStrings.alerts.signupSuccess.title))
      .message(t(LocalizedStrings.alerts.signupSuccess.message))
      .duration(3000)
      .build(),

  saveSuccess: (itemName?: string) =>
    new AlertBuilder()
      .type("success")
      .title(t(LocalizedStrings.alerts.saveSuccess.title))
      .message(
        itemName
          ? t(LocalizedStrings.alerts.saveSuccess.itemSaved, { name: itemName })
          : t(LocalizedStrings.alerts.saveSuccess.message),
      )
      .duration(3000)
      .build(),

  deleteWarning: (onConfirm: () => void) =>
    new AlertBuilder()
      .type("warning")
      .title(t(LocalizedStrings.alerts.deleteWarning.title))
      .message(t(LocalizedStrings.alerts.deleteWarning.message))
      .action(t(LocalizedStrings.common.delete), onConfirm)
      .dismissible(true)
      .duration(0) // Don't auto-dismiss
      .build(),
};
