import { Screen } from "@/src/components/ui/Screen";
import { TextBody } from "@/src/components/ui/TextBody";
import { TextCaption } from "@/src/components/ui/TextCaption";
import { TextTitle } from "@/src/components/ui/TextTitle";
import { COMMUNITY_STANDARDS, TERMS_VERSION } from "@/src/lib/community-standards";
import { APP_DISPLAY_NAME, COMPANY_NAME, CONTACT_EMAIL } from "@/src/lib/brand";
import { colors, space } from "@/src/theme/tokens";
import { View } from "react-native";

export default function TermsScreen() {
  return (
    <Screen scroll>
      <TextCaption style={{ color: colors.textMuted }}>LEGAL · VERSION {TERMS_VERSION}</TextCaption>
      <TextTitle style={{ marginTop: space.sm }}>Terms of Use & Community Standards</TextTitle>
      <TextBody style={{ marginTop: space.lg, color: colors.textSecondary }}>
        These terms govern your use of {APP_DISPLAY_NAME}, operated by {COMPANY_NAME}. By creating an account or signing in, you agree to follow them.
      </TextBody>

      <TextTitle style={{ marginTop: space.xxl, fontSize: 24 }}>Zero tolerance for abuse</TextTitle>
      {COMMUNITY_STANDARDS.map((item) => (
        <View key={item} style={{ flexDirection: "row", gap: space.sm, marginTop: space.md }}>
          <TextBody>•</TextBody><TextBody style={{ flex: 1 }}>{item}</TextBody>
        </View>
      ))}

      <TextTitle style={{ marginTop: space.xxl, fontSize: 24 }}>Marketplace terms</TextTitle>
      <TextBody style={{ marginTop: space.md, color: colors.textSecondary }}>
        Users are responsible for accurate listings and lawful items. Bids and sale commitments must be made in good faith. Buyers and sellers arrange payment and delivery directly; {APP_DISPLAY_NAME} does not hold auction payments.
      </TextBody>
      <TextBody style={{ marginTop: space.md, color: colors.textSecondary }}>
        We may filter or reject content, investigate reports, remove listings, suspend or permanently eject users, and preserve evidence where required for safety or law enforcement.
      </TextBody>

      <TextTitle style={{ marginTop: space.xxl, fontSize: 24 }}>Contact</TextTitle>
      <TextBody style={{ marginTop: space.md, marginBottom: space.xxl }}>
        Questions or safety concerns: {CONTACT_EMAIL}
      </TextBody>
    </Screen>
  );
}
