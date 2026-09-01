import { Platform } from "react-native";

/**
 * Sends the authentication token to the browser extension via postMessage
 * @param token The authentication token to send
 */
export const sendExtensionAuthToken = (token: string): void => {
  // Check if we're in a web environment
  if (Platform.OS !== "web") return;

  // Send the token to the extension
  window.postMessage({
    type: "EXT_AUTH",
    token,
  });
};

/**
 * Sends a logout message to the browser extension via postMessage
 */
export const sendExtensionLogout = (): void => {
  // Check if we're in a web environment
  if (Platform.OS !== "web") return;

  // Send the logout message to the extension
  window.postMessage({
    type: "EXT_LOGOUT",
  });
};
