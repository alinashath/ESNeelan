import * as Font from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState, type ReactNode } from "react";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from "@expo-google-fonts/inter";

SplashScreen.preventAutoHideAsync().catch(() => {});

const bidmasterFontMap = {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
};

export function BidmasterFontsProvider({ children }: { children: ReactNode }) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Font.loadAsync(bidmasterFontMap)
      .then(() => {
        if (!cancelled) setLoaded(true);
      })
      .catch((e) => {
        console.warn("BidmasterFontsProvider: font load failed", e);
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return children;
}
