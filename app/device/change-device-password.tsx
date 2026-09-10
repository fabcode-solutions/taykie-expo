import { StyleSheet, TouchableOpacity, View, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemeText } from "@/components";
import { fontFamily, Theme, useTheme } from "@/theme";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import IconBackArrow from "@/components/icons/IconBackArrow";
import { Input } from "@/components/ui/TextInput/input";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { useBLEConnection, useBLEStore } from "@/stores/bleStore";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import { AlertPresets } from "@/utils/alert";
import { useAlert } from "@/provider/AlertProvider";

interface FormData {
  oldPassword: string;
  password: string;
  confirmPassword: string;
}

// The device's E0/E1 password is exactly 6 digits, each sent as a raw
// nibble (see TaykieProtocol.encodePassword) — unlike the account password,
// there's no complexity requirement, just a fixed 6-digit PIN.
function validateSixDigitPin(value: string): string | true {
  if (!/^\d{6}$/.test(value)) return "Must be exactly 6 digits.";
  return true;
}

export default function ChangeDevicePasswordScreen() {
  const theme = useTheme();
  const alert = useAlert();
  const router = useRouter();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { connectionStatus } = useBLEConnection();
  const { changeDevicePassword } = useBLEStore();
  const [isSaving, setIsSaving] = React.useState(false);

  const handleBack = React.useCallback(() => router.back(), [router]);

  const { control, handleSubmit, getValues, reset } = useForm<FormData>({
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: { oldPassword: "", password: "", confirmPassword: "" },
  });

  const onSubmit = async (data: FormData) => {
    if (connectionStatus !== "connected") {
      alert.show(
        AlertPresets.error("Not connected", "Connect to your Taykie device first to change its password."),
      );
      return;
    }
    setIsSaving(true);
    try {
      await changeDevicePassword(data.oldPassword, data.password);
      alert.show(AlertPresets.success("Password changed", "Your Taykie device's password has been updated."));
      reset();
      router.back();
    } catch (error: any) {
      alert.show(AlertPresets.error("Error", error.message));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.safeArea, { backgroundColor: theme.colors.background.default }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: verticalScale(80) }}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton} activeOpacity={0.7}>
            <View style={styles.backButtonInner}>
              <IconBackArrow />
            </View>
          </TouchableOpacity>

          <ThemeText variant="manrope.h2" style={styles.header}>
            Device Password
          </ThemeText>
          <ThemeText variant="manrope.body2" style={styles.description}>
            This is your Taykie device's own 6-digit Bluetooth pairing PIN — separate from your
            account password. The factory default is 000000.
          </ThemeText>

          <View style={styles.section}>
            <Input
              label="Current Password"
              control={control}
              name="oldPassword"
              rules={{
                required: "Current password is required",
                validate: validateSixDigitPin,
              }}
              placeholder="000000"
              keyboardType="number-pad"
              secureTextEntry
              returnKeyType="next"
            />
            <Input
              label="New Password"
              control={control}
              name="password"
              rules={{
                required: "New password is required",
                validate: validateSixDigitPin,
              }}
              placeholder="6-digit PIN"
              keyboardType="number-pad"
              secureTextEntry
              returnKeyType="next"
            />
            <Input
              label="Confirm New Password"
              control={control}
              name="confirmPassword"
              rules={{
                required: "Please confirm your new password",
                validate: (value: string) =>
                  value === getValues("password") || "Passwords don't match",
              }}
              placeholder="6-digit PIN"
              keyboardType="number-pad"
              secureTextEntry
              returnKeyType="go"
              onSubmitEditing={handleSubmit(onSubmit)}
            />
          </View>

          <Button title="Change Password" onPress={handleSubmit(onSubmit)} loading={isSaving} fullWidth />
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: { flex: 1 },
    container: { padding: verticalScale(16) },
    header: {
      fontSize: moderateScale(24),
      fontWeight: "400" as const,
      fontFamily: fontFamily.gascogneSerial.regular,
      color: theme.colors.text.primary,
      marginTop: verticalScale(20),
    },
    description: {
      color: theme.colors.text.secondary,
      marginTop: verticalScale(8),
      marginBottom: verticalScale(8),
    },
    backButton: {
      aspectRatio: 1,
      height: verticalScale(40),
      borderRadius: moderateScale(10),
      backgroundColor: theme.colors.primary.main,
      borderWidth: scale(1),
      borderColor: theme.colors.slateCharcoal,
      justifyContent: "center",
      alignItems: "center",
    },
    backButtonInner: {
      aspectRatio: 1,
      height: verticalScale(16),
      justifyContent: "center",
      alignItems: "center",
    },
    section: {
      marginTop: verticalScale(16),
      marginBottom: verticalScale(24),
    },
  });
