import React from "react";
import Svg, { Path } from "react-native-svg";

const IconBookmarked = ({
  filled,
  color = "#B3B3B3",
  size = 12,
}: {
  filled?: boolean;
  color?: string;
  size?: number;
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      {filled && <Path d="M2.5 2H9.5V10L6 8L2.5 10V2Z" fill={color} />}
      <Path
        d="M9.5 10.5L6 8.5L2.5 10.5V2.5C2.5 2.23478 2.60536 1.98043 2.79289 1.79289C2.98043 1.60536 3.23478 1.5 3.5 1.5H8.5C8.76522 1.5 9.01957 1.60536 9.20711 1.79289C9.39464 1.98043 9.5 2.23478 9.5 2.5V10.5Z"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

export default IconBookmarked;
