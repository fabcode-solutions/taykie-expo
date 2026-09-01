import { verticalScale } from "@/utils/scale";
import React, { useRef } from "react";
import {
  Animated,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";

type AnimatedScrollViewProps = React.ComponentProps<typeof Animated.ScrollView>;

type ScrollViewOptions = Partial<AnimatedScrollViewProps>;

export type ParallaxHeaderRenderProps = {
  scrollY: Animated.Value;
  headerHeight: number;
  headerMinHeight: number;
  headerScrollDistance: number;
};

interface ParallaxScrollViewProps {
  headerHeight: number;
  headerMinHeight: number;
  renderHeader: (props: ParallaxHeaderRenderProps) => React.ReactNode;
  children: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  headerContainerStyle?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  scrollViewProps?: ScrollViewOptions;
  /**
   * When true, the scroll content is allowed to visually overlap the header.
   * Useful for layouts where a card needs to float above the hero section.
   */
  contentOverlapsHeader?: boolean;
}

export const ParallaxScrollView: React.FC<ParallaxScrollViewProps> = ({
  headerHeight,
  headerMinHeight,
  renderHeader,
  children,
  containerStyle,
  headerContainerStyle,
  contentContainerStyle,
  scrollViewProps,
  contentOverlapsHeader = false,
}) => {
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerScrollDistance = Math.max(headerHeight - headerMinHeight, 0);

  const {
    contentContainerStyle: scrollViewContentContainerStyle,
    style: scrollViewStyle,
    onScroll: externalOnScroll,
    scrollEventThrottle,
    showsVerticalScrollIndicator,
    pointerEvents: scrollPointerEvents,
    ...restScrollViewProps
  } = scrollViewProps ?? {};

  const handleScroll = Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
    useNativeDriver: true,
    listener: externalOnScroll as
      | ((event: NativeSyntheticEvent<NativeScrollEvent>) => void)
      | undefined,
  });

  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, headerScrollDistance],
    outputRange: [0, -headerScrollDistance],
    extrapolate: "clamp",
  });

  return (
    <View style={[styles.container, containerStyle]}>
      <Animated.ScrollView
        {...restScrollViewProps}
        style={[scrollViewStyle, contentOverlapsHeader && styles.scrollAboveHeader]}
        pointerEvents={
          contentOverlapsHeader ? (scrollPointerEvents ?? "box-none") : scrollPointerEvents
        }
        scrollEventThrottle={scrollEventThrottle ?? 16}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingTop: headerHeight },
          scrollViewContentContainerStyle,
          contentContainerStyle,
        ]}
        onScroll={handleScroll}
        showsVerticalScrollIndicator={showsVerticalScrollIndicator ?? false}
      >
        {children}
      </Animated.ScrollView>

      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.header,
          {
            height: headerHeight,
            transform: [{ translateY: headerTranslateY }],
            zIndex: contentOverlapsHeader ? 0 : 10,
          },
          headerContainerStyle,
        ]}
      >
        {renderHeader({ scrollY, headerHeight, headerMinHeight, headerScrollDistance })}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: verticalScale(32),
  },
  scrollAboveHeader: {
    zIndex: 2,
    elevation: 1,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
});
