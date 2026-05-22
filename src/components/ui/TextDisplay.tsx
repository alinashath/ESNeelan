import { Text, type TextProps } from "react-native";
import { typography } from "@/src/theme/tokens";

export function TextDisplay({ style, ...rest }: TextProps) {
  return <Text {...rest} style={[typography.display, style]} />;
}
