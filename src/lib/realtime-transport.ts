import type { WebSocketLikeConstructor } from "@supabase/realtime-js";

/**
 * Expo static web export runs SSR in Node. Node < 22 has no global WebSocket, but
 * @supabase/realtime-js still instantiates Realtime in createClient — supply `ws`.
 * Browsers and Node 22+ skip this (native WebSocket).
 *
 * Kept in a non-`.native` module so Metro never resolves `ws` into iOS/Android bundles.
 */
export function nodeSsrRealtimeTransport(): WebSocketLikeConstructor | undefined {
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
