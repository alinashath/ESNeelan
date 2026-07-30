import { extractImageMajorityColor } from "@/src/lib/image-majority-color";
import { useEffect, useState } from "react";

export function useImageMajorityColor(uri?: string | null) {
  const [color, setColor] = useState<string | null>(null);

  useEffect(() => {
    if (!uri) {
      setColor(null);
      return;
    }

    let cancelled = false;
    setColor(null);

    void extractImageMajorityColor(uri).then((next) => {
      if (!cancelled) setColor(next);
    });

    return () => {
      cancelled = true;
    };
  }, [uri]);

  return color;
}
