import React, { useCallback } from "react";
import { router } from "expo-router";
import OnboardingLayout from "@/components/onboarding/OnboardingLayout";
import DeviceRegistrationForm from "@/components/device/DeviceRegistrationForm";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { useRegistrationNudgeStore } from "@/stores/registrationNudgeStore";

/**
 * Onboarding step shown right after a successful Bluetooth pairing: register the
 * Taykie's serial number for warranty. Skippable — "Skip for now" starts the 48-hour
 * reminder clock (see registrationNudgeStore).
 */
export default function DeviceRegistrationOnboardingScreen() {
  const currentStep = useOnboardingStore((s) => s.currentStep);
  const totalSteps = useOnboardingStore((s) => s.totalSteps);
  const nextStep = useOnboardingStore((s) => s.nextStep);
  const prevStep = useOnboardingStore((s) => s.prevStep);
  const markSkipped = useRegistrationNudgeStore((s) => s.markSkipped);

  const goNext = useCallback(() => {
    nextStep();
    router.push("/(onboarding)/dosage-frequency");
  }, [nextStep]);

  const handleSkip = useCallback(() => {
    markSkipped();
    goNext();
  }, [markSkipped, goNext]);

  const handleBack = useCallback(() => {
    prevStep();
    router.back();
  }, [prevStep]);

  return (
    <OnboardingLayout
      currentStep={currentStep}
      totalSteps={totalSteps}
      onBack={handleBack}
      showBack
    >
      <DeviceRegistrationForm mode="onboarding" onDone={goNext} onSkip={handleSkip} />
    </OnboardingLayout>
  );
}
