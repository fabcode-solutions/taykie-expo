import React from "react";
import {
  Animated,
  ImageBackground,
  ImageSourcePropType,
  StyleSheet,
  TouchableOpacity,
  View,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import IconBackArrow from "../icons/IconBackArrow";
import { useRouter } from "expo-router";
import { moderateScale, scale, verticalScale } from "@/utils/scale";

const AnimatedImageBackground = Animated.createAnimatedComponent(ImageBackground);
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

type IconButtonProps = {
  onPress?: (event: GestureResponderEvent) => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

const IconButton: React.FC<IconButtonProps> = ({ onPress, children, style }) => {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={[styles.iconButton, style]}>
      {children}
    </TouchableOpacity>
  );
};

type GroupDetailsHeroProps = {
  imageUri: ImageSourcePropType;
  onBack: () => void;
  heroSlidesLabel?: string;
  onCalendarPress?: () => void;
  onBellPress?: () => void;
  imageScale?: Animated.AnimatedInterpolation<number> | Animated.Value | number;
  imageTranslateY?: Animated.AnimatedInterpolation<number> | Animated.Value | number;
  overlayOpacity?: Animated.AnimatedInterpolation<number> | Animated.Value | number;
  topRowTranslateY?: Animated.AnimatedInterpolation<number> | Animated.Value | number;
};

export const GroupDetailsHero: React.FC<GroupDetailsHeroProps> = ({
  imageUri,
  onBack,
  heroSlidesLabel,
  onCalendarPress,
  onBellPress,
  imageScale = 1,
  imageTranslateY = 0,
  overlayOpacity = 0,
  topRowTranslateY = 0,
}) => {
  const { top } = useSafeAreaInsets();
  const router = useRouter();
  const handleBack = React.useCallback(() => {
    router.back();
  }, [router]);
  return (
    <View style={styles.container}>
      <AnimatedImageBackground
        source={imageUri}
        resizeMode="cover"
        style={[
          StyleSheet.absoluteFillObject,
          styles.image,
          {
            transform: [{ scale: imageScale }, { translateY: imageTranslateY }],
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFillObject, styles.dimOverlay, { opacity: overlayOpacity }]}
      />
      <AnimatedLinearGradient
        pointerEvents="none"
        colors={["rgba(0,0,0,0.55)", "rgba(0,0,0,0.18)", "rgba(0,0,0,0.75)"]}
        locations={[0, 0.45, 1]}
        style={[
          StyleSheet.absoluteFillObject,
          styles.gradientOverlay,
          { paddingTop: verticalScale(top + 16), opacity: overlayOpacity },
        ]}
      />
      <View
        style={[
          StyleSheet.absoluteFillObject,
          styles.gradientOverlay,
          { paddingTop: verticalScale(64) },
        ]}
      >
        <Animated.View
          style={[
            styles.topRow,
            {
              transform: [{ translateY: topRowTranslateY }],
            },
          ]}
        >
          <View>
            <TouchableOpacity onPress={handleBack} style={styles.backButton} activeOpacity={0.7}>
              <View style={styles.backButtonInner}>
                <IconBackArrow />
              </View>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  gradientOverlay: {
    paddingHorizontal: scale(20),
    paddingBottom: verticalScale(24),
    justifyContent: "space-between",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  iconButton: {
    aspectRatio: 1,
    height: verticalScale(44),
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  controlButton: {
    shadowColor: "rgba(0,0,0,0.25)",
    shadowOffset: { width: 0, height: verticalScale(4) },
    shadowOpacity: 0.4,
    shadowRadius: moderateScale(10),
    elevation: 4,
  },
  topActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(14),
  },
  slideIndicator: {
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(6),
    borderRadius: moderateScale(18),
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  dimOverlay: {
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  backButton: {
    aspectRatio: 1,
    height: verticalScale(40),
    borderRadius: moderateScale(10),
    backgroundColor: "#FFFA9C",
    borderWidth: scale(1),
    borderColor: "#262520",
    justifyContent: "center",
    alignItems: "center",
  },
  backButtonInner: {
    aspectRatio: 1,
    height: verticalScale(16),
    justifyContent: "center",
    alignItems: "center",
  },
});
