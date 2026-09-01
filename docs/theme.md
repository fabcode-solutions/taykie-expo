# Taykie App Theming Guidelines

This document provides guidelines and best practices for using the theming and styling system in the Taykie app. Adhering to these guidelines will help maintain a consistent look and feel, improve code readability, and make collaboration easier.

## Table of Contents

1.  [Overview of the Theming System](#overview-of-the-theming-system)
2.  [Using the Theme](#using-the-theme)
    - [Accessing Theme Properties](#accessing-theme-properties)
    - [Core Themed Components](#core-themed-components)
      - [`ThemeView`](#themeview)
      - [`ThemeText`](#themetext)
      - [`ThemeTouchable`](#themetouchable)
      - [`ThemeImage`](#themeimage)
      - [Other Core Components (e.g., `ThemeButton`, `ThemeInput`)](#other-core-components)
    - [Applying Colors](#applying-colors)
    - [Using Typography](#using-typography)
    - [Using Spacing](#using-spacing)
    - [Applying Shadows (Elevation)](#applying-shadows-elevation)
3.  [Styling Best Practices](#styling-best-practices)
    - [Theme Styles vs. Local Styles](#theme-styles-vs-local-styles)
    - [Naming Conventions](#naming-conventions)
    - [Platform-Specific Styles](#platform-specific-styles)
4.  [Extending the Theme (For System Maintainers)](#extending-the-theme)
    - [Adding Colors](#adding-colors)
    - [Adding Typography Variants](#adding-typography-variants)
    - [Adding Spacing Units](#adding-spacing-units)
5.  [Examples](#examples)

## 1. Overview of the Theming System

- **Key Files and Structure**:
  - `theme/theme.ts`: Defines the `Theme` interface, `lightTheme`, `darkTheme` objects, and `createTheme` function.
  - `theme/tokens/`: Contains definitions for `colors.ts`, `typography.ts`, `spacing.ts`, `shadows.ts`.
  - `theme/ThemeProvider.tsx`: Provides the theme to the component tree via React Context. Integrates with Redux for theme preference management (light, dark, system).
  - `theme/hooks.ts`: Includes `useTheme()` to access theme properties, `useDarkMode()`, `useTextColor()`, etc.
  - `components/core/`: Contains `ThemeView.tsx`, `ThemeText.tsx`, etc.
- **Theme Switching**: Handled by `ThemeProvider`, respects user preference (light/dark) and system settings.

## 2. Using the Theme

This section details how to consume theme values and leverage the core themed components to build UIs consistently.

### Accessing Theme Properties

The primary way to access the current theme object within your components is by using the `useTheme()` hook:

```tsx
import { useTheme } from "@/theme"; // or "@/theme/hooks"

const MyComponent = () => {
  const theme = useTheme();

  // Now you can access theme properties:
  // theme.colors.primary.main
  // theme.typography.manrope.h1
  // theme.spacing.md
  // theme.shadows[2]
  // theme.mode ('light' or 'dark')

  return (
    <View style={{ backgroundColor: theme.colors.background.default, padding: theme.spacing.md }}>
      <Text style={{ ...theme.typography.manrope.body1, color: theme.colors.text.primary }}>
        Hello Themed World!
      </Text>
    </View>
  );
};
```

Key properties available on the `theme` object:

- `mode`: Current theme mode (`'light'` or `'dark'`).
- `colors`: The color palette. (See [Applying Colors](#applying-colors))
- `typography`: Collection of predefined text styles. (See [Using Typography](#using-typography))
- `spacing`: Predefined spacing units. (See [Using Spacing](#using-spacing))
- `shadows`: Predefined shadow styles. (See [Applying Shadows (Elevation)](#applying-shadows-elevation))

### Core Themed Components

To simplify development and ensure consistency, the app provides several core "Theme" components. These components are pre-styled according to the current theme and offer convenient props for common styling adjustments. **It is highly recommended to use these components whenever possible.**

#### `ThemeView`

`<ThemeView>` is a themed wrapper around the standard React Native `<View>` component. It's used for creating layouts and containers.

**Key Props:**

- `backgroundColor?: string`: Sets the background color.
  - _Suggestion for future enhancement_: Consider adding a `bg?: keyof Theme['colors']['background'] | ...` prop for semantic background colors like `bg="paper"`.
- `elevation?: 0 | 1 | 2 | 3 | 4 | 5`: Applies a predefined shadow style from `theme.shadows`. Defaults to `0` (no shadow).
- `padded?: boolean | "xs" | "sm" | "md" | "lg" | "xl"`: Adds padding using `theme.spacing` values.
  - `true`: applies `theme.spacing.md`.
  - `"sm"`: applies `theme.spacing.sm`, etc.
- `margin?: boolean | "xs" | "sm" | "md" | "lg" | "xl"`: Adds margin using `theme.spacing` values.
  - `true`: applies `theme.spacing.md`.
- `rounded?: boolean | "sm" | "md" | "lg" | "full"`: Applies border radius using `theme.spacing` values or `9999` for `"full"`.
  - `true`: applies `theme.spacing.sm`.
- `centered?: boolean`: If `true`, applies `justifyContent: "center"` and `alignItems: "center"`.
- `row?: boolean`: If `true`, applies `flexDirection: "row"`.
- `style`: Standard React Native style prop for additional custom styling.

**Example:**

```tsx
import { ThemeView, ThemeText } from "@/components/core";

const MyCard = () => (
  <ThemeView padded="lg" rounded="md" elevation={2} style={{ width: 200 }}>
    <ThemeText variant="manrope.h6">Card Title</ThemeText>
    <ThemeText>Some card content.</ThemeText>
  </ThemeView>
);
```

#### `ThemeText`

`<ThemeText>` is a themed wrapper around `<Text>` for displaying text.

**Key Props:**

- `variant?: TextVariant`: Applies a predefined typography style from `theme.typography` (e.g., `"h1"`, `"body1"`, `"caption"`). Defaults to `"body1"`.
- `color?: string`: Sets the text color. If not provided, it defaults to `theme.colors.text.primary` (via the `useTextColor()` hook).
- `align?: "auto" | "left" | "right" | "center" | "justify"`: Sets `textAlign`.
- `fontWeight?: FontWeight`: Allows setting a specific numeric font weight (e.g., `300`, `400`, `700`). This is useful for one-off adjustments if a suitable predefined variant doesn't exist. For common bold styling, prefer using variants like `"body1Bold"` or `"h7"` (which is now bold by default).
- `italic?: boolean`: Applies `fontStyle: "italic"`. This is applied if the chosen variant doesn't already specify an italic font family.
- `underline?: boolean`: Applies `textDecorationLine: "underline"`.
- `uppercase?: boolean`, `lowercase?: boolean`, `capitalize?: boolean`: Text transformation.
- `numberOfLines?: number`: Standard prop.
- `style`: Standard React Native style prop.

**Example:**

```tsx
import { ThemeText } from "@/components/core";

const MyMessage = () => (
  <ThemeText variant="manrope.subtitle1" color={theme.colors.secondary.main}>
    Important message!
  </ThemeText>
);
```

#### `ThemeTouchable`

`<ThemeTouchable>` is a themed `TouchableOpacity` for interactive elements.

**Key Props:**

- Inherits props from `ThemeView` for layout and appearance (`backgroundColor`, `elevation`, `padded`, `margin`, `rounded`, `centered`, `row`).
- `backgroundColor` defaults to `theme.colors.background.paper` if not specified.
- `activeOpacity?: number`: Standard `TouchableOpacity` prop (defaults to `0.7`).
- `style`: Standard React Native style prop.

**Example:**

```tsx
import { ThemeTouchable, ThemeText } from "@/components/core";
import { useTheme } from "@/theme";

const MyButton = ({ onPress }) => {
  const theme = useTheme();
  return (
    <ThemeTouchable
      onPress={onPress}
      padded="md"
      rounded="lg"
      backgroundColor={theme.colors.primary.main} // Example: explicit background
      centered
    >
      <ThemeText variant="manrope.button" color={theme.colors.primary.contrast}>
        Press Me
      </ThemeText>
    </ThemeTouchable>
  );
};
```

#### `ThemeImage`

`<ThemeImage>` is a themed `<Image>` component.

**Key Props:**

- `source: number | { uri: string }`: Standard image source.
- `size?: number | "xs" | "sm" | "md" | "lg" | "xl" | "fill"`: Sets image dimensions.
  - Numeric value sets both width and height.
  - String keys map to `theme.spacing` values (e.g., `"xs"` (24px), `"sm"` (32px), `"md"` (48px), `"lg"` (64px), `"xl"` (96px)).
  - `"fill"` sets width and height to `"100%"`.
- `rounded?: boolean | "sm" | "md" | "lg" | "full"`: Applies border radius.
- `circle?: boolean`: If `true`, makes the image circular (overrides `rounded`).
- `margin?: boolean | "xs" | "sm" | "md" | "lg" | "xl"`: Adds margin.
- `style`: Standard React Native style prop.

**Example:**

```tsx
import { ThemeImage } from "@/components/core";

const MyAvatar = ({ imageUrl }) => <ThemeImage source={{ uri: imageUrl }} size="md" circle />;
```

#### Other Core Components (e.g., `ThemeButton`, `ThemeInput`)

_(This section would be filled in if dedicated `ThemeButton` or `ThemeInput` components with specific variants and styles exist beyond what `ThemeTouchable` or a manually styled input offers. For now, assuming they might be composed or styled more ad-hoc, but if they exist, they'd be documented here.)_

For example, if a `ThemeButton` component exists:

```tsx
// Hypothetical ThemeButton example
// <ThemeButton variant="primary" size="large" onPress={...}>Submit</ThemeButton>
```

Next sections will cover [Applying Colors](#applying-colors), [Using Typography](#using-typography), etc. in more detail.

### Applying Colors

The theme provides a comprehensive color palette accessible via `theme.colors`. These colors are defined for both light and dark modes.

**Key Principles:**

- **Use Semantic Colors**: Prefer semantic color names (e.g., `theme.colors.text.primary`, `theme.colors.background.default`, `theme.colors.primary.main`) over hardcoding hex values. This ensures your UI adapts correctly to theme changes (like dark mode) and makes the intent of the color clear.
- **`ThemeText` Default Color**: `<ThemeText>` defaults to `theme.colors.text.primary` if no `color` prop is specified. This should be the most common text color.
- **`ThemeTouchable` Default Background**: `<ThemeTouchable>` defaults its `backgroundColor` to `theme.colors.background.paper`.
- **Explicit vs. Implicit Theming**: Core themed components often handle color selection implicitly. When styling manually or passing colors to props like `backgroundColor` on `<ThemeView>`, always use `theme.colors`.

**Example: Semantic Colors**

```tsx
import { useTheme } from "@/theme";
import { ThemeView, ThemeText } from "@/components/core";

const MyComponent = () => {
  const theme = useTheme();

  return (
    <ThemeView style={{ backgroundColor: theme.colors.background.elevated }} padded="md">
      <ThemeText variant="manrope.h5" color={theme.colors.text.primary}>
        Section Title
      </ThemeText>
      <ThemeText color={theme.colors.text.secondary}>This text is less prominent.</ThemeText>
      <View
        style={{
          height: 1,
          backgroundColor: theme.colors.divider,
          marginVertical: theme.spacing.sm,
        }}
      />
      <ThemeText color={theme.colors.primary.main}>
        This text uses the primary brand color.
      </ThemeText>
    </ThemeView>
  );
};
```

**Color Palette Structure (`theme.colors`):**

- `primary`: Main brand color (main, light, dark, contrast).
- `secondary`: Secondary brand color.
- `success`, `info`, `warning`, `error`: Feedback colors.
- `gray`: Scale of gray colors.
- `text`: For text content (`primary`, `secondary`, `secondary2`, `disabled`, `hint`, `dark`, `subtle`).
  - _Note on `text.dark` vs `text.primary`_: Historically, `text.dark` was used in some light mode contexts for a darker shade than `text.primary`. The goal is to rely on `text.primary` as the main text color for the current mode. If a stronger emphasis is needed, consider if `text.primary`'s definition itself needs adjustment for light mode, or if a new semantic variant like `text.emphasis` is required.
- `background`: For view backgrounds (`default`, `paper`, `elevated`).
- `special`: `favorite`, `divider`, `backdrop`, `white`, `black`, `transparent`.
- `semantic`: `inputBackground`, `icon`, `activityIndicator`, `border`.

### Using Typography

The theme defines a set of typographic styles in `theme.typography`. These should be your primary way of styling text to maintain consistency in font sizes, weights, and line heights.

**Key Principles:**

- **Use Variants with `ThemeText`**: The easiest way to apply typography is via the `variant` prop on the `<ThemeText>` component.
  - Example: `<ThemeText variant="manrope.h1">Title</ThemeText>`
- **Available Variants**: `h1-h8`, `body1`, `body2`, `body1Bold`, `body2Bold`, `subtitle1`, `subtitle2`, `caption`, `caption2`, `overline`, `tagStyle`, `meta`, `meta2`, `guide`, `button`, `button_small`, `button_medium`, `button_large`, and `reader` specific styles.
- **Font Weights & Variable Fonts**: The app uses Manrope (variable) for sans-serif copy and Gascogne Serial for brand display text. Variants are defined with specific numeric font weights (e.g., `400` for regular, `600` for semi-bold, `700` for bold).
  - To apply a bold style, prefer using a variant designed for boldness (e.g., `body1Bold`, `h7`).
  - For other specific weight adjustments not covered by a variant, use the `fontWeight` prop on `<ThemeText>` (e.g., `<ThemeText fontWeight={600}>Semi-bold text</ThemeText>`).
  - Avoid overriding `fontFamily` or `fontWeight` directly in `StyleSheet.create` unless creating a new, very specific text utility. Stick to the predefined variants and the `fontWeight` prop on `ThemeText`.
- **Line Heights**: Variants include predefined line heights suitable for their font size.

**Example: Applying Typography Variants**

```tsx
import { ThemeText, ThemeView } from "@/components/core";

const ArticleHeader = ({ title, subtitle }) => (
  <ThemeView>
    <ThemeText variant="manrope.h3">{title}</ThemeText>
    <ThemeText
      variant="manrope.subtitle1"
      color={theme.colors.text.secondary}
      style={{ marginTop: theme.spacing.xs }}
    >
      {subtitle}
    </ThemeText>
  </ThemeView>
);
```

### Using Spacing

The theme provides a consistent spacing scale in `theme.spacing` based on a 4px grid unit. Using these predefined spacing units is crucial for maintaining visual rhythm and consistency across the app.

**Key Principles:**

- **Apply via Core Component Props**: `<ThemeView>`, `<ThemeTouchable>`, and `<ThemeImage>` have `padded` and `margin` props that accept spacing keys.
  - Example: `<ThemeView padded="md" margin="sm">...</ThemeView>`
- **Use in `StyleSheet.create`**: When creating custom styles, use `theme.spacing` values for `padding`, `margin`, `width`, `height`, `gap`, etc.
  - Example: `padding: theme.spacing.lg`
- **Available Spacing Keys**: `xxs` (2px), `xs` (4px), `sm` (8px), `md` (16px), `lg` (24px), `xl` (32px), `xxl` (48px), `xxxl` (64px).
- `unit`: Base unit (4px). The `get: (multiplier: number) => multiplier * 4` function exists but prefer named keys for consistency.
- **Avoid Hardcoded Pixel Values**: Do not use hardcoded pixel values for spacing (e.g., `padding: 10`). Always use the theme's spacing scale.

**Example: Using Theme Spacing**

```tsx
import { useTheme } from "@/theme";
import { ThemeView, ThemeText } from "@/components/core";
import { StyleSheet } from "react-native";

const MyPaddedComponent = () => {
  const theme = useTheme();

  const localStyles = StyleSheet.create({
    customBox: {
      marginTop: theme.spacing.lg, // Use theme spacing
      paddingHorizontal: theme.spacing.md,
      height: theme.spacing.xxl, // Can be used for dimensions too
      gap: theme.spacing.sm, // For flexbox gap
    },
  });

  return (
    <ThemeView padded="xl">
      <ThemeText>This view has XL padding from ThemeView prop.</ThemeText>
      <ThemeView style={localStyles.customBox}>
        <ThemeText>This view uses custom styles with theme spacing.</ThemeText>
      </ThemeView>
    </ThemeView>
  );
};
```

### Applying Shadows (Elevation)

The theme defines a set of shadow styles accessible via `theme.shadows`. These are mapped to elevation levels from 0 to 5.

**Key Principles:**

- **Apply with `ThemeView`/`ThemeTouchable`**: The easiest way is to use the `elevation` prop on `<ThemeView>` or `<ThemeTouchable>`.
  - Example: `<ThemeView elevation={2}>...</ThemeView>`
- **Shadows are Platform-Specific**: The `createShadow` utility in `theme/tokens/shadows.ts` handles iOS (`shadowColor`, `shadowOffset`, etc.) and Android (`elevation`) differences. Dark mode shadows are also subtly different.
- **Elevation Scale**: `0` (no shadow), `1` (subtle) to `5` (prominent).
- **Manual Application**: If needed, you can spread a shadow style directly: `style={{ ...theme.shadows[3] }}`.

**Example: Applying Elevation**

```tsx
import { ThemeView, ThemeText } from "@/components/core";

const ElevatedCard = () => (
  <ThemeView elevation={3} padded="md" rounded="lg" margin="md">
    <ThemeText variant="manrope.h6">I have a shadow!</ThemeText>
  </ThemeView>
);
```

## 3. Styling Best Practices

Adhering to these best practices will help keep the codebase clean, maintainable, and visually consistent.

### Theme Styles vs. Local Styles (`StyleSheet.create`)

- **Prioritize Theme System**: Always try to achieve the desired styling using the theme system first:
  - Use Core Themed Components (`<ThemeView>`, `<ThemeText>`, etc.) and their props.
  - Access theme properties (`theme.colors`, `theme.typography`, `theme.spacing`) directly for props on standard components or within `StyleSheet.create`.
- **When to Use `StyleSheet.create`**: Use `StyleSheet.create` for styles that are:
  - **Component-Specific**: Layouts or styles unique to a particular component that are not covered by core component props or simple theme property applications.
  - **Complex**: More involved style combinations, e.g., specific flexbox arrangements for a component's internal structure.
  - **Performance**: `StyleSheet.create` optimizes styles by sending them to the native side only once.
- **Combining with Theme**: Even within `StyleSheet.create`, always use theme tokens for colors, spacing, fonts, etc., rather than hardcoding values.

  ```tsx
  // Good: Using theme tokens within StyleSheet.create
  const styles = StyleSheet.create({
    container: {
      backgroundColor: theme.colors.background.paper,
      padding: theme.spacing.md,
      borderRadius: theme.spacing.sm,
    },
    title: {
      ...theme.typography.manrope.h5,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.sm,
    },
  });
  ```

- **Avoid Inline Styles for Complex Objects**: For simple, dynamic styles (e.g., a single `backgroundColor` based on a prop), inline styles can be acceptable. However, for larger style objects, prefer `StyleSheet.create` or memoized style computations. The core themed components already handle memoization for their prop-derived styles.

### Naming Conventions

- **Local Styles**: When using `StyleSheet.create` within a component file, use clear, descriptive names for your style keys (e.g., `container`, `titleText`, `iconWrapper`, `profileImage`).
- **File Names**: Component files should be PascalCase (e.g., `ArticleCard.tsx`). Style-specific hooks or utilities (if any) should also follow clear naming (e.g., `useArticleCardStyles.ts`).

### Platform-Specific Styles

- **Theme Abstraction**: The theme system (e.g., `shadows.ts`) already abstracts some platform differences. Font selection in `typography.ts` also considers the platform for `fontVariationSettings`.
- **`Platform.select()`**: For minor, one-off platform differences not covered by the theme, use React Native's `Platform.select()` API within your `StyleSheet.create` definitions or style objects.

  ```tsx
  const styles = StyleSheet.create({
    button: {
      paddingVertical: Platform.OS === "ios" ? theme.spacing.sm : theme.spacing.md,
      // ... other styles
    },
    header: {
      ...Platform.select({
        ios: {
          paddingTop: theme.spacing.lg,
          height: 60 + theme.spacing.lg,
        },
        android: {
          paddingTop: theme.spacing.md,
          height: 50 + theme.spacing.md,
        },
      }),
    },
  });
  ```

- **Avoid Excessive Platform Logic**: If you find yourself writing a lot of `Platform.select()` for a particular component, consider if this logic can be encapsulated in a reusable utility or if a core theme component/token could be adapted.

## 4. Extending the Theme (For System Maintainers)

This section is for developers responsible for maintaining and evolving the core theme system. Modifications here should be done with care as they can have wide-ranging effects.

- **Location of Tokens**: All core tokens are defined in `theme/tokens/` (`colors.ts`, `typography.ts`, `spacing.ts`, `shadows.ts`).
- **Adding Colors**:
  1.  Define the new color in `ColorPalette` interface in `colors.ts`.
  2.  Add its values to `lightColors` and `darkColors` objects in `colors.ts`.
  3.  Ensure the color name is semantic and its purpose is clear.
- **Adding Typography Variants**:
  1.  Define the new variant in `theme/tokens/typography.ts` using `createManropeStyle` or `createGascogneSerialStyle`.
  2.  Add the variant key to the `TextVariant` type in `components/core/ThemeText.tsx` if it's intended for use with `<ThemeText>`.
  3.  Consider its semantic meaning and if it overlaps with existing variants.
- **Adding Spacing Units**:
  1.  Add the new key-value pair to the `spacing` object in `theme/tokens/spacing.ts`.
  2.  Ensure it fits the 4px grid system or has a clear rationale if it deviates.
  3.  Update related types if necessary (e.g., in `ThemeViewProps` for `padded`/`margin` props if new keys are added).
- **Testing**: Thoroughly test any theme changes across different components and in both light and dark modes.

## 5. Examples

This section will showcase practical examples of building common UI elements using the theme system. _(This can be expanded over time with more complex examples as needed.)_

**Example 1: Simple Profile Badge**

```tsx
import { ThemeView, ThemeText, ThemeImage } from "@/components/core";
import { useTheme } from "@/theme";

const ProfileBadge = ({ user }) => {
  const theme = useTheme();
  return (
    <ThemeView
      row
      centered
      style={{ alignItems: "center" }}
      padded="sm"
      rounded="full"
      backgroundColor={theme.colors.background.paper}
      elevation={1}
    >
      <ThemeImage
        source={{ uri: user.avatarUrl }}
        size="sm"
        circle
        margin={{ right: theme.spacing.sm }}
      />
      <ThemeText variant="manrope.body1Bold">{user.name}</ThemeText>
    </ThemeView>
  );
};
```

**Example 2: Action Button with Icon**

```tsx
import { ThemeTouchable, ThemeText, SvgIcon } from "@/components/core"; // Assuming SvgIcon is available
import { useTheme } from "@/theme";
import { StyleSheet } from "react-native";

const ActionButton = ({ onPress, label, iconName }) => {
  const theme = useTheme();
  return (
    <ThemeTouchable
      onPress={onPress}
      row
      centered
      padded="md"
      rounded="lg"
      backgroundColor={theme.colors.primary.main}
      style={styles.buttonContainer}
    >
      {iconName && (
        <SvgIcon
          name={iconName}
          color={theme.colors.primary.contrast}
          size={20}
          style={{ marginRight: theme.spacing.sm }}
        />
      )}
      <ThemeText variant="manrope.button" color={theme.colors.primary.contrast}>
        {label}
      </ThemeText>
    </ThemeTouchable>
  );
};

const styles = StyleSheet.create({
  buttonContainer: {
    // Additional specific styles if needed, e.g., minWidth
    minWidth: 120,
    justifyContent: "center",
  },
});
```

This concludes the initial version of the theming guidelines.
