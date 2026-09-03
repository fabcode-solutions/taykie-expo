import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import IconDelete from "../icons/IconDelete";
import { fontFamily, Theme, useTheme } from "@/theme";
import DeleteSchedule from "./DeleteSchedule";
import Button from "../ui/button/Button";
import { Images } from "@/assets";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { useScheduleStore } from "@/stores/scheduleStore";
import { getErrorMessage } from "@/stores/postStore";
import BlurModal from "../ui/Modal";
import AddProduct from "./AddProduct";
import ScheduleComponent from "./Schedule";
import { Medication } from "@/types/products.types";
import { CreateScheduleRequest, Schedule } from "@/types/schedule.types";
import { getFrequency, getTimeOfDay } from "@/utils/formatter";
import { generateWeek } from "@/app/(tabs)/schedule";
import { timeMap } from "./ScheduleModals";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import { t } from "i18next";
import BackButton from "../BackButton";
import { AlertPresets } from "@/utils/alert";
import { useAlert } from "@/provider/AlertProvider";

interface MedicineTakenProp {
  task: Schedule;
  onEditComplete?: (schedule: Schedule) => void;
  onClose: () => void;
}

const MedicineTaken = ({ task, onClose, onEditComplete }: MedicineTakenProp) => {
  const theme = useTheme();
  const alert = useAlert();
  const themedStyles = React.useMemo(() => createStyles(theme), [theme]);

  const { deleteSchedule, markMedicineAsTaken, updateUserSchedule, isLoading } = useScheduleStore();

  const [openDelete, setOpenDelete] = useState(false);
  const [addProductVisible, setAddProductVisible] = useState(false);
  const [routineVisible, setRoutineVisible] = useState(false);
  const [info, setInfo] = useState(false);

  const [medication, setMedication] = useState<Medication>();

  const dosageCount = Number(medication?.dosage?.split(" ")[0]) || 1;
  const strengthCount = Number(medication?.strength?.split(" ")[0]) || 500;

  useEffect(() => {
    setMedication({
      id: task.product?.id ?? task.productId,
      userId: task.userId,
      type: task.product?.type ?? "private",

      name: task.product?.name ?? task.name,
      description: task.product?.description ?? "",
      media: task.product?.media ?? [],

      dosage: task.dosage,
      strength: task.strength,

      createdAt: task.createdAt,
      updatedAt: task.updatedAt,

      frequency: getFrequency(task.scheduleDay),
      timeOfDay: task.scheduleTime
        ? task.scheduleTime.split(",").map((t) => getTimeOfDay(t.trim()))
        : [],
      reminders: {
        push: task.remindersPush,
        led: task.remindersLed,
        sound: task.remindersSound,
      },
    });
  }, [task]);

  /* -----------------------------
     Handlers
  ------------------------------ */

  const handleDeleteOpen = useCallback(() => {
    setOpenDelete(true);
  }, []);

  const handleDeleteClose = useCallback(() => {
    setOpenDelete(false);
  }, []);

  const handleDeleteSchedule = useCallback(async () => {
    try {
      const message = await deleteSchedule(task.id);
      alert.show(AlertPresets.success(t(LocalizedStrings.common.success), message));
      onClose();
    } catch (error) {
      alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
    }
  }, []);

  const handleInfoOpen = useCallback(() => {
    setInfo((prev) => !prev);
  }, []);

  const markScheduleAsTaken = useCallback(async () => {
    try {
      await markMedicineAsTaken(task.id);
      onClose();
    } catch (error) {
      const message = getErrorMessage(error);
      alert.show(AlertPresets.error(t(LocalizedStrings.common.error), message));
    }
  }, []);

  const handleAddProduct = useCallback((dosage: string, strength: string) => {
    setMedication((prev) => ({
      ...prev!,
      dosage,
      strength,
    }));

    setAddProductVisible(false);
    // Each BlurModal wraps RN's own <Modal>, which manages a separate
    // native surface. Closing one and opening another in the same React
    // commit transitions two native surfaces simultaneously, which has
    // been the trigger for a Yoga/Fabric shadow-tree crash elsewhere in
    // this app (see ScheduleModals.tsx) — deferring lets the close finish
    // first.
    setTimeout(() => setRoutineVisible(true), 300);
  }, []);

  const handleAddRoutine = useCallback(
    async (
      frequency: string,
      timeOfDay: string | string[],
      selectedDay: string,
      selectedMonthDay?: number,
      reminders?: { push?: boolean; led?: boolean; sound?: boolean },
    ) => {
      if (!medication) return;

      let weekDays = selectedDay;

      if (frequency === "daily") {
        weekDays = generateWeek(new Date(), "eeee")
          .map((v) => v.weekday.toLowerCase().replace(/^./, (c) => c.toUpperCase()))
          .join(", ");
      }

      const payload: CreateScheduleRequest = {
        name: medication.name,
        dosage: `${medication.dosage} ${Number(medication.dosage) > 1 ? "Tablets" : "Tablet"}`,
        strength: `${medication.strength} mg`,
        scheduleType: frequency,
        scheduleDay: weekDays,
        scheduleDayOfMonth: selectedMonthDay,
        scheduleTime: Array.isArray(timeOfDay)
          ? timeOfDay.map((time) => timeMap[time]).join(", ")
          : timeMap[timeOfDay],
        remindersPush: reminders?.push ?? false,
        remindersLed: reminders?.led ?? false,
        remindersSound: reminders?.sound ?? false,
      };

      try {
        const result = await updateUserSchedule(task.id, payload);

        // ✅ THIS is the key fix
        const updatedSchedule = result.data;

        onEditComplete?.(updatedSchedule);
        setAddProductVisible(false);
        setRoutineVisible(false);
        // Same reasoning as handleAddProduct above — don't close the
        // routine modal and show the success alert in the same commit.
        setTimeout(() => {
          alert.show(AlertPresets.success(t(LocalizedStrings.common.success), result.message));
        }, 300);
      } catch (error) {
        alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
      }
    },
    [medication, task.id],
  );

  const scheduleFor = useMemo(() => {
    switch (task?.scheduleType) {
      case "daily":
        return t(LocalizedStrings.home.schedule.daily);
      case "weekly":
        return `${t(LocalizedStrings.common.Every)} ${task.scheduleDay}`;
      case "monthly":
        return t(LocalizedStrings.schedule.everyMonth);
    }
  }, [task?.scheduleType, task.scheduleDay]);
  return (
    <View style={{ gap: verticalScale(20) }}>
      <View style={themedStyles.headerStyle}>
        <Animated.View entering={FadeInDown.duration(300)} exiting={FadeOutDown.duration(300)}>
          {/* <TouchableOpacity style={themedStyles.headerBtnStyle} onPress={handleInfoOpen}>
            <IconInfo />
          </TouchableOpacity> */}
          <BackButton onPress={onClose} />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(300)} exiting={FadeOutDown.duration(300)}>
          <TouchableOpacity style={themedStyles.headerBtnStyle} onPress={handleDeleteOpen}>
            <IconDelete />
          </TouchableOpacity>
        </Animated.View>
      </View>

      {!info && (
        <Animated.View
          entering={FadeInDown.duration(300)}
          exiting={FadeOutDown.duration(300)}
          style={themedStyles.contentStyle}
        >
          {task.status === "taken" && (
            <Text style={themedStyles.contentHead0Style}>
              {t(LocalizedStrings.home.extras.awesome)}
            </Text>
          )}

          <Text style={themedStyles.contentHeadStyle}>
            {task.status === "taken" && t(LocalizedStrings.home.medicine.statusTitle.taken)}
            {task.status === "upcoming" && t(LocalizedStrings.home.medicine.statusTitle.upcoming)}
            {task.status === "missed" && t(LocalizedStrings.home.medicine.statusTitle.missed)}
          </Text>

          <View style={themedStyles.imageStyle}>
            <Image
              style={{ width: scale(120), height: verticalScale(120) }}
              source={Images.pillWithCircle}
            />
          </View>

          <Text style={themedStyles.contentHeadingStyle}>{task.name}</Text>

          {task.status !== "taken" && (
            <Text style={themedStyles.contentTextStyle}>
              {t(LocalizedStrings.home.extras.scheduledFor)} {scheduleFor}{" "}
              {t(LocalizedStrings.home.extras.at)} {task.scheduleTime}
            </Text>
          )}

          <Text style={themedStyles.contentTextStyle}>
            {task.dosage}, {task.strength}
          </Text>

          {task.status !== "taken" && (
            <View style={themedStyles.contentBtnStyle}>
              <Button
                loading={isLoading}
                btnText={t(LocalizedStrings.home.tasks.status.taken)}
                className="!bg-primary"
                onPress={markScheduleAsTaken}
              />
              <Button
                btnText={t(LocalizedStrings.common.edit)}
                onPress={() => setAddProductVisible(true)}
              />
            </View>
          )}

          {task.status === "taken" && (
            <View style={themedStyles.contentBtnStyle}>
              <Button btnText={t(LocalizedStrings.home.extras.goBack)} onPress={onClose} />
            </View>
          )}
        </Animated.View>
      )}

      {info && (
        <Animated.View
          entering={FadeInDown.duration(300)}
          exiting={FadeOutDown.duration(300)}
          style={themedStyles.contentStyle}
        >
          <Text style={themedStyles.contentInfoHeadingStyle}>{task.product?.name}</Text>
          <Text style={themedStyles.contentTextListStyle}>{task.product?.description}</Text>
          <Text style={themedStyles.contentInfoHeadingStyle}>
            {t(LocalizedStrings.home.extras.benefitsOf)} {task.product?.name}
          </Text>
          <Text style={themedStyles.contentTextListStyle}>People often use them for: </Text>
          <Text style={themedStyles.contentTextListStyle}>
            ✔ Energy Support B12 helps convert food into energy. Deficiency causes tiredness and
            weakness.
          </Text>
          <Text style={themedStyles.contentTextListStyle}>
            ✔ Improved Mood & Brain Function Supports neurotransmitters and may help with memory or
            mood regulation.
          </Text>
          <Text style={themedStyles.contentTextListStyle}>
            ✔ Healthy Nerves Important for the nervous system and preventing nerve damage symptoms
            like tingling.
          </Text>
          <Text style={themedStyles.contentTextListStyle}>
            ✔ Red Blood Cell Production Prevents megaloblastic anemia.
          </Text>
          <Text style={themedStyles.contentTextListStyle}>
            ✔ Good for Vegans & Vegetarians Plant-based diets often lack natural B12 sources.
          </Text>
        </Animated.View>
      )}

      {openDelete && <DeleteSchedule onClose={handleDeleteClose} onYes={handleDeleteSchedule} />}

      <BlurModal
        heading={t(LocalizedStrings.home.extras.updateProduct)}
        visible={addProductVisible}
        onRequestClose={() => setAddProductVisible(false)}
      >
        <AddProduct
          item={task}
          initialDosage={dosageCount}
          initialStrength={strengthCount}
          onAddProduct={(product) =>
            handleAddProduct(String(product.dosageCount), String(product.strength))
          }
        />
      </BlurModal>

      <BlurModal
        heading={t(LocalizedStrings.navigation.tabs.schedule)}
        visible={routineVisible}
        onRequestClose={() => setRoutineVisible(false)}
      >
        <ScheduleComponent item={medication} onAddRoutine={handleAddRoutine} />
      </BlurModal>
    </View>
  );
};

