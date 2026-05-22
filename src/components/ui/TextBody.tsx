import { Text, type TextProps } from "react-native";
import { typography } from "@/src/theme/tokens";

export function TextBody({ style, ...rest }: TextProps) {
  return <Text {...rest} style={[typography.body, style]} />;
}
