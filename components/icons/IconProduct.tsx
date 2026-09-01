import React from "react";
import { ViewStyle } from "react-native";
import Svg, { Path } from "react-native-svg";
const IconProduct = ({
  fill,
  className = "",
  style,
  color = "#FFFA9C",
}: {
  fill?: string;
  className?: string;
  style?: ViewStyle;
  color?: string;
}) => {
  return (
    <Svg
      style={style}
      className={className}
      width={"10"}
      height={"12"}
      viewBox="0 0 10 12"
      fill="none"
    >
      <Path
        d="M8.125 1.8V3C8.62228 3 9.09919 3.18964 9.45083 3.52721C9.80246 3.86477 10 4.32261 10 4.8V11.4C10 11.5591 9.93415 11.7117 9.81694 11.8243C9.69973 11.9368 9.54076 12 9.375 12H0.625C0.45924 12 0.300269 11.9368 0.183058 11.8243C0.0658481 11.7117 0 11.5591 0 11.4V4.8C0 4.32261 0.197544 3.86477 0.549175 3.52721C0.900806 3.18964 1.37772 3 1.875 3V1.8H8.125ZM5.625 5.4H4.375V6.6H3.125V7.8H4.37437L4.375 9H5.625L5.62437 7.8H6.875V6.6H5.625V5.4ZM9.375 0V1.2H0.625V0H9.375Z"
        fill={fill ?? color}
      />
    </Svg>
  );
};

export default IconProduct;
