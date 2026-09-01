# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   yarn install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a:

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
yarn run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Theme System

The theme system is the foundation of the UI, providing consistent styling across the app.

### Theme Tokens

Core values that define the visual identity:

- Colors: Brand colors, feedback colors, text colors, etc.
- Typography: Font families, sizes, weights, etc.
- Spacing: Consistent spacing scale
- Shadows: Elevation levels for depth

### Theme Provider

The `ThemeProvider` component provides theme context to the app:

```tsx
// Example usage
import { ThemeProvider } from "@/theme";

export default function App() {
  return (
    <ThemeProvider>
      <YourApp />
    </ThemeProvider>
  );
}
```

### Theme Hooks

Custom hooks for accessing theme values:

- `useTheme()`: Access the entire theme object
- `useColors()`: Access the theme colors
- `useTypography()`: Access the typography styles
- `useSpacing()`: Access the spacing scale
- `useShadows()`: Access the shadow values
- `useDarkMode()`: Check if dark mode is active

```tsx
// Example usage
import { useTheme, useColors } from "@/theme";

function MyComponent() {
  const theme = useTheme();
  const colors = useColors();

  return (
    <View
      style={{
        padding: theme.spacing.md,
        backgroundColor: colors.background.default,
      }}
    >
      {/* Component content */}
    </View>
  );
}
```

## Component Library

### Core Components

Base components with theme integration:

- `ThemeView`: Themed replacement for View
- `ThemeText`: Themed replacement for Text
- `ThemeImage`: Themed replacement for Image
- `ThemeTouchable`: Themed replacement for TouchableOpacity
- `ThemeButton`: Configurable button component
- `ThemeInput`: Themed text input component

````tsx
// Example usage
import { ThemeView, ThemeText } from "@/components/core";

function MyComponent() {
  return (
    <ThemeView padded rounded elevation={2}>
      <ThemeText variant="manrope.h2">Hello World</ThemeText>
    </ThemeView>
  );
}



### Core Component API

#### ThemeView

A themed replacement for the standard View component.

```tsx
<ThemeView
  backgroundColor="string" // Optional custom background color
  elevation={0 - 5} // Optional shadow elevation (0-5)
  padded={true | "xs" | "sm" | "md" | "lg" | "xl"} // Optional padding
  margin={true | "xs" | "sm" | "md" | "lg" | "xl"} // Optional margin
  rounded={true | "sm" | "md" | "lg" | "full"} // Optional border radius
  centered={true | false} // Center children (both axes)
  row={true | false} // Use row direction
  style={StyleProp} // Optional additional styles
  {...ViewProps} // All standard View props
/>
````

#### ThemeText

A themed replacement for the standard Text component.

```tsx
<ThemeText
  variant="manrope.body1"|"manrope.h1"|"manrope.subtitle1"|"gascogneSerial.brandTitle" // See `theme/tokens/typography.ts` for the full list
  color="string" // Optional custom text color
  align="auto"|"left"|"right"|"center"|"justify" // Text alignment
  bold={true|false} // Make text bold
  italic={true|false} // Make text italic
  underline={true|false} // Add underline
  uppercase={true|false} // Transform to uppercase
  lowercase={true|false} // Transform to lowercase
  capitalize={true|false} // Capitalize first letter of each word
  style={StyleProp} // Optional additional styles
  {...TextProps} // All standard Text props
/>
```

#### ThemeButton

A configurable button component with various styles.

```tsx
<ThemeButton
  title="string" // Button text
  onPress={function} // Press handler
  variant="filled"|"outlined"|"text" // Button style variant
  size="sm"|"md"|"lg" // Button size
  color="primary"|"secondary"|"success"|"error"|"warning"|"info" // Button color
  disabled={true|false} // Disable button
  loading={true|false} // Show loading indicator
  fullWidth={true|false} // Take full width
  leftIcon={ReactNode} // Optional icon on the left
  rightIcon={ReactNode} // Optional icon on the right
  style={StyleProp} // Optional container styles
  textStyle={StyleProp} // Optional text styles
  uppercase={true|false} // Transform text to uppercase
/>
```

### UI Component Examples

#### Card

```tsx
<Card elevation={2} padded="md" rounded="md" contentStyle={{ gap: 16 }}>
  <ThemeText variant="manrope.h6">Card Title</ThemeText>
  <ThemeText>Card content goes here.</ThemeText>
</Card>
```

#### ArticleCard

```tsx
<ArticleCard
  item={{
    id: 1,
    title: "Article Title",
    source: "Source Name",
    readTime: 5,
    thumbnail: "https://example.com/image.jpg",
    favorite: true,
    tags: ["Technology", "Science"],
  }}
  onPress={() => console.log("Article pressed")}
  onMenuPress={() => console.log("Menu pressed")}
