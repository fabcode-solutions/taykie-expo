import React from "react";
import Svg, { Path } from "react-native-svg";

const IconPoll = () => {
  return (
    <Svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <Path
        d="M2.25 3.75L2.25 14.25C2.25 15.0784 2.92157 15.75 3.75 15.75L14.25 15.75C15.0784 15.75 15.75 15.0784 15.75 14.25L15.75 3.75C15.75 2.92157 15.0784 2.25 14.25 2.25L3.75 2.25C2.92157 2.25 2.25 2.92157 2.25 3.75Z"
        stroke="#B6A999"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M5.25 12L10.5 12" stroke="#B6A999" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M5.25 9L8.25 9" stroke="#B6A999" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M5.25 6L12 6" stroke="#B6A999" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
};

export default IconPoll;
