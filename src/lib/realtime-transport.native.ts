import type { WebSocketLikeConstructor } from "@supabase/realtime-js";

/** Native has a global WebSocket — no Node `ws` polyfill. */
export function nodeSsrRealtimeTransport(): WebSocketLikeConstructor | undefined {
  return undefined;
}