/>
```

#### FilterTabs

```tsx
<FilterTabs
  currentFilter="all"
  onFilterChange={(filter) => console.log("Filter changed:", filter)}
  options={[
    { id: "all", label: "All", icon: "list-outline" },
    { id: "favorites", label: "Favorites", icon: "star-outline" },
    { id: "tagged", label: "Tagged", icon: "pricetag-outline" },
  ]}
/>
```

## State Management

The app uses Zustand for client state with MMKV persistence, and TanStack React Query for data fetching/caching.

## Environment Configuration (.env + EAS)

This project is configured to read public (non‑secret) runtime configuration from `.env` and/or `expo.extra` via `app.config.ts`.

Public env vars (EXPO*PUBLIC*\*) are embedded in the app bundle and are suitable for non‑secrets only (e.g., API base URL). Do NOT put secrets in the client.

### Quick start

1. Create a `.env` file from the template:

```bash
cp .env.example .env
```

2. Edit `.env` values (example):

```env
EXPO_PUBLIC_API_BASE_URL=https://api.example.com
EXPO_PUBLIC_DEFAULT_TEAM_ID=team-123
EXPO_PUBLIC_DEMO_AUTH=false
```

3. Start Expo (restarts may be needed to pick up env):

```bash
npx expo start -c
```

### How it works

- `app.config.ts` loads `.env` using `dotenv/config` and merges values into `expo.extra` at build time.
- `utils/config.ts` reads config in this priority:
  1. `process.env.EXPO_PUBLIC_API_BASE_URL` (from `.env` / EAS env)
  2. `expo.extra.apiBaseUrl` (from `app.config.ts` or `app.json`)
  3. Fallback default: `https://api.taykie.com`

Other values:

- `EXPO_PUBLIC_DEFAULT_TEAM_ID` and `EXPO_PUBLIC_DEMO_AUTH` are also supported and read in `utils/config.ts`.

### EAS Build / CI

Set the same `EXPO_PUBLIC_*` variables in EAS so your CI builds receive the right config.

Using EAS Secrets:

```bash
eas secret:create --scope project --name EXPO_PUBLIC_API_BASE_URL --value https://api.example.com
eas secret:create --scope project --name EXPO_PUBLIC_DEFAULT_TEAM_ID --value team-123
eas secret:create --scope project --name EXPO_PUBLIC_DEMO_AUTH --value false
```

Or define env per build profile in `eas.json`:

```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_API_BASE_URL": "https://api.example.com",
        "EXPO_PUBLIC_DEFAULT_TEAM_ID": "team-123",
        "EXPO_PUBLIC_DEMO_AUTH": "false"
      }
    }
  }
}
```

### Notes

- Keep `app.json` committed. Use `.env` and `EAS Secrets`/`eas.json env` for environment‑specific values.
- If you set `apiBaseUrl` in `app.json > expo.extra`, it will be used as a fallback.
- Avoid placing secrets in any `EXPO_PUBLIC_*` variable — route sensitive operations through your backend.

### App Stores (Zustand)

- Auth Store: Authentication state, token, and user info (MMKV-persisted)
- Theme Store: Theme preference (light/dark/system) with system sync (MMKV-persisted)
- Team Store: Selected team across screens (MMKV-persisted)

### Data Fetching (React Query)

- Query Client configured in `app/_layout.tsx`
- Feature hooks under `hooks/queries/*` (e.g., vending, dashboard, billing, products)
- Server responses validated with Zod schemas in `services/api/schemas.ts`

### API Layer

- `services/api/client.ts`: Fetch wrapper with base URL, timeout, retries, 401 handling
- `services/api/endpoints.ts`: Central typed endpoints
- `services/repositories/*`: Feature repositories wrapping client + zod parsing

## Best Practices

### Component Design

- Props Interface: Define clear prop interfaces for each component
- Default Props: Provide sensible defaults
- Composition: Build complex components from simpler ones
- Memoization: Use React.memo() for expensive renders
- Hooks: Extract complex logic into custom hooks

### Styling

- Theme-First: Use the theme system for all styling
- Responsive Design: Support different screen sizes
- Consistent Spacing: Use the spacing scale
- Typography Scale: Use the typography variants
- Color System: Use the color tokens

### State Management

- Normalized State: Store entities in normalized form
- Selectors: Use selectors to access state
- Action Creators: Use typed action creators
- Immutability: Never mutate state directly
- Side Effects: Handle side effects in middleware or thunks

### Performance

- Virtualization: Use FlatList for long lists
- Lazy Loading: Load resources on demand
- Memoization: Memoize expensive calculations
- API Caching: Use RTK Query's caching
- Image Optimization: Use appropriate image sizes and formats

## Extending the System

### Adding New Components

1. Create a new file in the appropriate directory
2. Define the component's props interface
3. Implement the component using existing core components
4. Document the component's API
5. Export the component from the index file

### Adding New Theme Tokens

1. Extend the appropriate token file (colors.ts, typography.ts, etc.)
2. Update the Theme interface if necessary
3. Add the new tokens to both light and dark themes
