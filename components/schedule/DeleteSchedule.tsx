import React, { useCallback, useState } from "react";
import { Text, View } from "react-native";
import BlurModal from "../ui/Modal";
import Button from "../ui/button/Button";
import { t } from "i18next";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";

interface DeleteAccountProps {
  heading?: string;
  onYes?: () => Promise<void>;
  nobtnText?: string;
  yesbtnText?: string;
  content?: string;
  onClose?: () => void;
}

const DeleteSchedule = ({
  content,
  onClose,
  onYes,
  yesbtnText,
  nobtnText,
  heading,
}: DeleteAccountProps) => {
  const [loading, setLoading] = useState(false);
  const [searchVisible, setSearchVisible] = React.useState(true);
  const closeModal = useCallback(() => {
    setSearchVisible(false);
    if (onClose) {
      onClose();
    }
  }, [onClose]);
  const deleteSchedule = useCallback(async () => {
    setLoading(true);
    if (onYes) {
      await onYes();
    }
    setTimeout(() => {
      setSearchVisible(false);
      if (onClose) {
        onClose();
      }
      setLoading(false);
    }, 2500);
  }, [onClose, onYes]);

  return (
    <BlurModal
      variant="alert"
      heading="Search"
      visible={searchVisible}
      onRequestClose={() => setSearchVisible(false)}
    >
      <View>
        <Text className="text-2xl mb-2.5 text-center font-normal font-Manrope text-triatry-10 max-w-[230px">
          {heading ?? t(LocalizedStrings.common.delete)}
        </Text>
        <Text className="text-xs text-center font-normal font-Manrope text-triatry-10 max-w-[230px">
          {content ?? t(LocalizedStrings.settings.wantToDeleteAccount)}
        </Text>
        <View className="flex-row mt-7 flex justify-center gap-2.5 ]">
          <Button btnText={nobtnText ?? t(LocalizedStrings.common.no)} onPress={closeModal} />
          <Button
            btnText={yesbtnText ?? t(LocalizedStrings.common.yes)}
            className={`!bg-primary !border-primary ${loading ? "opacity-50" : ""}`}
            onPress={deleteSchedule}
          />
        </View>
      </View>
    </BlurModal>
  );
};

export default DeleteSchedule;
