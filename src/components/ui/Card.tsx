import { View, type ViewProps } from "react-native";
import { colors, radii, space } from "@/src/theme/tokens";

type Props = ViewProps & { children: React.ReactNode };

export function Card({ children, style, ...rest }: Props) {
  return (
    <View
      style={[
        {
          backgroundColor: colors.white,
          borderRadius: radii.md,
          padding: space.lg,
          borderWidth: 1,
          borderColor: colors.border,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}
