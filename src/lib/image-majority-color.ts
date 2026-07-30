import { Platform } from "react-native";
import { getColors } from "react-native-image-colors";

const colorCache = new Map<string, string>();

function quantizeChannel(value: number, bits = 4) {
  const shift = 8 - bits;
  return (value >> shift) << shift;
}

function pickNativeMajorityColor(result: Awaited<ReturnType<typeof getColors>>): string | null {
  if (result.platform === "android" || result.platform === "web") {
    return result.dominant || result.muted || null;
  }
  // iOS: background is the strongest overall fill color from the image.
  return result.background || result.primary || null;
}

/**
 * Returns the most frequent / dominant color from an image URI.
 * Web uses canvas sampling; iOS/Android use react-native-image-colors.
 */
export async function extractImageMajorityColor(uri: string): Promise<string | null> {
  const cached = colorCache.get(uri);
  if (cached) return cached;

  try {
    if (Platform.OS === "web" && typeof document !== "undefined") {
      const color = await extractWebMajorityColor(uri);
      if (color) colorCache.set(uri, color);
      return color;
    }

    const result = await getColors(uri, {
      fallback: "#E8E8E8",
      cache: true,
      key: uri,
      quality: "low",
    });
    const color = pickNativeMajorityColor(result);
    if (color) colorCache.set(uri, color);
    return color;
  } catch {
    return null;
  }
}

async function extractWebMajorityColor(uri: string): Promise<string | null> {
  const img = await loadWebImage(uri);
  const canvas = document.createElement("canvas");
  const sampleSize = 32;
  canvas.width = sampleSize;
  canvas.height = sampleSize;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(img, 0, 0, sampleSize, sampleSize);
  const { data } = ctx.getImageData(0, 0, sampleSize, sampleSize);

  const buckets = new Map<string, { r: number; g: number; b: number; count: number }>();

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha < 128) continue;

    const r = quantizeChannel(data[i]);
    const g = quantizeChannel(data[i + 1]);
    const b = quantizeChannel(data[i + 2]);
    const key = `${r},${g},${b}`;

    const bucket = buckets.get(key);
    if (bucket) {
      bucket.r += data[i];
      bucket.g += data[i + 1];
      bucket.b += data[i + 2];
      bucket.count += 1;
    } else {
      buckets.set(key, {
        r: data[i],
        g: data[i + 1],
        b: data[i + 2],
        count: 1,
      });
    }
  }

  if (!buckets.size) return null;

  let winner: { r: number; g: number; b: number; count: number } | null = null;
  for (const bucket of buckets.values()) {
    if (!winner || bucket.count > winner.count) {
      winner = bucket;
    }
  }

  if (!winner) return null;

  return `rgb(${Math.round(winner.r / winner.count)}, ${Math.round(winner.g / winner.count)}, ${Math.round(winner.b / winner.count)})`;
}

function loadWebImage(uri: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed"));
    img.src = uri;
  });
}
