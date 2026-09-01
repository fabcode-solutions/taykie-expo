// Simple runtime token holder to avoid importing the auth store from the API client
// This prevents a require cycle between store -> api/auth -> api/client -> store

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}
