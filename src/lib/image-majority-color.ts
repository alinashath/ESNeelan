import { Platform } from "react-native";

const colorCache = new Map<string, string>();

function quantizeChannel(value: number, bits = 4) {
  const shift = 8 - bits;
  return (value >> shift) << shift;
}

/**
 * Samples a downscaled image on web and returns the most frequent quantized RGB.
 * Returns null on native or when the image cannot be read (e.g. CORS).
 */
export async function extractImageMajorityColor(uri: string): Promise<string | null> {
  if (Platform.OS !== "web" || typeof document === "undefined") {
    return null;
  }

  const cached = colorCache.get(uri);
  if (cached) return cached;

  try {
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

    const color = `rgb(${Math.round(winner.r / winner.count)}, ${Math.round(winner.g / winner.count)}, ${Math.round(winner.b / winner.count)})`;
    colorCache.set(uri, color);
    return color;
  } catch {
    return null;
  }
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