export default MedicineTaken;
const createStyles = (theme: Theme) =>
  StyleSheet.create({
    headerStyle: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    imageStyle: {
      flexDirection: "row",
      justifyContent: "center",
      marginBottom: verticalScale(20),
    },
    contentBtnStyle: {
      flexDirection: "row",
      justifyContent: "center",
      gap: scale(10),
      marginTop: verticalScale(28),
    },

    headerBtnStyle: {
      aspectRatio: 1,
      height: verticalScale(40),
      backgroundColor: theme.colors.primary.main,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: scale(1),
      borderColor: theme.colors.slateCharcoal,
      borderRadius: moderateScale(10),
    },
    contentStyle: {
      marginTop: verticalScale(50),
    },
    contentHead0Style: {
      fontFamily: fontFamily.manrope.medium,
      fontSize: moderateScale(36),
      fontWeight: "500" as const,
      color: theme.colors.text.primary,
      textAlign: "center",
      marginBottom: verticalScale(2),
    },
    contentHeadStyle: {
      fontFamily: fontFamily.manrope.medium,
      fontSize: moderateScale(24),
      fontWeight: "500" as const,
      color: theme.colors.text.primary,
      textAlign: "center",
      marginBottom: verticalScale(20),
    },
    contentHeadingStyle: {
      fontFamily: fontFamily.gascogneSerial.regular,
      fontSize: moderateScale(24),
      fontWeight: "400" as const,
      color: theme.colors.text.primary,
      textAlign: "center",
      marginBottom: verticalScale(15),
      lineHeight: verticalScale(36),
    },
    contentTextStyle: {
      fontFamily: fontFamily.manrope.regular,
      fontSize: moderateScale(14),
      fontWeight: "400" as const,
      color: theme.colors.primary.dark,
      textAlign: "center",
      marginBottom: verticalScale(10),
    },
    contentInfoHeadingStyle: {
      fontFamily: fontFamily.gascogneSerial.regular,
      fontSize: moderateScale(24),
      fontWeight: "400" as const,
      color: theme.colors.text.primary,
      textAlign: "left",
      marginBottom: verticalScale(15),
      lineHeight: verticalScale(24),
    },
    contentTextListStyle: {
      fontFamily: fontFamily.manrope.regular,
      fontSize: moderateScale(16),
      fontWeight: "400" as const,
      color: theme.colors.primary.dark,
      textAlign: "left",
      marginBottom: verticalScale(10),
    },
  });
