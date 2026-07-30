import { WebLegalPage } from "@/src/components/web/WebLegalPage";
import {
  PRIVACY_INTRO,
  PRIVACY_LAST_UPDATED,
  PRIVACY_SECTIONS,
} from "@/src/lib/web-legal-copy";
import { APP_DISPLAY_NAME } from "@/src/lib/brand";
import { colors, fontFamilies } from "@/src/theme/tokens";
import { Link } from "expo-router";
import { Text } from "react-native";

export default function PrivacyScreen() {
  return (
    <WebLegalPage
      title="Privacy Policy"
      description={`How ${APP_DISPLAY_NAME} collects, uses, and protects your information.`}
      canonicalPath="/privacy"
      lastUpdated={PRIVACY_LAST_UPDATED}
      intro={PRIVACY_INTRO}
      sections={PRIVACY_SECTIONS}
      footerLinks={
        <>
          <Link href="/support" accessibilityRole="link">
            <Text style={linkStyle}>Support</Text>
          </Link>
          <Link href="/(tabs)" accessibilityRole="link">
            <Text style={linkStyle}>Back to home</Text>
          </Link>
        </>
      }
    />
  );
}

const linkStyle = {
  fontFamily: fontFamilies.bodySemiBold,
  fontSize: 14,
  color: colors.primary,
  fontWeight: "600" as const,
};
