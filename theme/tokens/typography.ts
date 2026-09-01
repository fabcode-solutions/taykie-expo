import { TextStyle } from "react-native";

export const fontFamily = {
  manrope: {
    variable: "Manrope",
    light: "Manrope-Light",
    ExtraLight: "Manrope-ExtraLight",
    ExtraBold: "Manrope-ExtraBold",
    regular: "Manrope-Regular", // 400
    medium: "Manrope-Medium", // 500
    semiBold: "Manrope-SemiBold", // 600
    bold: "Manrope-Bold", // 700
  },
  gascogneSerial: {
    regular: "GascogneSerial-Regular",
  },
} as const;

export type FontSet = keyof typeof fontFamily;

export type FontWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;

interface ExtendedTextStyle extends TextStyle {}

export const getManropeStyle = (
  weight: FontWeight = 400,
  italic: boolean = false,
): ExtendedTextStyle => {
  // Map weight to specific font family for proper rendering on iOS/Android
  // React Native doesn't support variable fonts with fontWeight properly
  let specificFontFamily: string;

  switch (weight) {
    case 200:
      specificFontFamily = fontFamily.manrope.ExtraLight;
      break;
    case 300:
      specificFontFamily = fontFamily.manrope.light;
      break;
    case 500:
      specificFontFamily = fontFamily.manrope.medium;
      break;
    case 600:
      specificFontFamily = fontFamily.manrope.semiBold;
      break;
    case 700:
      specificFontFamily = fontFamily.manrope.bold;
      break;
    case 800:
      specificFontFamily = fontFamily.manrope.ExtraBold;
      break;
    case 400:
    default:
      specificFontFamily = fontFamily.manrope.regular;
      break;
  }

  const style: ExtendedTextStyle = {
    fontFamily: specificFontFamily,
    fontWeight: weight, // Keep this for web compatibility
  };

  if (italic) {
    style.fontStyle = "italic";
  }

  return style;
};

export const getGascogneSerialStyle = (
  weight: FontWeight = 400,
  _italic: boolean = false,
): ExtendedTextStyle => {
  return {
    fontFamily: fontFamily.gascogneSerial.regular,
    fontWeight: weight,
  };
};

export const createTextStyle = (
  size: number,
  lineHeight: number,
  weight: FontWeight = 400,
  letterSpacing: number = 0,
  italic: boolean = false,
  fontSet: FontSet = "manrope",
): ExtendedTextStyle => {
  const style: ExtendedTextStyle = {
    fontSize: size,
    lineHeight,
    letterSpacing,
    includeFontPadding: false,
  };

  switch (fontSet) {
    case "gascogneSerial":
      Object.assign(style, getGascogneSerialStyle(weight, italic));
      break;
    case "manrope":
    default:
      Object.assign(style, getManropeStyle(weight, italic));
      break;
  }

  return style;
};

export const createManropeStyle = (
  size: number,
  lineHeight: number,
  weight: FontWeight = 400,
  letterSpacing: number = 0,
  italic: boolean = false,
): ExtendedTextStyle => {
  return createTextStyle(size, lineHeight, weight, letterSpacing, italic, "manrope");
};

export const createGascogneSerialStyle = (
  size: number,
  lineHeight: number,
  weight: FontWeight = 400,
  letterSpacing: number = 0,
  italic: boolean = false,
): ExtendedTextStyle => {
  return createTextStyle(size, lineHeight, weight, letterSpacing, italic, "gascogneSerial");
};

const manropeTypography = {
  h1: createManropeStyle(40, 36, 400 as FontWeight),
  h2: createManropeStyle(30, 38, 700 as FontWeight),
  h3: createManropeStyle(24, 30, 400 as FontWeight),
  h4: createManropeStyle(22, 28, 600 as FontWeight),
  h5: createManropeStyle(20, 25, 600 as FontWeight),
  h6: createManropeStyle(18, 23, 600 as FontWeight),
  body1: createManropeStyle(20, 32, 400 as FontWeight),
  body2: createManropeStyle(14, 21, 400 as FontWeight),
  body1Bold: createManropeStyle(16, 24, 700 as FontWeight),
  body2Bold: createManropeStyle(14, 21, 700 as FontWeight),
  subtitle: createManropeStyle(16, 24, 400 as FontWeight),
  subtitle2: createManropeStyle(20, 23, 500 as FontWeight),
  caption: createManropeStyle(14, 18, 400 as FontWeight),
  overline: createManropeStyle(10, 13, 500 as FontWeight),
  body: createManropeStyle(16, 22, 500 as FontWeight),
  brandBody: createManropeStyle(16, 22, 400 as FontWeight),
  button: createManropeStyle(14, 20, 400 as FontWeight),
  button_small: createManropeStyle(12, 17, 600 as FontWeight),
  button_medium: createManropeStyle(14, 20, 600 as FontWeight),
  button_large: createManropeStyle(16, 22, 600 as FontWeight),
  button_xl: createManropeStyle(16, 22, 500 as FontWeight),
} as const;

const gascogneSerialTypography = {
  title: createGascogneSerialStyle(40, 38, 400 as FontWeight),
  h2: createGascogneSerialStyle(24, 32, 400 as FontWeight),
  button: createGascogneSerialStyle(20, 20, 400 as FontWeight),
  link: createGascogneSerialStyle(16, 18, 400 as FontWeight),
} as const;

export const typography = {
  manrope: manropeTypography,
  gs: gascogneSerialTypography,
} as const;

export type TypographyDefinition = typeof typography;
