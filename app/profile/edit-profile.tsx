import {
  StyleSheet,
  TouchableOpacity,
  View,
  Text,
  Image,
  ImageSourcePropType,
  Pressable,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useTranslation } from "react-i18next";
import { fontFamily, Theme, useTheme } from "@/theme";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/authStore";
import IconCamera from "@/components/icons/IconCamera";
import ChoosePhoto from "@/components/profile/ChoosePhoto";
import ChooseGender from "@/components/profile/ChooseGender";
import ChooseBirthYear from "@/components/profile/ChooseBirthYear";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import { useForm } from "react-hook-form";
import { Loader } from "@/components/shared/loader";
import { ProfileUpdateRequest } from "@/services/api/auth";
import { Images } from "@/assets";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import { COUNTRIES } from "../(onboarding)/country-language";
import { AlertPresets } from "@/utils/alert";
import { useAlert } from "@/provider/AlertProvider";
import { Input } from "@/components/ui/TextInput/input";
import ChooseCountry from "@/components/profile/ChooseCountry";
import { SafeAreaView } from "react-native-safe-area-context";
import BackButton from "@/components/BackButton";

type FormData = {
  name: string;
  email: string;
  birthYear: number | null;
  gender: string | null;
  country: string | null;
  avatarUrl: string | null;
  bio: string | null;
  username: string | null;
  phone: string | null;
};

