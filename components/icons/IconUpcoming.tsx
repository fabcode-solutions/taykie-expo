import React from "react";
import { ViewStyle } from "react-native";
import Svg, { Path } from "react-native-svg";
const IconUpcoming = ({
  stroke,
  className = "",
  style,
}: {
  stroke?: string;
  className?: string;
  style?: ViewStyle;
}) => {
  const w = typeof style?.width === "number" ? style.width : 24;
  const h = typeof style?.height === "number" ? style.height : 24;
  return (
    <Svg className={className} width={w} height={h} viewBox="0 0 20 20" fill="none" style={style}>
      <Path
        d="M4.16669 18.3333H15.8334"
        stroke={stroke ?? "#B6A999"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M4.16669 1.66666H15.8334"
        stroke={stroke ?? "#B6A999"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M14.1666 18.3333V14.8567C14.1666 14.4147 13.9909 13.9908 13.6783 13.6783L9.99998 10L6.32165 13.6783C6.00906 13.9908 5.83341 14.4147 5.83331 14.8567V18.3333"
        stroke={stroke ?? "#B6A999"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M5.83331 1.66666V5.14333C5.83341 5.58532 6.00906 6.00918 6.32165 6.32166L9.99998 10L13.6783 6.32166C13.9909 6.00918 14.1666 5.58532 14.1666 5.14333V1.66666"
        stroke={stroke ?? "#B6A999"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

export default IconUpcoming;
