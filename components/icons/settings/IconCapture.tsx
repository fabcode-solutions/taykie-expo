import React from "react";
import { Svg, G, Path, Defs, ClipPath, Rect } from "react-native-svg";

const IconCapture = ({ color = "#B3B3B3", size = 24, ...props }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <G clipPath="url(#clip0_capture)">
        <Path
          d="M1.5 6.16666V3.83333C1.5 2.55 2.55 1.5 3.83333 1.5H6.16666"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M17.834 1.5H20.1674C21.4507 1.5 22.5007 2.55 22.5007 3.83333V6.16666"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M22.5007 17.833V20.1663C22.5007 21.4497 21.4507 22.4997 20.1674 22.4997H17.834"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M6.16666 22.4997H3.83333C2.55 22.4997 1.5 21.4497 1.5 20.1663V17.833"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M13.166 6.167H7.33268C6.68835 6.167 6.16602 6.68933 6.16602 7.33366V10.8337C6.16602 11.478 6.68835 12.0003 7.33268 12.0003H13.166C13.8103 12.0003 14.3327 11.478 14.3327 10.8337V7.33366C14.3327 6.68933 13.8103 6.167 13.166 6.167Z"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M16.666 12H10.8327C10.1884 12 9.66724 12.5223 9.66724 13.1667V16.6667C9.66724 17.311 10.1884 17.8333 10.8327 17.8333H16.666C17.3103 17.8333 17.8316 17.311 17.8316 16.6667V13.1667C17.8316 12.5223 17.3103 12 16.666 12Z"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </G>
      <Defs>
        <ClipPath id="clip0_capture">
          <Rect width="24" height="24" fill="white" />
        </ClipPath>
      </Defs>
    </Svg>
  );
};

export default IconCapture;
