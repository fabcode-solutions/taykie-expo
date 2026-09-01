# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Commands

- `yarn install` - Install dependencies
- `npx expo start` - Start development server (uses dev client)
- `yarn start` - Alternative start command with dev client
- `yarn android` - Run on Android device/emulator
- `yarn ios` - Run on iOS device/simulator
- `yarn web` - Start web version
- `yarn test` - Run Jest tests with watch mode
- `yarn lint` - Run ESLint
- `yarn type-check` - Run TypeScript compiler check (no emit)
- `yarn lint-type-check` - Run both lint and type check (run before commits)
- `yarn format` - Format code with Prettier
- `yarn format:check` - Check formatting without writing
- `yarn claude:check` - Format, lint, and type check (recommended for Claude Code)

### Build and Deploy Commands

- `eas build` - Build with EAS (Expo Application Services)
- `yarn deploy` - Main deployment script
- `yarn deploy:submit` - Deploy and submit to app stores
- `yarn deploy:web` - Deploy web version
- `yarn release:major` / `yarn release:minor` / `yarn release:patch` - Version bump and release
- `yarn release:build` - Build release version

## Architecture Overview

### App Structure

This is an Expo React Native app using:

- **File-based routing** with Expo Router
- **Zustand (MMKV persisted)** for app state and **TanStack React Query** for data fetching
- **Custom theme system** with light/dark mode support

### Key Architectural Layers

#### 2. State Management (Zustand)

- **Auth Store**: `authStore.ts` - Authentication state with MMKV persistence
- **Theme Store**: `themeStore.ts` - Theme preferences with MMKV persistence
- **Storage**: MMKV-based persistence with `mmkvStateStorage.ts`
- **API Calls**: Direct fetch calls via `utils/api.ts`

#### 3. Theme System

- **ThemeProvider**: Manages light/dark/system theme modes
- **Theme Tokens**: Colors, typography, spacing, shadows in `/theme/tokens/`
- **Theme Components**: `ThemeView`, `ThemeText`, `ThemeButton`, etc. with built-in theme integration
- **Path**: `@/theme` contains all theme-related code

#### 4. Component Architecture

- **Primitives**: `ThemeView`, `ThemeText`, `ThemeInput`, etc. (`/components/primitives/`)
- **Shared Components**: Reusable UI components (`/components/shared/`)
- **Feature Components**: Item-specific, reader-specific components
- **UI Components**: Form inputs, buttons (`/components/ui/`)

#### 5. Navigation Structure

- **(auth)**: Authentication flow (login, signup)
- **(tabs)**: Main app tabs (index, discover, settings, connect-extension)
- **Modals**: edit-tags, add-article

### Data Flow Patterns

#### Sync Architecture

1. **Local Changes**: Database changes trigger auto-sync via `watchForChanges()`
2. **Server Changes**: WebSocket notifications trigger sync from server
3. **Debounced Sync**: 250ms debounce prevents excessive sync operations
4. **Content Sync**: Article content synced separately after main sync

#### Authentication Flow

- Token stored in Zustand auth store with MMKV persistence
- Token refresh handled in API utility functions
- SyncEngine automatically uses current auth token from store

### File-based Routing

- `app/` directory contains all routes
- `_layout.tsx` files define nested layouts
- Groups: `(auth)`, `(tabs)` for organizing routes

### Internationalization

- i18next with react-i18next
- Language files in `/i18n/` (en, de, es, fr, zh)
- Localization context available throughout app

### Platform Considerations

- Cross-platform components with `.web.tsx` variants where needed
- Platform-specific sync optimizations (turbo mode disabled on web)
- Share extension support for iOS/Android

## Development Patterns

### Theme Usage

```tsx
import { useTheme, useColors } from "@/theme";
// Or use theme components directly
import { ThemeView, ThemeText } from "@/components/primitives";
```

### API Calls

Use API utilities from `/utils/api.ts`:

```tsx
import { apiCall } from "@/utils/api";
// API calls are handled directly with fetch, no RTK Query
```

### Path Aliases

- `@/*` resolves to project root
- Used throughout for clean imports

### Sync Considerations

- Sync operations are debounced and promise-based
- Only one sync can run at a time
- Manual sync via `syncEngine.sync()`
- First sync uses turbo mode for performance (except web)

## Development Notes

### Recent Architecture Changes

**Redux to Zustand Migration**: The codebase recently migrated from Redux Toolkit + RTK Query to Zustand with MMKV persistence. Auth and theme state are now managed in separate Zustand stores (`authStore.ts`, `themeStore.ts`). API calls are handled directly via fetch utilities rather than RTK Query hooks.

### Running Linting/Type Checking

Always run `yarn claude:check` after making changes. This command formats, lints, and type-checks the code in one step. For manual operations, use `yarn lint-type-check` before committing changes. The project uses TypeScript strict mode.

### Testing

Jest tests configured with `jest-expo` preset. Run `yarn test` for watch mode.

### Fonts

Custom fonts (Manrope, Gascogne Serial) load in app/\_layout.tsx. Base64 encoded versions remain available for web compatibility.

### Share Functionality

App supports receiving shared URLs via `ShareHandler` - handles both cold starts and hot links.

### Share Extension

iOS and Android share extensions are available for saving articles directly from other apps. Extension code is located in `/ios/TepraShare/` and uses a separate build process. The `postprebuild:ios` script restores share extension code after prebuild.

## Critical Configuration Changes

### Web Platform Fixes (Required for Expo SDK 53+)

The following configuration changes are **REQUIRED** to make the web platform work with Expo SDK 53+ and Zustand:

#### 1. Metro Configuration (`metro.config.js`) - **CRITICAL**

```js
const { getDefaultConfig } = require("expo/metro-config");
const config = getDefaultConfig(__dirname);

// Fix for import.meta issues with Zustand in Expo SDK 53
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
```

#### 2. App Configuration (`app.json`) - **RECOMMENDED**

```json
{
  "expo": {
    "web": {
      "bundler": "metro",
      "output": "single", // SPA mode - recommended for this app
      "favicon": "./assets/images/favicon.png"
    }
  }
}
```

**Why These Changes Are Needed:**

- **Metro config** (`unstable_enablePackageExports = false`) is the **critical fix** for Zustand's `import.meta` issues in Expo SDK 53+
- **SPA mode** (`"output": "single"`) is **recommended** for this app architecture because:
  - Eliminates potential SSR issues with MMKV storage hydration
  - Better suited for authentication-heavy apps with client-side state
  - Simpler deployment and hosting (single HTML file + assets)
  - No SEO requirements since it's a user-authenticated app

**Note:** While `"output": "static"` also works with the Metro fix, `"single"` is the better architectural choice for this type of application.

**Reference:** [Expo GitHub Issue #36384](https://github.com/expo/expo/issues/36384)

⚠️ **IMPORTANT**: These configurations are critical for web platform functionality. Do not modify without understanding the implications.

## Development Guidelines

### File Creation Policy

- NEVER create files unless absolutely necessary for achieving the goal
- ALWAYS prefer editing existing files over creating new ones
- NEVER proactively create documentation files (\*.md) or README files unless explicitly requested

### Code Standards

- Always run `yarn claude:check` after making changes
- Follow existing code patterns and conventions in the codebase
- Use theme system components and tokens instead of hardcoded values
- Maintain TypeScript strict mode compliance
