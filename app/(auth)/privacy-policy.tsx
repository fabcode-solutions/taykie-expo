import { ThemeText } from "@/components";
import AuthScreenLayout from "@/components/shared/layout/AuthScreenLayout";
import { verticalScale } from "@/utils/scale";
import { router } from "expo-router";

const PrivacyPolicyScreen = () => {
  const handleBack = () => {
    router.back();
  };

  return (
    <AuthScreenLayout onBack={handleBack}>
      <ThemeText variant="manrope.h2">Privacy Policy</ThemeText>

      <ThemeText variant="manrope.body2" style={{ lineHeight: verticalScale(30) }}>
        Effective Date: April 17, 2026{"\n"}
        Last Updated: April 17, 2026{"\n\n"}
        <ThemeText variant="manrope.h5">1. Introduction{"\n"}</ThemeText>
        Welcome to Taykie ("we," "our," or "us"). Taykie is a wellness supplement tracking platform
        that helps you manage your medication schedules, connect with a health community, and sync
        with your Taykie Smart Pill Box device.{"\n"}
        This Privacy Policy explains what information we collect, how we use it, who we share it
        with, and the choices you have. By using Taykie, you agree to the practices described in
        this policy.{"\n\n"}
        <ThemeText variant="manrope.h5">2. Information We Collect{"\n"}</ThemeText>
        Information you provide directly:{"\n\n"}
        Account details: name, email address, password, username, profile photo{"\n"}
        Onboarding data: country, language, dose frequency, supplement names and dosages, refill
        preferences, reminder settings{"\n"}
        Health and medication data: supplement names, dosages, schedules, dose history, adherence
        records, dose notes and logs{"\n"}
        Community content: posts, comments, poll votes, group memberships, likes, bookmarks{"\n"}
        Communications: support requests, feedback, reports submitted about other users{"\n\n"}
        Information collected automatically:{"\n\n"}
        Device information: device type, operating system, app version{"\n"}
        Usage data: features used, screens visited, session duration, error logs{"\n"}
        Push notification tokens (FCM) for delivering reminders{"\n"}
        BLE device data: Smart Pill Box connection status, compartment state, sync sessions,
        medication history uploaded from the device{"\n\n"}
        Information from third parties:{"\n\n"}
        If you sign in with Google or Apple, we receive your name, email address, and a unique
        identifier from that provider. We do not receive your password from these providers.
        {"\n\n"}
        <ThemeText variant="manrope.h5">3. How We Use Your Information{"\n"}</ThemeText>
        We use your information to:{"\n\n"}
        Create and manage your account{"\n"}
        Deliver dose reminders, snooze notifications, refill alerts, and missed dose alerts{"\n"}
        Sync data with your Taykie Smart Pill Box via Bluetooth{"\n"}
        Display your schedule history, streaks, adherence insights, and monthly calendar{"\n"}
        Power community features including posts, groups, comments, and suggested connections
        {"\n"}
        Recommend groups and users based on your activity and social connections{"\n"}
        Generate your data export when requested{"\n"}
        Respond to support requests and investigate reported content{"\n"}
        Improve our product through anonymized analytics{"\n"}
        Comply with legal obligations{"\n\n"}
        <ThemeText variant="manrope.h5">4. Health Data{"\n"}</ThemeText>
        Taykie collects and stores health-related information including supplement names, dosages,
        schedules, and adherence history. This data is:{"\n\n"}
        Used only to provide the service to you{"\n"}
        Never sold to advertisers or third-party data brokers{"\n"}
        Never used to make automated decisions about your medical care{"\n"}
        Stored securely and accessible only to you and authorized Taykie staff{"\n\n"}
        Taykie is not a medical device and does not provide medical advice. Always consult a
        healthcare professional regarding your medications and supplements.{"\n\n"}
        <ThemeText variant="manrope.h5">5. Sharing Your Information{"\n"}</ThemeText>
        We do not sell your personal information. We may share it in the following circumstances:
        {"\n"}
        With service providers: We use trusted third-party providers (cloud hosting, push
        notification services, analytics) who process data on our behalf under strict data
        processing agreements.{"\n"}
        With other users: Your public profile, posts, group memberships, and community activity are
        visible to other Taykie users as part of the social features. You control what you post.
        {"\n"}
        For legal reasons: We may disclose information if required by law, court order, or to
        protect the rights and safety of Taykie, our users, or the public.{"\n"}
        Business transfers: If Taykie is acquired or merges with another company, your information
        may be transferred as part of that transaction. We will notify you before this occurs.
        {"\n\n"}
        <ThemeText variant="manrope.h5">6. Data Retention{"\n"}</ThemeText>
        We retain your data for as long as your account is active. If you delete your account:
        {"\n\n"}
        Your account is soft-deleted and enters a 30-day grace window during which you can restore
        it{"\n"}
        After 30 days your account and associated data are permanently deleted{"\n"}
        Some data may be retained in anonymized form for analytics purposes{"\n"}
        Data required for legal compliance may be retained for longer periods{"\n\n"}
        <ThemeText variant="manrope.h5">7. Your Rights{"\n"}</ThemeText>
        Depending on your location, you may have the right to:{"\n\n"}
        Access the personal data we hold about you (use the Export Data feature in Settings)
        {"\n"}
        Correct inaccurate data (via Profile Settings){"\n"}
        Delete your account and data (via Account Settings){"\n"}
        Withdraw consent at any time where processing is based on consent{"\n"}
        Lodge a complaint with a supervisory authority{"\n\n"}
        To exercise any of these rights, contact us at privacy@taykie.com.{"\n\n"}
        <ThemeText variant="manrope.h5">8. Push Notifications{"\n"}</ThemeText>
        We send push notifications for dose reminders, missed doses, snooze expiry, and community
        activity. You can manage notification preferences in the app under Settings → Notifications,
        or through your device's notification settings.{"\n\n"}
        <ThemeText variant="manrope.h5">9. BLE Device Data{"\n"}</ThemeText>
        When you pair a Taykie Smart Pill Box, the app communicates with the device over Bluetooth
        Low Energy (BLE). Data synced from your device (compartment status, dose history) is stored
        securely in your account and subject to this policy. You can unpair your device at any time
        in Settings → Device.{"\n\n"}
        <ThemeText variant="manrope.h5">10. Children's Privacy{"\n"}</ThemeText>
        Taykie is not intended for children under the age of 13. We do not knowingly collect
        personal information from children under 13. If you believe a child has provided us with
        personal information, please contact us and we will delete it promptly.{"\n\n"}
        <ThemeText variant="manrope.h5">11. Security{"\n"}</ThemeText>
        We implement industry-standard security measures including encrypted data transmission
        (TLS), hashed passwords, access controls, and regular security reviews. No system is
        completely secure — if you believe your account has been compromised, contact us immediately
        at security@taykie.com.{"\n\n"}
        <ThemeText variant="manrope.h5">12. Changes to This Policy{"\n"}</ThemeText>
        We may update this Privacy Policy from time to time. We will notify you of significant
        changes by sending a push notification or email before the changes take effect. Continued
        use of Taykie after the effective date constitutes acceptance of the updated policy.
        {"\n\n"}
        <ThemeText variant="manrope.h5">13. Contact Us{"\n"}</ThemeText>
        Taykie{"\n"}
        privacy@taykie.com{"\n"}
        support@taykie.com
      </ThemeText>
    </AuthScreenLayout>
  );
};

export default PrivacyPolicyScreen;
