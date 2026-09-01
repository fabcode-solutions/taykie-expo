// ... imports stay the same

import { useProductStore } from "@/stores/productStore";
import { Theme, useTheme } from "@/theme";
import { CreateLogRequest } from "@/types/products.types";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import { useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import BlurModal from "../ui/Modal";
import { Loader } from "../shared/loader";
import { Alert, StyleSheet, TouchableOpacity, View } from "react-native";
import { ThemeText } from "../primitives";
import { Input } from "../ui/TextInput/input";
import { Button } from "../ui/button";
import { Ionicons } from "@expo/vector-icons";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import { t } from "i18next";
import { AlertPresets } from "@/utils/alert";
import { useAlert } from "@/provider/AlertProvider";

const AddProductLogModal = ({ scheduleId, productName, visible = false, onClose }: any) => {
  const theme = useTheme();
  const alert = useAlert();
  const { createProductLog, isLoading } = useProductStore();

  const { control, handleSubmit, setValue, watch, reset } = useForm({
    defaultValues: {
      note: "",
      status: "taken",
    },
  });

  const activeStatus = watch("status");

  const themedStyles = useMemo(() => createStyles(theme), [theme]);

  const addProductLog = useCallback(
    async (data: any) => {
      try {
        const date = new Date();
        const formattedDate = date.toISOString().split("T")[0];
        const request: CreateLogRequest = {
          note: data.note,
          status: data.status,
          logDate: formattedDate,
        };
        const message = await createProductLog(scheduleId, request);
        Alert.alert(t(LocalizedStrings.common.success), message, [
          {
            text: t(LocalizedStrings.common.ok),
            onPress: () => {
              reset();
              onClose();
            },
          },
        ]);
      } catch (error) {
        alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
      }
    },
    [scheduleId, createProductLog, onClose, t],
  );

  return (
    <BlurModal
      heading={t("logs.add_log_for", { product: productName })}
      visible={visible}
      contentStyle={{ gap: verticalScale(20) }}
      onRequestClose={onClose}
    >
      {isLoading && <Loader />}

      <View>
        <View style={{ gap: verticalScale(10), marginBottom: verticalScale(10) }}>
          <ThemeText style={{ fontSize: moderateScale(16) }}>
            {t(LocalizedStrings.logs.add_log)}
          </ThemeText>
          <Input
            control={control}
            name="note"
            multiline
            placeholder={t(LocalizedStrings.logs.description)}
          />
        </View>

        <View style={themedStyles.reminderRow}>
          {(["taken", "missed"] as const).map((option) => {
            const isActive = activeStatus === option;

            return (
              <TouchableOpacity
                key={option}
                style={themedStyles.checkWrapper}
                activeOpacity={0.85}
                onPress={() => setValue("status", option)}
              >
                <View
                  style={[
                    themedStyles.reminderToggle,
                    isActive && themedStyles.reminderToggleActive,
                  ]}
                >
                  {isActive && (
                    <Ionicons
                      name="checkmark"
                      size={moderateScale(18)}
                      color={theme.colors.text.primary}
                    />
                  )}
                </View>
                <ThemeText variant="manrope.body1" style={themedStyles.reminderToggleText}>
                  {t(`home.tasks.status.${option}`)}
                </ThemeText>
              </TouchableOpacity>
            );
          })}
        </View>

        <Button
          title={t(LocalizedStrings.logs.save)}
          size="large"
          loading={isLoading}
          onPress={handleSubmit(addProductLog)}
        />
      </View>
    </BlurModal>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    reminderRow: {
      flexDirection: "row",
      marginBottom: verticalScale(30),
      gap: scale(20),
    },
    reminderToggle: {
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 999,
      aspectRatio: 1,
      height: verticalScale(24),
      borderWidth: scale(1),
      borderColor: theme.colors.divider,
    },
    reminderToggleActive: {
      backgroundColor: theme.colors.primary.main,
      borderColor: theme.colors.primary.main,
    },
    reminderToggleText: {
      color: theme.colors.text.primary,
      fontSize: moderateScale(14),
    },
    checkWrapper: {
      flexDirection: "row",
      gap: scale(10),
      alignItems: "center",
    },
  });

export default AddProductLogModal;
