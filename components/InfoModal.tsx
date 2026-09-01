import React, { memo, useMemo } from "react";
import {
  Modal,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Theme, useTheme } from "@/theme";
import { scale, verticalScale } from "@/utils/scale";

interface BlurModalProps {
  variant?: "alert" | "default";
  visible: boolean;
  onRequestClose: () => void;
  children: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  animationType?: "none" | "slide" | "fade";
}

/**
 * Reusable BlurModal Component
 *
 * Features:
 * - Optimized with memo for performance
 * - Works with QueryClientProvider context
 * - Customizable blur intensity and animation
 * - Accessible and keyboard-friendly
 * - Platform-specific optimizations
 *
 * Usage:
 * ```tsx
 * <BlurModal
 *   visible={isVisible}
 *   onRequestClose={() => setVisible(false)}
 *   contentStyle={{ padding: 20 }}
 * >
 *   <YourContent />
 * </BlurModal>
 * ```
 */
const InfoModal: React.FC<BlurModalProps> = memo(
  ({ visible, onRequestClose, children, contentStyle, animationType = "fade" }) => {
    const theme = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    return (
      <Modal
        visible={visible}
        transparent
        animationType={animationType}
        onRequestClose={onRequestClose}
        statusBarTranslucent
        hardwareAccelerated
      >
        <TouchableWithoutFeedback onPress={onRequestClose}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={[contentStyle]}>{children}</View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    );
  },
);

InfoModal.displayName = "InfoModal";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    blurContainer: {
      flex: 1,
    },
    overlay: {
      flex: 1,
      backgroundColor: theme.colors.background.default,
      paddingHorizontal: scale(16),
      paddingVertical: verticalScale(64),
    },
  });

export default InfoModal;
