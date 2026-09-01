// Lightweight event hook(s) used by the API client to notify the app
// without importing app state (avoids require cycles).

let onUnauthorized: (() => void | Promise<void>) | null = null;

export function setOnUnauthorized(handler: (() => void | Promise<void>) | null) {
  onUnauthorized = handler;
}

export async function triggerUnauthorized() {
  if (onUnauthorized) {
    await onUnauthorized();
  }
}
