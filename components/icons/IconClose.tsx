import React from "react";
import Svg, { Path } from "react-native-svg";
const IconClose = ({
  stroke,

  className = "",
}: {
  stroke?: string;

  className?: string;
}) => {
  return (
    <Svg width="20" height="20" className={className ?? ""} viewBox="0 0 20 20" fill="none">
      <Path
        d="M15 5L5 15"
        stroke={stroke ?? "#262520"}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M5 5L15 15"
        stroke={stroke ?? "#262520"}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

export default IconClose;
