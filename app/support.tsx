import { WebLegalPage } from "@/src/components/web/WebLegalPage";
import { SUPPORT_INTRO, SUPPORT_SECTIONS } from "@/src/lib/web-legal-copy";
import { APP_DISPLAY_NAME } from "@/src/lib/brand";
import { colors, fontFamilies } from "@/src/theme/tokens";
import { Link } from "expo-router";
import { Text } from "react-native";

export default function SupportScreen() {
  return (
    <WebLegalPage
      title="Support"
      description={`Contact ${APP_DISPLAY_NAME} for account, listing, and marketplace help.`}
      canonicalPath="/support"
      intro={SUPPORT_INTRO}
      sections={SUPPORT_SECTIONS}
      footerLinks={
        <>
          <Link href="/privacy" accessibilityRole="link">
            <Text style={linkStyle}>Privacy Policy</Text>
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
