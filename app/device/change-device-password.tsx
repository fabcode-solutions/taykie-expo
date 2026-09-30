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
import { t } from "i18next";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";

interface FormData {
  oldPassword: string;
  password: string;
  confirmPassword: string;
}

// The device's E0/E1 password is exactly 6 digits, each sent as a raw
// nibble (see TaykieProtocol.encodePassword) — unlike the account password,
// there's no complexity requirement, just a fixed 6-digit PIN.
function validateSixDigitPin(value: string): string | true {
  if (!/^\d{6}$/.test(value)) return t(LocalizedStrings.device.password.sixDigits);
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
        AlertPresets.error(t(LocalizedStrings.device.notConnected), t(LocalizedStrings.device.password.notConnectedMessage)),
      );
      return;
    }
    setIsSaving(true);
    try {
      await changeDevicePassword(data.oldPassword, data.password);
      alert.show(AlertPresets.success(t(LocalizedStrings.device.password.changed), t(LocalizedStrings.device.password.changedMessage)));
      reset();
      router.back();
    } catch (error: any) {
      alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
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
            {t(LocalizedStrings.device.password.title)}
          </ThemeText>
          <ThemeText variant="manrope.body2" style={styles.description}>
            {t(LocalizedStrings.device.password.description)}
          </ThemeText>

          <View style={styles.section}>
            <Input
              label={t(LocalizedStrings.device.password.current)}
              control={control}
              name="oldPassword"
              rules={{
                required: t(LocalizedStrings.device.password.currentRequired),
                validate: validateSixDigitPin,
              }}
              placeholder="000000"
              keyboardType="number-pad"
              secureTextEntry
              returnKeyType="next"
            />
            <Input
              label={t(LocalizedStrings.device.password.new)}
              control={control}
              name="password"
              rules={{
                required: t(LocalizedStrings.device.password.newRequired),
                validate: validateSixDigitPin,
              }}
              placeholder={t(LocalizedStrings.device.password.pinPlaceholder)}
              keyboardType="number-pad"
              secureTextEntry
              returnKeyType="next"
            />
            <Input
              label={t(LocalizedStrings.device.password.confirm)}
              control={control}
              name="confirmPassword"
              rules={{
                required: t(LocalizedStrings.device.password.confirmRequired),
                validate: (value: string) =>
                  value === getValues("password") || t(LocalizedStrings.device.password.mismatch),
              }}
              placeholder={t(LocalizedStrings.device.password.pinPlaceholder)}
              keyboardType="number-pad"
              secureTextEntry
              returnKeyType="go"
              onSubmitEditing={handleSubmit(onSubmit)}
            />
          </View>

          <Button title={t(LocalizedStrings.device.password.submit)} onPress={handleSubmit(onSubmit)} loading={isSaving} fullWidth />
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
