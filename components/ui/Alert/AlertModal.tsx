import React from "react";
import { Text, View } from "react-native";
import BlurModal from "../Modal";
import IconTick from "@/components/icons/IconTick";
import Svg, { Path } from "react-native-svg";
import Button from "../button/Button";
import { t } from "i18next";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
export interface AlertModalProps {
  variant?: "success" | "error";
  heading: string;
  content?: string;
  btnText?: string;
  visible: boolean;
  onRequestClose?: () => void;
}
const AlertModal = ({
  variant = "success",
  heading,
  content,
  btnText,
  visible = false,
  onRequestClose,
}: AlertModalProps) => {
  return (
    <View>
      <BlurModal
        variant="alert"
        heading={t(LocalizedStrings.schedule.placeHolders.search)}
        visible={visible}
        onRequestClose={() => console.log()}
      >
        <View>
          {variant === "success" && (
            <View className="w-[70px] mx-auto mb-2.5 h-[70px] bg-primary/30 flex items-center justify-center  rounded-full">
              <View className="w-[60px] h-[60px] bg-primary  flex items-center justify-center rounded-full">
                <IconTick />
              </View>
            </View>
          )}
          {variant === "error" && (
            <View className=" mx-auto mb-2.5 flex items-center justify-center ">
              <Svg width="70" height="70" viewBox="0 0 70 70" fill="none">
                <Path
                  d="M58.3333 37.9167C58.3333 52.5 48.125 59.7917 35.9916 64.0208C35.3563 64.2361 34.6661 64.2258 34.0375 63.9917C21.875 59.7917 11.6666 52.5 11.6666 37.9167V17.5C11.6666 16.7265 11.9739 15.9846 12.5209 15.4376C13.0679 14.8906 13.8097 14.5833 14.5833 14.5833C20.4166 14.5833 27.7083 11.0833 32.7833 6.65001C33.4012 6.12209 34.1872 5.83203 35 5.83203C35.8127 5.83203 36.5987 6.12209 37.2166 6.65001C42.3208 11.1125 49.5833 14.5833 55.4166 14.5833C56.1902 14.5833 56.932 14.8906 57.479 15.4376C58.026 15.9846 58.3333 16.7265 58.3333 17.5V37.9167Z"
                  stroke="#D32E2E"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <Path
                  d="M42.2917 27.7085L27.7084 42.2918"
                  stroke="#D32E2E"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <Path
                  d="M27.7084 27.7085L42.2917 42.2918"
                  stroke="#D32E2E"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </View>
          )}

          <Text className="text-slateCharcoal text-center text-2xl font-medium font-Manrope-Medium">
            {heading ?? t(LocalizedStrings.common.success)}
          </Text>
          <Text className="text-[#505050] mt-2.5 text-center text-xs font-normal font-Manrope">
            {content ?? t(LocalizedStrings.logs.description)}
          </Text>
          <View className="justify-center flex flex-row">
            {onRequestClose && (
              <Button
                btnText={btnText ?? t(LocalizedStrings.common.done)}
                onPress={onRequestClose}
              />
            )}
          </View>
        </View>
      </BlurModal>
    </View>
  );
};

export default AlertModal;
