import { Text, type TextProps } from "react-native";
import { typography } from "@/src/theme/tokens";

export function TextCaption({ style, ...rest }: TextProps) {
  return <Text {...rest} style={[typography.caption, style]} />;
}
