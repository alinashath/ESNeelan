import { createClient } from "@supabase/supabase-js";
import type { WebSocketLikeConstructor } from "@supabase/realtime-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

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

/**
 * Expo static web export runs SSR in Node. Node < 22 has no global WebSocket, but
 * @supabase/realtime-js still instantiates Realtime in createClient — supply `ws`.
 * Browsers and Node 22+ skip this (native WebSocket).
 */
function nodeSsrRealtimeTransport(): WebSocketLikeConstructor | undefined {
  if (typeof globalThis.WebSocket === "function") {
    return undefined;
  }
  const ver = process.versions?.node;
  if (!ver) return undefined;
  const major = parseInt(ver.replace(/^v/, "").split(".")[0] ?? "0", 10);
  if (!Number.isFinite(major) || major >= 22) return undefined;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("ws") as WebSocketLikeConstructor;
  } catch {
    return undefined;
  }
}

const realtimeTransport = nodeSsrRealtimeTransport();

export const supabase = createClient(url, anon, {
  auth: {
    storage: authStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  ...(realtimeTransport ? { realtime: { transport: realtimeTransport } } : {}),
});

export function assertSupabaseConfigured() {
  if (!url || !anon) {
    console.warn(
      "Supabase: set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY",
    );
  }
}
