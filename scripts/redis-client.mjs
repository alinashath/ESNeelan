/**
 * Optional Redis client for the production web server (Railway REDIS_URL).
 * Missing or unreachable Redis must never take down static site serving.
 */
import { createClient } from "redis";

let client = null;
let connectAttempted = false;

function redisUrl() {
  return (process.env.REDIS_URL || "").trim() || null;
}

/** @returns {import('redis').RedisClientType | null} */
export function getRedis() {
  return client;
}

export function isRedisConfigured() {
  return Boolean(redisUrl());
}

/**
 * Connect once when REDIS_URL is set. Safe to call multiple times.
 * @returns {Promise<import('redis').RedisClientType | null>}
 */
export async function connectRedis() {
  const url = redisUrl();
  if (!url) return null;
  if (client?.isOpen) return client;
  if (connectAttempted && client) return client;

  connectAttempted = true;
  const next = createClient({ url });
  next.on("error", (err) => {
    console.error("[redis] client error:", err?.message || err);
  });

  try {
    await next.connect();
    client = next;
    console.log("[redis] connected");
    return client;
  } catch (err) {
    console.error("[redis] connect failed:", err?.message || err);
    try {
      await next.quit();
    } catch {
      /* ignore */
    }
    client = null;
    return null;
  }
}

/** @returns {Promise<boolean>} */
export async function pingRedis() {
  const c = client?.isOpen ? client : await connectRedis();
  if (!c?.isOpen) return false;
  try {
    const reply = await c.ping();
    return reply === "PONG";
  } catch (err) {
    console.error("[redis] ping failed:", err?.message || err);
    return false;
  }
}
