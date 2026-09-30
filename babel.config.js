module.exports = function (api) {
  api.cache(true);
  return {
    presets: [["babel-preset-expo", { jsxImportSource: "nativewind" }]],
    plugins: [
      // Same plugins "nativewind/babel" (react-native-css-interop/babel) adds, MINUS the
      // "react-native-worklets/plugin" it hard-codes — that plugin is Reanimated 4 only,
      // and this project is on Reanimated 3.x (the version Expo SDK 53 supports).
      require("react-native-css-interop/dist/babel-plugin").default,
      [
        "@babel/plugin-transform-react-jsx",
        {
          runtime: "automatic",
          importSource: "react-native-css-interop",
        },
      ],
      // No Reanimated plugin here: babel-preset-expo adds "react-native-reanimated/plugin"
      // automatically when react-native-reanimated is installed.
    ],
  };
};
