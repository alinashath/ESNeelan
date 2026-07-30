import { SiteSeoHead } from "@/src/components/web/SiteSeoHead";
import { HeaderBrandMark } from "@/src/components/ui/HeaderLogoRow";
import { Screen } from "@/src/components/ui/Screen";
import { TextBody } from "@/src/components/ui/TextBody";
import { TextTitle } from "@/src/components/ui/TextTitle";
import { APP_DISPLAY_NAME } from "@/src/lib/brand";
import { colors, fontFamilies, space } from "@/src/theme/tokens";
import { Link, Redirect } from "expo-router";
import type { ReactNode } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

type Section = { title: string; paragraphs: string[] };

type Props = {
  title: string;
  description: string;
  canonicalPath: "/privacy" | "/support";
  lastUpdated?: string;
  intro: string;
  sections: Section[];
  footerLinks?: ReactNode;
};

/** Shared chrome for web-only legal / help pages. */
export function WebLegalPage({
  title,
  description,
  canonicalPath,
  lastUpdated,
  intro,
  sections,
  footerLinks,
}: Props) {
  if (Platform.OS !== "web") {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <>
      <SiteSeoHead title={`${title} | ${APP_DISPLAY_NAME}`} description={description} canonicalPath={canonicalPath} />
      <Screen scroll>
        <View style={styles.masthead}>
          <Link href="/(tabs)" accessibilityRole="link" accessibilityLabel={`${APP_DISPLAY_NAME} home`}>
            <HeaderBrandMark />
          </Link>
        </View>

        <Text style={styles.eyebrow}>{canonicalPath === "/privacy" ? "Legal" : "Help"}</Text>
        <TextTitle style={styles.title}>{title}</TextTitle>
        {lastUpdated ? <Text style={styles.updated}>Last updated {lastUpdated}</Text> : null}
        <TextBody style={styles.intro}>{intro}</TextBody>

        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.paragraphs.map((p) => (
              <TextBody key={p.slice(0, 48)} style={styles.paragraph}>
                {p}
              </TextBody>
            ))}
          </View>
        ))}

        {footerLinks ? <View style={styles.footerLinks}>{footerLinks}</View> : null}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  masthead: {
    marginBottom: space.xl,
    alignSelf: "flex-start",
  },
  eyebrow: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: colors.textMuted,
    marginBottom: space.sm,
  },
  title: {
    marginBottom: space.sm,
  },
  updated: {
    fontFamily: fontFamilies.body,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
    marginBottom: space.lg,
  },
  intro: {
    color: colors.textSecondary,
    marginBottom: space.xl,
  },
  section: {
    marginBottom: space.xl,
    paddingTop: space.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    gap: space.sm,
  },
  sectionTitle: {
    fontFamily: fontFamilies.headingSerif,
    fontSize: 20,
    lineHeight: 28,
    color: colors.text,
    marginBottom: space.xs,
  },
  paragraph: {
    color: colors.textSecondary,
  },
  footerLinks: {
    marginTop: space.md,
    paddingTop: space.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.lg,
  },
});
