export const endpoints = {
  auth: {
    login: "/auth/login",
    session: "/auth/session",
    requestRecovery: "/auth/request-recovery-token",
    submitRecovery: "/auth/submit-recovery-token",
    exchangeTotp: "/auth/exchange-totp-token",
    userProfile: "/auth/me",
    logout: "/auth/logout",
    social: "/auth/social",
    refresh: "/auth/refresh",
  },
  // Public auth endpoints (NextAuth-backed API)
  authPublic: {
    register: "/auth/register",
    forgotPassword: "/auth/forgot-password",
    verifyOtp: "/auth/verify-otp",
    resetPassword: "/auth/reset-password",
    changePassword: "/auth/change-password",
  },
  // NextAuth core endpoints for cookie sessions
  authNext: {
    csrf: "/api/auth/csrf",
    callbackCredentials: "/api/auth/callback/credentials",
    session: "/api/auth/session",
    signout: "/api/auth/signout",
  },
  users: {
    search: "/users/search",
    profile: "/users/profile",
    account: "/users/account",
    insights: "/insights",
    settings: "/users/settings",
    fcmToken: "/users/fcm-token",
    export: "/users/export",
    suggestions: "/users/suggestions",
    streak: "/users/streak",
    friends: "/users/friends",
  },
  authMobile: {
    exchange: "/api/auth/mobile/exchange",
  },
  products: {
    products: "/products",
    search: "/products/search",
    public_product: "/products/public",
  },
  teams: {
    list: "/api/v1/teams",
    sample: (teamId: string) => `/api/v1/teams/${encodeURIComponent(teamId)}/example`,
  },

  groups: {
    myGroups: "/groups/my",
    recommended: "/groups/recommended",
    search: "/groups/search",
    create: "/groups",
    detail: (id: string) => `/groups/${id}`,
    join: (id: string) => `/groups/${id}/join`,
    leave: (id: string) => `/groups/${id}/leave`,
    uploadPhoto: "/groups/photo",
    members: (id: string) => `/groups/${id}/members`,
    posts: (id: string) => `/groups/${id}/posts`,
  },
  schedule: {
    tasks: "/api/schedule/tasks",
    task: (taskId: string) => `/api/schedule/tasks/${encodeURIComponent(taskId)}`,
    taskStatus: (taskId: string) => `/api/schedule/tasks/${encodeURIComponent(taskId)}/status`,
    schedules: "/schedules",
    today_schedules: "/schedules/today",
    remind_upcoming: "/schedules/remind-upcoming",
  },

  post: {
    posts: "/posts",
    bookmark: "/posts/bookmarked",
    comments: "posts/comments",
  },

  group: {
    group: "/groups",
    myGroups: "/groups/my-groups",
    recommended_groups: "/groups/recommended",
  },

  upload: {
    image: "/upload/image",
  },

  notification: {
    notifications: "/notifications",
    read_all: "/notifications/read-all",
    send: "/notifications/send",
  },

  onboarding: {
    status: "/onboarding/status",
    save: "/onboarding/save",
    complete: "/onboarding/complete",
    reset: "/onboarding/reset",
  },

  device: {
    device: "/device",
    pair_device: "/device/pair",
    sync_history: "history/sync",
  },
};
