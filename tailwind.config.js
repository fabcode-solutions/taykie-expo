/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.tsx", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        "GascogneSerial-Regular": ["GascogneSerial-Regular"],
        "Manrope": ["Manrope"],
        "Manrope-Regular": ["Manrope-Regular"],
        "Manrope-Medium": ["Manrope-Medium"],
        "Manrope-SemiBold": ["Manrope-SemiBold"],
        "Manrope-Bold": ["Manrope-Bold"],
        "Manrope-Light": ["Manrope-Light"],
        "Manrope-ExtraLight": ["Manrope-ExtraLight"],
        "Manrope-ExtraBold": ["Manrope-ExtraBold"],
      },
      colors: {
        primary: "#FFFA9C",
        triatry: {
          10: "#505050",
          20: "#B3B3B3",
        },
        slateCharcoal: {
          DEFAULT: "#262520",
          90: "#262520",
          80: "#262520CC", // 80% opacity
          70: "#262520B3", // 70% opacity
        },
        butteryYellow: {
          DEFAULT: "#FFF9AC",
          90: "#FFF9AC",
          80: "#FFF9ACCC",
          70: "#FFF9ACB3",
        },
        cloudWhite: {
          DEFAULT: "#F8F9F3",
          90: "#F8F9F3",
          80: "#F8F9F3CC",
          70: "#F8F9F3B3",
        },
        colorBeige: {
          DEFAULT: "#D5CCBD",
          90: "#D5CCBD",
          80: "#D5CCBDCC",
          70: "#D5CCBDB3",
        },
        taupe: {
          DEFAULT: "#B6A999",
          90: "#B6A999",
          80: "#B6A999CC",
          70: "#B6A999B3",
        },
        pureWhite: {
          DEFAULT: "#FFFFFF",
          90: "#FFFFFF",
          80: "#FFFFFFCC",
          70: "#FFFFFFB3",
        },
        eucalyptusHaze: {
          DEFAULT: "#E1ECE6",
          90: "#E1ECE6",
          80: "#E1ECE6CC",
          70: "#E1ECE6B3",
        },
        mistBlue: {
          DEFAULT: "#D6E3EB",
          90: "#D6E3EB",
          80: "#D6E3EBCC",
          70: "#D6E3EBB3",
        },
      },
    },
  },
  plugins: [],
};
