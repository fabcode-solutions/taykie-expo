module.exports = function (api) {
  api.cache(true);
  return {
    presets: [["babel-preset-expo", { jsxImportSource: "nativewind" }], "nativewind/babel"],
    plugins: [
      // Use only the worklets plugin for Reanimated v4
      "react-native-worklets/plugin", // Ensure this is last
    ],
  };
};
