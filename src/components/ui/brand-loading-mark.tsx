import { colors, radii, space } from "@/src/theme/tokens";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

/** Auction-detail skeleton shown while the record and photography load. */
export function BrandLoadingMark() {
  const reducedMotion = useReducedMotion();
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (reducedMotion) return;

    opacity.value = withRepeat(
      withTiming(0.48, {
        duration: 760,
        easing: Easing.inOut(Easing.quad),
      }),
      -1,
      true,
    );

    return () => cancelAnimation(opacity);
  }, [opacity, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
      style={styles.container}
    >
      <Animated.View style={[styles.skeleton, animatedStyle]}>
        <View style={styles.hero} />
        <View style={styles.content}>
          <View style={styles.eyebrow} />
          <View style={styles.title} />
          <View style={styles.titleShort} />
          <View style={styles.divider} />
          <View style={styles.bidRow}>
            <View style={styles.bidCopy} />
            <View style={styles.bidValue} />
          </View>
          <View style={styles.button} />
          <View style={styles.bodyLine} />
          <View style={styles.bodyLineShort} />
        </View>
      </Animated.View>
    </View>
  );
}

const skeletonFill = colors.border;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
  },
  skeleton: {
    width: "100%",
  },
  hero: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: radii.lg,
    borderCurve: "continuous",
    backgroundColor: skeletonFill,
  },
  content: {
    paddingTop: space.xl,
  },
  eyebrow: {
    width: "24%",
    height: 10,
    borderRadius: radii.xs,
    backgroundColor: skeletonFill,
    marginBottom: space.md,
  },
  title: {
    width: "88%",
    height: 28,
    borderRadius: radii.xs,
    backgroundColor: skeletonFill,
    marginBottom: space.sm,
  },
  titleShort: {
    width: "58%",
    height: 28,
    borderRadius: radii.xs,
    backgroundColor: skeletonFill,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: skeletonFill,
    marginVertical: space.xl,
  },
  bidRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: space.lg,
  },
  bidCopy: {
    width: "28%",
    height: 14,
    borderRadius: radii.xs,
    backgroundColor: skeletonFill,
  },
  bidValue: {
    width: "34%",
    height: 24,
    borderRadius: radii.xs,
    backgroundColor: skeletonFill,
  },
  button: {
    width: "100%",
    height: 48,
    borderRadius: radii.sm,
    backgroundColor: skeletonFill,
    marginBottom: space.xl,
  },
  bodyLine: {
    width: "100%",
    height: 12,
    borderRadius: radii.xs,
    backgroundColor: skeletonFill,
    marginBottom: space.sm,
  },
  bodyLineShort: {
    width: "72%",
    height: 12,
    borderRadius: radii.xs,
    backgroundColor: skeletonFill,
  },
});
