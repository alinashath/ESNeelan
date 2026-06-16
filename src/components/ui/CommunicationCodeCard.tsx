import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TextBody } from "./TextBody";
import { TextCaption } from "./TextCaption";
import { colors, radii, space } from "@/src/theme/tokens";

type Props = {
  bidNumber: string | null | undefined;
  communicationCode: string | null | undefined;
};

export function CommunicationCodeCard({ bidNumber, communicationCode }: Props) {
  if (!bidNumber && !communicationCode) return null;
  return (
    <View
      style={{
        marginTop: space.md,
        padding: space.lg,
        borderRadius: radii.xl,
        backgroundColor: colors.surfaceBlush,
        borderWidth: 1,
        borderColor: "rgba(232, 188, 184, 0.35)",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm, marginBottom: space.sm }}>
        <Ionicons name="key-outline" size={20} color={colors.primary} />
        <TextBody style={{ fontWeight: "600" }}>Your listing codes</TextBody>
      </View>
      {bidNumber ? (
        <TextCaption style={{ fontFamily: "monospace", fontWeight: "600", marginTop: space.xs }}>
          Bid number: {bidNumber}
        </TextCaption>
      ) : null}
      {communicationCode ? (
        <TextCaption
          style={{
            fontFamily: "monospace",
            fontWeight: "600",
            marginTop: space.sm,
            fontSize: 16,
            letterSpacing: 0.5,
          }}
        >
          Communication code: {communicationCode}
        </TextCaption>
      ) : null}
      <View style={{ flexDirection: "row", gap: space.sm, marginTop: space.md, alignItems: "flex-start" }}>
        <Ionicons name="warning-outline" size={18} color={colors.tertiary} style={{ marginTop: 2 }} />
        <TextCaption style={{ flex: 1, color: colors.text, fontStyle: "italic", fontWeight: "400" }}>
          Share this code only with the winning bidder after the platform flow allows it.
        </TextCaption>
      </View>
    </View>
  );
}
