import { createContext, type ReactNode, useContext, useMemo } from "react";
import { useWindowDimensions } from "react-native";
import { layout } from "@/src/theme/layout";

const ContentWidthContext = createContext<number | undefined>(undefined);

const isWeb = process.env.EXPO_OS === "web";

export function ContentWidthProvider({
  width,
  children,
}: {
  width: number | undefined;
  children: ReactNode;
}) {
  const value = useMemo(() => width, [width]);
  return (
    <ContentWidthContext.Provider value={value}>{children}</ContentWidthContext.Provider>
  );
}

/**
 * Width of the current `Screen` column (after max-width constraint on web).
 * Falls back to `min(windowWidth, maxContentWidth)` on web before the first `onLayout`.
 */
export function useScreenContentWidth(): number {
  const measured = useContext(ContentWidthContext);
  const { width: windowWidth } = useWindowDimensions();

  if (measured != null && measured > 0) {
    return measured;
  }
  if (isWeb) {
    return Math.min(windowWidth, layout.maxContentWidth);
  }
  return windowWidth;
}