export default function EditProfileScreen() {
  const { t } = useTranslation();
  const alert = useAlert();
  const theme = useTheme();
  const router = useRouter();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { user, updateProfile, isLoading } = useAuthStore();
  const [chooseIsOpen, setChooseIsOpen] = useState(false);
  const [yearIsOpen, setYearIsOpen] = useState(false);
  const [genderIsOpen, setGenderIsOpen] = useState(false);
  const [countryIsOpen, setCountryIsOpen] = useState(false);

  const { control, handleSubmit, setValue, watch } = useForm<FormData>({
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      name: `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim(),
      email: user?.email ?? "",
      birthYear: user?.birthYear ?? null,
      gender: user?.gender ?? null,
      country: user?.country ?? null,
      avatarUrl: user?.avatarUrl ?? null,
      bio: user?.bio ?? null,
      phone: user?.phoneNumber ?? null,
      username: user?.username ?? null,
    },
  });

  const { name, birthYear, gender, country, avatarUrl, bio, phone, username } = watch();

  // Map country code → display name
  const countryLabel = useMemo(() => {
    if (!country) return null;
    return COUNTRIES.find((c) => c.code === country)?.name ?? country;
  }, [country]);

  const displayName = useMemo(() => {
    if (!user) return null;
    if (user.firstName) return user.firstName;
    return (user.email || "").split("@")[0];
  }, [user]);

  const avatarInitial = displayName?.charAt(0).toUpperCase();

  const avatarSource = useMemo(() => {
    if (!avatarUrl) {
      return user?.avatarUrl ? { uri: user.avatarUrl } : undefined;
    }
    if (avatarUrl.startsWith("http") || avatarUrl.startsWith("file")) {
      return { uri: avatarUrl };
    }
    return Images.cover[avatarUrl as keyof typeof Images.cover];
  }, [avatarUrl, user?.avatarUrl]);

  const isFormDirty = useMemo(() => {
    if (!user) return false;
    const fullName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
    return (
      name.trim() !== fullName ||
      birthYear !== user.birthYear ||
      gender !== user.gender ||
      (country ?? "") !== (user.country ?? "") ||
      (avatarUrl ?? "") !== (user.avatarUrl ?? "") ||
      (bio ?? "") !== (user.bio ?? "") ||
      (phone ?? "") !== (user.phoneNumber ?? "") ||
      (username ?? "") !== (user.username ?? "")
    );
  }, [name, birthYear, gender, country, avatarUrl, user, bio, username, phone]);

  const handleChooseClose = useCallback(() => {
    setChooseIsOpen((prev) => !prev);
  }, []);

  const OnSelectImage = useCallback(
    (image: { source: ImageSourcePropType; url: string }) => {
      setValue("avatarUrl", image.url);
      handleChooseClose();
    },
    [handleChooseClose],
  );

  const onSelectLocalImage = useCallback(
    (image: string) => {
      setValue("avatarUrl", image);
      handleChooseClose();
    },
    [handleChooseClose],
  );

  const handleGenderClose = useCallback(() => setGenderIsOpen((prev) => !prev), []);
  const handleyearClose = useCallback(() => setYearIsOpen((prev) => !prev), []);
  const handleCountryClose = useCallback(() => setCountryIsOpen((prev) => !prev), []);

  const getChangedFields = useCallback(() => {
    if (!user) return {};
    const changed: Partial<FormData> = {};
    if (name !== `${user.firstName} ${user.lastName}`) changed.name = name;
    if (birthYear !== user.birthYear) changed.birthYear = birthYear;
    if (gender !== user.gender) changed.gender = gender;
    if (country !== user.country) changed.country = country; // code comparison
    if (avatarUrl !== user.avatarUrl) changed.avatarUrl = avatarUrl;
    if (bio !== user.bio) changed.bio = bio;
    if (username !== user.username) changed.username = username;
    if (phone !== user.phoneNumber) changed.phone = phone;
    return changed;
  }, [name, birthYear, gender, country, avatarUrl, user, bio, phone, username]);

  const handleProfileUpdate = useCallback(async () => {
    try {
      if (!user) return;

      const changedFields: Partial<FormData> = getChangedFields();
      if (!Object.keys(changedFields).length) {
        alert.show(AlertPresets.error(t(LocalizedStrings.profile.no_change_detected)));
        return;
      }

      const nameParts = changedFields.name?.trim().split(" ").filter(Boolean) || [];
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      const requestBody: ProfileUpdateRequest = {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(changedFields.birthYear !== undefined && {
          birthYear: String(changedFields.birthYear),
        }),
        ...(changedFields.gender && { gender: changedFields.gender }),
        ...(changedFields.country && { country: changedFields.country }), // sends code to API
        ...(changedFields.avatarUrl && { avatarUrl: changedFields.avatarUrl }),
        ...(changedFields.bio && { bio: changedFields.bio }),
        ...(changedFields.username && { username: changedFields.username }),
        ...(changedFields.phone && { phoneNumber: changedFields.phone }),
      };

      const message = await updateProfile(requestBody);
      Alert.alert(t(LocalizedStrings.common.success), message, [
        { text: t(LocalizedStrings.common.ok), onPress: router.back },
      ]);
    } catch (error) {
      alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
    }
  }, [name, birthYear, gender, country, avatarUrl, updateProfile, user, phone, username]);

  return (
    <>
      {isLoading && <Loader />}
      <KeyboardAvoidingView
        style={[styles.safeArea, { backgroundColor: theme.colors.background.default }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        <SafeAreaView>
          <ScrollView
            style={styles.container}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            <BackButton />

            <View style={styles.avatarWrapperOuter}>
              <View style={styles.avatarWrapper}>
                {avatarSource ? (
                  <Image source={avatarSource} style={styles.avatarUrl} />
                ) : (
                  <Text style={styles.avatarInitial}>{avatarInitial}</Text>
                )}
                <TouchableOpacity onPress={() => setChooseIsOpen(true)} style={styles.cameraButton}>
                  <IconCamera />
                </TouchableOpacity>
              </View>
            </View>

            <Input
              control={control}
              name="name"
              inputStyle={styles.inputStyle}
              label={LocalizedStrings.profile.fullName}
              placeholder={LocalizedStrings.profile.placeHolders.fullName}
              autoCapitalize="words"
              rules={{
                minLength: {
                  value: 2,
                  message: t(LocalizedStrings.errors.validation.minLength, { count: 2 }),
                },
                maxLength: {
                  value: 50,
                  message: t(LocalizedStrings.errors.validation.maxLength, { count: 50 }),
                },
                pattern: {
                  value: /^[a-zA-Z\s]+$/,
                  message: t(LocalizedStrings.errors.validation.name.invalid),
                },
              }}
            />
            <Input
              control={control}
              name="email"
              inputStyle={styles.inputStyle}
              label={LocalizedStrings.profile.email}
              placeholder={LocalizedStrings.profile.placeHolders.email}
              editable={false}
            />
            <Input
              control={control}
              name="bio"
              inputStyle={{ fontSize: moderateScale(14) }}
              label={LocalizedStrings.profile.bio}
              placeholder={LocalizedStrings.profile.placeHolders.bio}
              multiline
              numberOfLines={4}
              rules={{
                maxLength: {
                  value: 160,
                  message: t(LocalizedStrings.errors.validation.maxLength, { count: 160 }),
                },
              }}
            />
            <Input
              control={control}
              name="username"
              inputStyle={styles.inputStyle}
              label={LocalizedStrings.profile.username}
              placeholder={LocalizedStrings.profile.placeHolders.username}
              rules={{
                minLength: {
                  value: 3,
                  message: t(LocalizedStrings.errors.validation.minLength, { count: 3 }),
                },
                maxLength: {
                  value: 30,
                  message: t(LocalizedStrings.errors.validation.maxLength, { count: 30 }),
                },
                pattern: {
                  value: /^[a-zA-Z0-9_]+$/,
                  message: "Only letters, numbers, and underscores allowed",
                },
              }}
            />
            <Input
              control={control}
              name="phone"
              inputStyle={styles.inputStyle}
              label={LocalizedStrings.profile.phone}
              placeholder={LocalizedStrings.profile.placeHolders.phone}
              keyboardType="phone-pad"
              rules={{
                pattern: {
                  value: /^\+?[0-9]{7,15}$/,
                  message: "Enter a valid phone number",
                },
              }}
            />

            {/* Birth Year */}
            <View style={styles.section}>
              <Text>{t(LocalizedStrings.profile.birthYear)}</Text>
              <Pressable onPress={handleyearClose} style={styles.infoSection}>
                <Text
                  style={{
                    color: birthYear ? theme.colors.text.primary : theme.colors.text.disabled,
                  }}
                >
                  {birthYear ?? t(LocalizedStrings.profile.placeHolders.birthYear)}
                </Text>
              </Pressable>
            </View>

            {/* Gender */}
            <View style={styles.section}>
              <Text>{t(LocalizedStrings.profile.gender.title)}</Text>
              <Pressable onPress={handleGenderClose} style={styles.infoSection}>
                <Text
                  style={{ color: gender ? theme.colors.text.primary : theme.colors.text.disabled }}
                >
                  {gender ?? t(LocalizedStrings.profile.placeHolders.gender)}
                </Text>
              </Pressable>
            </View>

            <View style={styles.section}>
              <Text>{t(LocalizedStrings.profile.country)}</Text>
              <Pressable onPress={handleCountryClose} style={styles.infoSection}>
                <Text
                  style={{
                    color: country ? theme.colors.text.primary : theme.colors.text.disabled,
                  }}
                >
                  {countryLabel ?? t(LocalizedStrings.profile.placeHolders.country)}
                </Text>
              </Pressable>
            </View>

            <Button
              title={t(LocalizedStrings.profile.save_changes)}
              onPress={handleSubmit(handleProfileUpdate)}
              style={styles.button}
              loading={isLoading}
              textStyle={styles.btnTextStyle}
              rightIcon={null}
              disabled={!isFormDirty}
            />
          </ScrollView>
          <ChoosePhoto
            setImage={onSelectLocalImage}
            isVisible={chooseIsOpen}
            onClose={handleChooseClose}
            OnSelectImage={OnSelectImage}
          />
          <ChooseGender
            isVisible={genderIsOpen}
            onClose={handleGenderClose}
            onSave={(label) => setValue("gender", label)}
          />
          <ChooseBirthYear
            selected={user?.birthYear?.toString()}
            onClose={handleyearClose}
            isVisible={yearIsOpen}
            onSave={(label) => setValue("birthYear", parseInt(label))}
          />
          <ChooseCountry
            selected={country ?? user?.country}
            onClose={handleCountryClose}
            isVisible={countryIsOpen}
            onSave={(code) => setValue("country", code)}
          />
        </SafeAreaView>
      </KeyboardAvoidingView>
    </>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
    },
    container: {
      padding: verticalScale(16),
      paddingTop: verticalScale(30),
    },
    contentContainer: {
      paddingBottom: verticalScale(80),
    },
    section: {
      marginTop: verticalScale(20),
      gap: verticalScale(10),
    },
    avatarWrapperOuter: {
      justifyContent: "center",
      flexDirection: "row",
      marginTop: verticalScale(40),
    },
    avatarWrapper: {
      aspectRatio: 1,
      height: verticalScale(140),
      borderRadius: 999,
      backgroundColor: theme.colors.primary.main,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: verticalScale(10),
      position: "relative",
    },
    avatarUrl: {
      objectFit: "cover",
      borderRadius: 999,
      aspectRatio: 1,
      height: verticalScale(140),
    },
    avatarInitial: {
      color: theme.colors.text.primary,
      fontSize: moderateScale(24),
      fontWeight: "400" as const,
      fontFamily: fontFamily.gascogneSerial.regular,
    },
    infoSection: {
      flexDirection: "row",
      alignItems: "center",
      padding: verticalScale(10),
      minHeight: verticalScale(40),
      borderWidth: scale(1),
      borderColor: theme.colors.divider,
      backgroundColor: theme.colors.white,
      borderRadius: moderateScale(10),
    },
    cameraButton: {
      aspectRatio: 1,
      height: verticalScale(40),
      borderWidth: moderateScale(3),
      borderColor: theme.colors.white,
      borderRadius: 999,
      backgroundColor: theme.colors.primary.main,
      position: "absolute",
      bottom: 0,
      right: 0,
      justifyContent: "center",
      alignItems: "center",
    },
    button: {
      marginTop: verticalScale(30),
    },
    btnTextStyle: {
      fontSize: moderateScale(20),
    },
    inputStyle: {
      fontSize: moderateScale(14),
      height: verticalScale(40),
    },
  });
