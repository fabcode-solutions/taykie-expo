import { ThemeText } from "@/components";
import AuthScreenLayout from "@/components/shared/layout/AuthScreenLayout";
import { verticalScale } from "@/utils/scale";
import { router } from "expo-router";

const TermsAndConditionsScreen = () => {
  const handleBack = () => {
    router.back();
  };

  return (
    <AuthScreenLayout onBack={handleBack}>
      <ThemeText variant="manrope.h2">Terms and Conditions</ThemeText>
      <ThemeText variant="manrope.body2" style={{ lineHeight: verticalScale(30) }}>
        Effective Date: April 17, 2026{"\n"}
        Last Updated: April 17, 2026{"\n\n"}
        <ThemeText variant="manrope.h5">1. Acceptance of Terms{"\n"}</ThemeText>
        By downloading, installing, or using the Taykie mobile application ("App"), you agree to be
        bound by these Terms and Conditions ("Terms"). If you do not agree, do not use the App.
        {"\n"}
        These Terms constitute a legally binding agreement between you and Taykie ("we," "our," or
        "us").{"\n\n"}
        <ThemeText variant="manrope.h5">2. Description of Service{"\n"}</ThemeText>
        Taykie is a wellness supplement tracking platform that allows you to:{"\n"}• Create and
        manage supplement and medication schedules{"\n"}• Track dose adherence, streaks, and history
        {"\n"}• Connect and sync with the Taykie Smart Pill Box device via Bluetooth{"\n"}•
        Participate in a health-focused community (posts, groups, comments){"\n"}• Receive push
        notifications for reminders and alerts{"\n\n"}
        Taykie is a wellness tool only and is not a medical device, does not provide medical advice,
        and is not a substitute for professional medical guidance.{"\n\n"}
        <ThemeText variant="manrope.h5">3. Eligibility{"\n"}</ThemeText>
        You must be at least 13 years old to use Taykie. By using the App, you represent that you
        meet this age requirement. If you are between 13 and 18, you represent that you have
        parental or guardian consent.{"\n\n"}
        <ThemeText variant="manrope.h5">4. Account Registration{"\n"}</ThemeText>
        To use Taykie you must create an account. You agree to:{"\n"}• Provide accurate and complete
        information{"\n"}• Keep your login credentials secure{"\n"}• Not share your account{"\n"}•
        Notify us at support@taykie.com if unauthorized access occurs{"\n\n"}
        You are responsible for all activity under your account.{"\n\n"}
        <ThemeText variant="manrope.h5">5. Acceptable Use{"\n"}</ThemeText>
        You agree not to:{"\n"}• Post harmful or misleading content{"\n"}• Harass or abuse others
        {"\n"}• Impersonate others{"\n"}• Upload malware{"\n"}• Access systems without permission
        {"\n"}• Use for unauthorized commercial purposes{"\n\n"}
        We may suspend accounts violating these rules.{"\n\n"}
        <ThemeText variant="manrope.h5">6. Community Content{"\n"}</ThemeText>
        You retain ownership of your content but grant Taykie a license to use it for operating the
        service.{"\n"}
        You are solely responsible for the content you post. Do not share personal health
        information publicly that you would not want others to see.{"\n"}
        We reserve the right to remove content that violates these Terms or our Community
        Guidelines.{"\n\n"}
        <ThemeText variant="manrope.h5">7. Health Disclaimer{"\n"}</ThemeText>
        Taykie is not a medical device and does not provide medical advice. Always consult a
        qualified healthcare provider.{"\n\n"}
        The supplement and medication information displayed in the app is entered by you and is not
        verified by medical professionals Dose reminders are for personal tracking purposes only and
        are not a substitute for professional medical supervision Never ignore professional medical
        advice or delay seeking it because of something you read or tracked in Taykie Always consult
        a qualified healthcare provider before starting, stopping, or changing any medication or
        supplement{"\n\n"}
        <ThemeText variant="manrope.h5">8. Smart Pill Box Device{"\n"}</ThemeText>
        Taykie is not liable for missed doses due to device issues.{"\n\n"}
        The device is subject to separate hardware terms provided at purchase Taykie is not liable
        for missed doses resulting from device malfunction, connectivity issues, or battery failure
        Keep the device software updated for optimal performance and security Do not attempt to
        modify, reverse-engineer, or tamper with the device{"\n\n"}
        <ThemeText variant="manrope.h5">9. Intellectual Property{"\n"}</ThemeText>
        All platform content belongs to Taykie.{"\n\n"}
        <ThemeText variant="manrope.h5">10. Third-Party Services{"\n"}</ThemeText>
        Use of Google, Apple, Firebase services is subject to their policies.{"\n\n"}
        <ThemeText variant="manrope.h5">11. Account Deletion{"\n"}</ThemeText>
        You may delete your account at any time through Settings → Account → Delete Account. Upon
        deletion:{"\n\n"}
        Your account enters a 30-day grace period during which you can restore it After 30 days,
        your account and data are permanently and irreversibly deleted Content you posted in
        community spaces may remain in anonymized form
        {"\n\n"}
        <ThemeText variant="manrope.h5">12. Termination{"\n"}</ThemeText>
        We may suspend or terminate your account at any time, with or without notice, if we believe
        you have violated these Terms or if required by law. {"\n"}
        You may also terminate your account at any time as described above. Upon termination, your
        right to use the App ceases immediately.
        {"\n\n"}
        <ThemeText variant="manrope.h5">13. Limitation of Liability{"\n"}</ThemeText>
        To the fullest extent permitted by law, Taykie shall not be liable for:{"\n\n"}
        Any indirect, incidental, special, or consequential damages Loss of data, missed doses, or
        health outcomes arising from use or inability to use the App Damages resulting from
        unauthorized access to your account Any content posted by other users{"\n\n"}
        Our total liability to you for any claim arising out of these Terms shall not exceed the
        amount you paid us in the 12 months preceding the claim (or $100 if you have not paid
        anything).{"\n\n"}
        <ThemeText variant="manrope.h5">14. Disclaimer of Warranties{"\n"}</ThemeText>
        The App is provided "as is" and "as available" without warranties of any kind, express or
        implied, including but not limited to warranties of merchantability, fitness for a
        particular purpose, or non-infringement. We do not warrant that the App will be error-free,
        uninterrupted, or free of harmful components.
        {"\n\n"}
        <ThemeText variant="manrope.h5">15. Governing Law{"\n"}</ThemeText>
        These Terms are governed by the laws of Australia, without regard to its conflict of law
        provisions. Any disputes shall be resolved in the courts of New South Wales, Australia.
        {"\n\n"}
        <ThemeText variant="manrope.h5">16. Changes to Terms{"\n"}</ThemeText>
        We may update these Terms from time to time. We will notify you of material changes by push
        notification or email at least 7 days before the changes take effect. Continued use after
        the effective date constitutes your acceptance.
        {"\n\n"}
        <ThemeText variant="manrope.h5">17. Contact Us{"\n"}</ThemeText>
        For questions about these Terms:{"\n"}
        Taykie legal@taykie.com{"\n"}
        support@taykie.com{"\n"}
        legal@taykie.com{"\n"}
      </ThemeText>
    </AuthScreenLayout>
  );
};

export default TermsAndConditionsScreen;
