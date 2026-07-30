import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { nodeSsrRealtimeTransport } from "@/src/lib/realtime-transport";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? "";
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";

/** Avoid hard crash on launch when EAS env vars were not injected into the binary. */
const configured = Boolean(url && anon);
if (!configured) {
  console.error(
    "Supabase env missing: set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (EAS production environment).",
  );
}

/** In-memory fallback when `localStorage` is missing (SSR / static render). */
const ssrMemory = new Map<string, string>();

function createWebAuthStorage() {
  return {
    getItem(key: string): Promise<string | null> {
      try {
        if (typeof globalThis !== "undefined" && "localStorage" in globalThis) {
          const ls = (globalThis as { localStorage?: Storage }).localStorage;
          return Promise.resolve(ls?.getItem(key) ?? null);
        }
      } catch {
        /* access denied / SSR */
      }
      return Promise.resolve(ssrMemory.get(key) ?? null);
    },
    setItem(key: string, value: string): Promise<void> {
      try {
        if (typeof globalThis !== "undefined" && "localStorage" in globalThis) {
          (globalThis as { localStorage: Storage }).localStorage.setItem(
            key,
            value,
          );
          return Promise.resolve();
        }
      } catch {
        /* fall through */
      }
      ssrMemory.set(key, value);
      return Promise.resolve();
    },
    removeItem(key: string): Promise<void> {
      try {
        if (typeof globalThis !== "undefined" && "localStorage" in globalThis) {
          (globalThis as { localStorage: Storage }).localStorage.removeItem(key);
        }
      } catch {
        /* ignore */
      }
      ssrMemory.delete(key);
      return Promise.resolve();
    },
  };
}

/**
 * Native auth storage via AsyncStorage (SecureStore caps values at ~2KB and
 * silently fails for typical Supabase session payloads). Migrates any legacy
 * SecureStore session on first read so existing logins are not dropped.
 */
const nativeAuthStorage = {
  async getItem(key: string): Promise<string | null> {
    const existing = await AsyncStorage.getItem(key);
    if (existing != null) return existing;
    try {
      const legacy = await SecureStore.getItemAsync(key);
      if (legacy == null) return null;
      await AsyncStorage.setItem(key, legacy);
      await SecureStore.deleteItemAsync(key);
      return legacy;
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string): Promise<void> {
    return AsyncStorage.setItem(key, value);
  },
  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      /* ignore missing legacy key */
    }
  },
};

const authStorage =
  Platform.OS === "ios" || Platform.OS === "android"
    ? nativeAuthStorage
    : createWebAuthStorage();

const realtimeTransport = nodeSsrRealtimeTransport();

export const supabase = createClient(
  configured ? url : "https://example.supabase.co",
  configured ? anon : "public-anon-key",
  {
    auth: {
      storage: authStorage,
      autoRefreshToken: configured,
      persistSession: configured,
      detectSessionInUrl: false,
    },
    ...(realtimeTransport ? { realtime: { transport: realtimeTransport } } : {}),
  },
);

export function assertSupabaseConfigured() {
  if (!configured) {
    console.warn(
      "Supabase: set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY",
    );
  }
  return configured;
}

export function isSupabaseConfigured() {
  return configured;
}
