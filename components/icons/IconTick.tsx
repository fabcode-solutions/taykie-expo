import React from "react";
import Svg, { Path } from "react-native-svg";

const IconTick = ({ width = 30, height = 30 }: { width?: number; height?: number }) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 30 30" fill="none">
      <Path
        d="M25 7.5L11.25 21.25L5 15"
        stroke="#262520"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

export default IconTick;
