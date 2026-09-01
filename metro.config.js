const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const { wrapWithReanimatedMetroConfig } = require("react-native-reanimated/metro-config"); // For Reanimated v4

// Get the default Expo Metro configuration
let config = getDefaultConfig(__dirname);

// Apply NativeWind configuration
config = withNativeWind(config, {
  input: "./global.css", // Path to your CSS file
});

// Apply Reanimated v4 configuration last
module.exports = wrapWithReanimatedMetroConfig(config);
