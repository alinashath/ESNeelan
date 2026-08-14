import Constants from "expo-constants";

const colorCache = new Map<string, string>();

type ImageColorsResult = {
  platform: "android" | "ios" | "web";
  dominant?: string;
  muted?: string;
  background?: string;
  primary?: string;
};

/**
 * Native color extraction is optional because Expo Go does not bundle the
 * third-party ImageColors native module. Custom development and production
 * builds still use it; Expo Go falls back to the component's neutral fill.
 */
export async function extractImageMajorityColor(uri: string): Promise<string | null> {
  const cached = colorCache.get(uri);
  if (cached) return cached;

  if (Constants.appOwnership === "expo") return null;

  try {
    const { getColors } = require("react-native-image-colors") as {
      getColors: (source: string, options: object) => Promise<ImageColorsResult>;
    };
    const result = await getColors(uri, {
      fallback: "#E8E8E8",
      cache: true,
      key: uri,
      quality: "low",
    });
    const color = result.platform === "ios"
      ? result.background || result.primary || null
      : result.dominant || result.muted || null;
    if (color) colorCache.set(uri, color);
    return color;
  } catch {
    return null;
  }
}
