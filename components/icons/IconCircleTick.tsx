import React from "react";
import { ViewStyle } from "react-native";
import Svg, { Path } from "react-native-svg";
const IconCircleTick = ({
  stroke,
  fill,
  className = "",
  style,
}: {
  stroke?: string;
  fill?: string;
  className?: string;
  style?: ViewStyle;
}) => {
  return (
    <Svg viewBox="0 0 24 24" className={className} fill="none" style={style}>
      <Path
        d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
        fill={fill ?? "#B6A999"}
      />
      <Path
        d="M9 12L11 14L15 10"
        stroke={stroke ?? "white"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

export default IconCircleTick;
