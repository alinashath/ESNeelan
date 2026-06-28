import {
  APP_DISPLAY_NAME,
  COMPANY_NAME,
  CONTACT_EMAIL,
  CONTACT_PHONE,
  CONTACT_PHONE_DISPLAY,
} from "@/src/lib/brand";
import { HeaderBrandMark } from "@/src/components/ui/HeaderLogoRow";
import { Platform, Pressable, StyleSheet, Text, View, Linking } from "react-native";
import { appleSpacing, colors, fontFamilies, space } from "@/src/theme/tokens";

/** Web-only marketing footer — brand, contact, company credit. */
export function HomeMarketingFooter() {
  if (Platform.OS !== "web") return null;

  return (
    <View style={styles.shell}>
      <View style={styles.content}>
        <HeaderBrandMark />

        <View style={styles.contactBlock}>
          <Text style={styles.contactHeading}>Contact us</Text>
          <Pressable
            onPress={() => void Linking.openURL(`tel:${CONTACT_PHONE}`)}
            accessibilityRole="link"
            accessibilityLabel={`Phone ${CONTACT_PHONE_DISPLAY}`}
            style={({ pressed }) => [styles.contactRow, pressed && { opacity: 0.75 }]}
          >
            <Text style={styles.contactLink}>{CONTACT_PHONE_DISPLAY}</Text>
          </Pressable>
          <Pressable
            onPress={() => void Linking.openURL(`mailto:${CONTACT_EMAIL}`)}
            accessibilityRole="link"
            accessibilityLabel={`Email ${CONTACT_EMAIL}`}
            style={({ pressed }) => [styles.contactRow, pressed && { opacity: 0.75 }]}
          >
            <Text style={styles.contactLink}>{CONTACT_EMAIL}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.bottomRow}>
        <Text style={styles.meta}>© 2026 {APP_DISPLAY_NAME}. All rights reserved.</Text>
        <Text style={styles.meta}>Product of {COMPANY_NAME}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    marginTop: appleSpacing.section,
    paddingTop: appleSpacing.lg,
    paddingBottom: space.xxl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
    maxWidth: 1120,
    alignSelf: "center",
    width: "100%",
  },
  content: {
    gap: space.lg,
    marginBottom: appleSpacing.lg,
  },
  contactBlock: {
    gap: space.xs,
  },
  contactHeading: {
    fontFamily: fontFamilies.headingSerif,
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: space.xs,
  },
  contactRow: {
    alignSelf: "flex-start",
  },
  contactLink: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: 14,
    lineHeight: 22,
    color: colors.primary,
    fontWeight: "600",
  },
  bottomRow: {
    gap: space.xs,
    paddingTop: space.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  meta: {
    fontFamily: fontFamilies.body,
    fontSize: 11,
    lineHeight: 15,
    color: colors.textMuted,
  },
});
