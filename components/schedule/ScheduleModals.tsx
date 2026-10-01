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
import { CreateScheduleRequest, FrequencyType, Schedule as ScheduleModel } from "@/types/schedule.types";
import { useScheduleStore } from "@/stores/scheduleStore";
import { generateWeek } from "@/app/(tabs)/schedule";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import { t } from "i18next";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import { AlertPresets } from "@/utils/alert";
import { useAlert } from "@/provider/AlertProvider";
import { useBLEStore, scheduleTimeKey } from "@/stores/bleStore";
import { SCHEDULE_SLOT_COUNT } from "@/services/ble/TaykieProtocol";
import { searchSupplements } from "@/services/openFoodFacts.service";
import { searchCatalogProducts } from "@/hooks/queries/products";
import { catalogRequestFields, marketForCountry, withUnit } from "@/utils/supplementCatalog";
import { useAuthStore } from "@/stores/authStore";
import { createSupplementEvent } from "@/hooks/queries/supplements";

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

  // Layer 2 (our admin-managed supplement catalog, searched server-side since
  // it is far larger than the list the app keeps in memory) + the user's own
  // previously-added products + Layer 1 (live Open Food Facts search), merged
  // into one result list, our own entries first. Layer 3 (the
  // "Add '[search text]' as a custom supplement" fallback) doesn't need
  // anything here — SearchModal already shows it whenever this resolves to
  // an empty list.
  const country = useAuthStore((s) => s.user?.country);
  const handleSearch = useCallback(
    async (query: string): Promise<SearchItem[]> => {
      const lower = query.toLowerCase();
      const toItem = (p: any): SearchItem => ({
        ...p,
        source: "local" as const,
        brand: p.brandName ?? p.brand,
      });

      const localMatches: SearchItem[] = products
        .filter(
          (p) =>
            p.name.toLowerCase().includes(lower) ||
            p.brandName?.toLowerCase().includes(lower) ||
            p.primaryActiveIngredient?.toLowerCase().includes(lower),
        )
        .map(toItem);

      const seen = new Set(localMatches.map((p) => p.id));
      let catalogMatches: SearchItem[] = [];
      try {
        const result = await searchCatalogProducts(query, marketForCountry(country));
        catalogMatches = ((result?.data ?? []) as any[])
          .filter((p) => !seen.has(p.id))
          .map(toItem);
      } catch (error) {
        console.error("Catalog search failed:", error);
      }

      let apiMatches: SearchItem[] = [];
      try {
        apiMatches = await searchSupplements(query);
      } catch (error) {
        console.error("Open Food Facts search failed:", error);
      }

      return [...localMatches, ...catalogMatches, ...apiMatches];
    },
    [products, country],
  );

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
            strengthUnit: product.strengthUnit,
            brandName: product.brandName,
            primaryActiveIngredient: product.primaryActiveIngredient,
            deliveryForm: product.deliveryForm,
            targetMarket: product.targetMarket,
            category: product.category,
            barcodeGtin: product.barcodeGtin,
          } as Medication;
        }

        return {
          ...prev,
          name: product.productName,
          type: product.type,
          description: product.description,
          dosage: product.dosageCount,
          strength: product.strength,
          strengthUnit: product.strengthUnit,
        };
      });
      setAddProductVisible(false);
      // Same reasoning as handleSelect above — don't close one modal and
      // open the next in the same commit.
      setTimeout(() => setRoutineVisible(true), 300);
    },
    [setMedication],
  );
  // "Save to Taykie device" — pushes the just-created schedule's times onto
  // the device's on-device reminder slots (F2), the same mechanism the
  // dedicated On-Device Reminders screen (schedule-sync.tsx) uses. The
  // schedule itself is already saved by the time this runs, so any failure
  // here is its own separate warning, never a rollback of the schedule save.
  const syncNewScheduleToDevice = useCallback(
    async (created: ScheduleModel) => {
      try {
        const times = (created.scheduleTime ?? "")
          .split(",")
          .map((time) => time.trim())
          .filter(Boolean);
        if (times.length === 0) return;

        const scheduleId = created.scheduleId ?? created.id;
        if (!scheduleId) return;
        const newKeys = times.map((time) => scheduleTimeKey(scheduleId, time));

        const bleState = useBLEStore.getState();
        const merged = [...bleState.syncedTimeKeys];
        let droppedCount = 0;
        for (const key of newKeys) {
          if (merged.includes(key)) continue;
          if (merged.length >= SCHEDULE_SLOT_COUNT) {
            droppedCount += 1;
            continue;
          }
          merged.push(key);
        }
        bleState.setSyncedTimeKeys(merged);

        // F2 always rewrites the device's entire slot table, so this needs
        // every schedule, not just the new one — refetch rather than trust
        // whatever's cached, since the new schedule may not be in it yet.
        await useScheduleStore.getState().fetchUserSchedules(true);
        const allSchedules = useScheduleStore.getState().userSchedules;
        const result = await bleState.syncSchedulesToDevice(allSchedules);

        if (droppedCount > 0 || result.skippedScheduleIds.includes(scheduleId)) {
          alert.show(
            AlertPresets.warning(
              t(LocalizedStrings.common.warning),
              t(LocalizedStrings.schedule.routine.saveToDeviceSlotsFull),
            ),
          );
        } else {
          alert.show(
            AlertPresets.success(
              t(LocalizedStrings.common.success),
              t(LocalizedStrings.schedule.routine.saveToDeviceSynced),
            ),
          );
        }
      } catch (error) {
        alert.show(
          AlertPresets.error(
            t(LocalizedStrings.common.error),
            t(LocalizedStrings.schedule.routine.saveToDeviceSyncFailed),
          ),
        );
      }
    },
    [alert, t],
  );

  const handleAddRoutine = useCallback(
    async (
      frequency: FrequencyType,
      timeOfDay: string,
      selectedDay?: string,
      selectedMonthDay?: number,
      reminders?: { push?: boolean; led?: boolean; sound?: boolean },
      saveToDevice?: boolean,
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
        strength: withUnit(medication.strength, medication.strengthUnit),
        scheduleDay: weekDays,
        scheduleTime: timeOfDay,
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
        // A custom-created item (selectedItem === null) or an OFF search
        // result (source: "api") never has a row in our own products table
        // yet — its id is either nothing or an OFF barcode — so both need a
        // product created before they can be referenced as a scheduleId FK.
        // An item picked from the user's own product list already has one.
        const needsNewProduct = selectedItem === null || medication.source === "api";
        if (needsNewProduct) {
          const { name, type, description } = medication;

          const request: ProductRequest = {
            name,
            type,
            ...(description && { description }),
            ...catalogRequestFields(medication as Parameters<typeof catalogRequestFields>[0]),
            // A supplement the user typed in themselves is offered to the shared
            // catalog: usable by them right away, visible to others once approved.
            ...(selectedItem === null && { submitForReview: true }),
          };

          const id = await createProduct(request);
          payload = { ...payload, productId: id };
        }
        const created = await createSchedule(payload);
        setAddProductVisible(false);
        setRoutineVisible(false);
        // Same reasoning as handleSelect/handleAddProduct above — don't
        // close the routine modal and open the success alert in the same
        // commit.
        setTimeout(() => {
          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 3000);
        }, 300);

        // Mandatory usage-capture event (Supplement Search brief, Section
        // 5) — records what the user actually added and where it came
        // from. Never blocks or rolls back the schedule save on failure.
        createSupplementEvent({
          action: "added",
          productName: medication.name,
          brand: medication.brand,
          category: medication.category,
          // medication.dosage is typed as a string, but AddProduct's
          // dosageCount counter actually feeds it in as a number — the
          // backend column is varchar, so this must be a string on the wire.
          doseQuantity: medication.dosage != null ? String(medication.dosage) : undefined,
          source: medication.source === "api" ? "api" : "user_created",
          offId: medication.offId,
        }).catch((captureError) => {
          console.error("Failed to record supplement usage event:", captureError);
        });

        // "Save to Taykie device" — the schedule itself is already saved at
        // this point regardless of what happens below, so a sync failure
        // here is surfaced as its own warning rather than rolling anything
        // back or blocking the success flow above.
        if (saveToDevice && created) {
          await syncNewScheduleToDevice(created);
        }
      } catch (error) {
        alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
      }
    },
    [medication, syncNewScheduleToDevice],
  );

  return (
    <>
      <BlurModal
        heading={t(LocalizedStrings.schedule.placeHolders.search)}
        visible={searchVisible}
        contentStyle={{ gap: verticalScale(20) }}
        disableInnerScroll
        onRequestClose={() => {
          setSearchVisible(false);
          onClose?.();
        }}
      >
        <SearchModal
          items={products}
          onSelect={handleSelect}
          onSearch={handleSearch}
          placeholder={`${t(LocalizedStrings.schedule.placeHolders.search)}...`}
        />
      </BlurModal>

      <BlurModal
        heading={
          selectedItem !== null
            ? t(LocalizedStrings.schedule.addProduct.submit)
            : t(LocalizedStrings.schedule.createNewProduct)
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
