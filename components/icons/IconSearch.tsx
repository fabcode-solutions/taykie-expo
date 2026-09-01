import React from "react";
import Svg, { Path } from "react-native-svg";

const IconSearch = ({
  stroke = "#B3B3B3",
  width = 16,
  height = 16,
}: {
  stroke?: string;
  width?: number;
  height?: number;
}) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 16 16" fill="none">
      <Path
        d="M14 14L11.1067 11.1067"
        stroke={stroke || "#B3B3B3"}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M7.33333 12.6667C10.2789 12.6667 12.6667 10.2789 12.6667 7.33333C12.6667 4.38781 10.2789 2 7.33333 2C4.38781 2 2 4.38781 2 7.33333C2 10.2789 4.38781 12.6667 7.33333 12.6667Z"
        stroke={stroke || "#B3B3B3"}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

export default IconSearch;
