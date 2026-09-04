import { SearchItem } from "@/types/search.types";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import { TouchableOpacity } from "react-native";
import BlurModal from "../ui/Modal";
import AddProduct, { ProductDetails } from "./AddProduct";
import { useTheme } from "@/theme";
import SearchModal from "./SearchModal";
import { Medication, ProductRequest } from "@/types/products.types";
import Schedule from "./Schedule";
import AlertModal from "../ui/Alert/AlertModal";
import { useProductStore } from "@/stores/productStore";
import { CreateScheduleRequest, FrequencyType } from "@/types/schedule.types";
import { useScheduleStore } from "@/stores/scheduleStore";
import { generateWeek } from "@/app/(tabs)/schedule";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import { t } from "i18next";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import { AlertPresets } from "@/utils/alert";
import { useAlert } from "@/provider/AlertProvider";

export const timeMap: Record<string, string> = {
  morning: "06:00",
  afternoon: "12:00",
  evening: "17:00",
  night: "20:00"
};

const ScheduleModals = ({
  visible = false,
  showAddButton = true,
  onClose,
}: {
  visible?: boolean;
  showAddButton?: boolean;
  onClose?: () => void;
}) => {
  const theme = useTheme();
  const alert = useAlert();
  const [searchVisible, setSearchVisible] = useState(visible);
  const [addProductVisible, setAddProductVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SearchItem | null>(null);
  const [medication, setMedication] = useState<Medication | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [routineVisible, setRoutineVisible] = React.useState(false);
  const { products, createProduct } = useProductStore();
  const { createSchedule } = useScheduleStore();

  useEffect(() => {
    setSearchVisible(visible);
  }, [visible]);

  const handleSelect = (item: SearchItem | null) => {
    if (item) {
      setMedication(item as Medication);
    }
    setSelectedItem(item);
    setSearchVisible(false);
    onClose?.();
    // Each BlurModal wraps RN's own <Modal>, which manages a separate
    // native surface. Closing one and opening another in the same React
    // commit transitions two native surfaces simultaneously, which has
    // been the trigger for a Yoga/Fabric shadow-tree crash elsewhere in
    // this app — deferring to the next tick lets the close finish first.
    setTimeout(() => setAddProductVisible(true), 300);
  };
  const handleAddProduct = useCallback(
    (product: ProductDetails) => {
      setMedication((prev) => {
        if (!prev) {
          return {
            id: "",
            name: product.productName,
            type: product.type,
            description: product.description,
            dosage: product.dosageCount,
            strength: product.strength,
          } as Medication;
        }

        return {
          ...prev,
          name: product.productName,
          type: product.type,
          description: product.description,
          dosage: product.dosageCount,
          strength: product.strength,
        };
      });
      setAddProductVisible(false);
      // Same reasoning as handleSelect above — don't close one modal and
      // open the next in the same commit.
      setTimeout(() => setRoutineVisible(true), 300);
    },
    [setMedication],
  );
  const handleAddRoutine = useCallback(
    async (
      frequency: FrequencyType,
      timeOfDay: string | string[],
      selectedDay?: string,
      selectedMonthDay?: number,
      reminders?: { push?: boolean; led?: boolean; sound?: boolean },
    ) => {
      let weekDays = selectedDay;
      if (frequency === "daily") {
        weekDays = generateWeek(new Date(), "eeee")
          .map((v) => v.weekday.toLowerCase().replace(/^./, (c) => c.toUpperCase()))
          .join(", ");
      }

      const dosageNumber = Number(medication?.dosage ?? 0);
      if (!medication) return;
      let payload: CreateScheduleRequest = {
        productId: medication.id,
        name: medication.name,
        dosage: `${dosageNumber} ${dosageNumber > 1 ? "tablets" : "tablet"}`,
        strength: `${medication.strength} mg`,
        scheduleDay: weekDays,
        scheduleTime: Array.isArray(timeOfDay)
          ? timeOfDay.map((time) => timeMap[time]).join(", ")
          : timeMap[timeOfDay],
        scheduleDayOfMonth: selectedMonthDay,
        remindersPush: reminders?.push ?? false,
        scheduleType: frequency,
        remindersLed: reminders?.led ?? false,
        remindersSound: reminders?.sound ?? false,
      };

      if (frequency === "monthly") {
        const { scheduleDay, ...rest } = payload;

        payload = {
          ...rest,
          scheduleDayOfMonth: 1,
        };
      }

      try {
        if (selectedItem === null) {
          const { name, type, description } = medication;

          const request: ProductRequest = {
            name,
            type,
            ...(description && { description }),
          };

          const id = await createProduct(request);
          payload = { ...payload, productId: id };
        }
        await createSchedule(payload);
        setAddProductVisible(false);
        setRoutineVisible(false);
        // Same reasoning as handleSelect/handleAddProduct above — don't
        // close the routine modal and open the success alert in the same
        // commit.
        setTimeout(() => {
          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 3000);
        }, 300);
      } catch (error) {
        alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
      }
    },
    [medication],
  );

  return (
    <>
      <BlurModal
        heading={t(LocalizedStrings.schedule.placeHolders.search)}
        visible={searchVisible}
        contentStyle={{ gap: verticalScale(20) }}
        onRequestClose={() => {
          setSearchVisible(false);
          onClose?.();
        }}
      >
        <SearchModal
          items={products}
          onSelect={handleSelect}
          placeholder={`${t(LocalizedStrings.schedule.placeHolders.search)}...`}
        />
      </BlurModal>

      <BlurModal
        heading={
          selectedItem !== null
            ? t(LocalizedStrings.schedule.addProduct.submit)
            : "Create New Product"
        }
        visible={addProductVisible}
        onRequestClose={() => setAddProductVisible(false)}
      >
        <AddProduct
          item={selectedItem}
          onAddProduct={handleAddProduct}
          initialDosage={parseInt((selectedItem?.dosage ?? "1 Tablet")?.split(" ")[0])}
          initialStrength={parseInt((selectedItem?.strength ?? "500 mg")?.split(" ")[0])}
        />
      </BlurModal>

      <BlurModal
        heading={t(LocalizedStrings.navigation.tabs.schedule)}
        visible={routineVisible}
        onRequestClose={() => setRoutineVisible(false)}
      >
        <Schedule item={medication} onAddRoutine={handleAddRoutine} />
      </BlurModal>
      <AlertModal
        visible={showSuccess}
        heading={t(LocalizedStrings.common.success)}
        content={t(LocalizedStrings.schedule.scheduleSuccess)}
        onRequestClose={() => setShowSuccess(false)}
      />
      {showAddButton && (
        <TouchableOpacity
          onPress={() => setSearchVisible(true)}
          activeOpacity={0.85}
          className="absolute bg-primary flex items-center justify-center"
          style={{
            aspectRatio: 1,
            height: verticalScale(60),
            borderRadius: moderateScale(30),
            bottom: verticalScale(112),
            right: scale(40),
          }}
        >
          <Ionicons name="add" size={moderateScale(28)} color={theme.colors.text.primary} />
        </TouchableOpacity>
      )}
    </>
  );
};

export default ScheduleModals;
