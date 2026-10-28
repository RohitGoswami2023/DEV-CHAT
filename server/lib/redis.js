import { Redis } from "@upstash/redis";
import IORedis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

// ====================================================================
// 1. UPSTASH REST CLIENT (FOR HIGH-SPEED KEY-VALUE CACHING)
// ====================================================================
export const upstash = (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

if (upstash) {
  console.log("⚡ Upstash REST Redis client initialized");
} else {
  console.warn("⚠️ Upstash REST Redis credentials missing, caching will use in-memory fallback");
}

// ====================================================================
// 2. IOREDIS CLIENT (FOR SOCKET.IO PUB/SUB & RATE LIMIT STORE)
// ====================================================================
const redisUrl = process.env.REDIS_URL || (
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? `rediss://default:${process.env.UPSTASH_REDIS_REST_TOKEN}@${process.env.UPSTASH_REDIS_REST_URL.replace("https://", "")}:6379`
    : null
);

export let pubClient = null;
export let subClient = null;

if (redisUrl) {
  const ioredisOptions = {
    connectTimeout: 8000,
    maxRetriesPerRequest: 2,
    enableAutoPipelining: true,
    lazyConnect: true,
    retryStrategy(times) {
      const delay = Math.min(times * 200, 2000);
      return delay;
    },
  };

  try {
    pubClient = new IORedis(redisUrl, ioredisOptions);
    subClient = pubClient.duplicate();

    pubClient.on("connect", () => console.log("✅ Redis PubClient connected"));
    pubClient.on("error", (err) => console.warn("⚠️ Redis PubClient warning:", err.message));

    subClient.on("connect", () => console.log("✅ Redis SubClient connected"));
    subClient.on("error", (err) => console.warn("⚠️ Redis SubClient warning:", err.message));

    // Connect asynchronously
    pubClient.connect().catch((e) => console.warn("⚠️ Redis PubClient initial connection error:", e.message));
    subClient.connect().catch((e) => console.warn("⚠️ Redis SubClient initial connection error:", e.message));
  } catch (err) {
    console.warn("⚠️ Failed to initialize IORedis clients:", err.message);
  }
}

// ====================================================================
// 3. CACHING HELPER UTILITIES
// ====================================================================

/**
 * Get JSON cached data by key
 */
export const cacheGet = async (key) => {
  if (!upstash) return null;
  try {
    const data = await upstash.get(key);
    return data ? (typeof data === "string" ? JSON.parse(data) : data) : null;
  } catch (err) {
    console.warn(`[Redis Cache] Get error for ${key}:`, err.message);
    return null;
  }
};

/**
 * Set JSON data into cache with optional TTL in seconds (default 60s)
 */
export const cacheSet = async (key, value, ttlSeconds = 60) => {
  if (!upstash) return;
  try {
    const payload = typeof value === "string" ? value : JSON.stringify(value);
    if (ttlSeconds && ttlSeconds > 0) {
      await upstash.setex(key, ttlSeconds, payload);
    } else {
      await upstash.set(key, payload);
    }
  } catch (err) {
    console.warn(`[Redis Cache] Set error for ${key}:`, err.message);
  }
};

/**
 * Delete a specific key from cache
 */
export const cacheDel = async (key) => {
  if (!upstash) return;
  try {
    await upstash.del(key);
  } catch (err) {
    console.warn(`[Redis Cache] Del error for ${key}:`, err.message);
  }
};

// ====================================================================
// 4. DISTRIBUTED ONLINE PRESENCE (SET / HASH)
// ====================================================================
const ONLINE_USERS_KEY = "devchat:online_users";

export const addOnlineUser = async (userId, socketId) => {
  if (upstash) {
    try {
      await upstash.sadd(ONLINE_USERS_KEY, userId);
      await upstash.set(`devchat:socket:${userId}`, socketId, { ex: 86400 }); // 24h expiration
    } catch (err) {
      console.warn("[Redis] addOnlineUser error:", err.message);
    }
  }
};

export const removeOnlineUser = async (userId, socketId) => {
  if (upstash) {
    try {
      await upstash.srem(ONLINE_USERS_KEY, userId);
      await upstash.del(`devchat:socket:${userId}`);
    } catch (err) {
      console.warn("[Redis] removeOnlineUser error:", err.message);
    }
  }
};

export const getOnlineUserIds = async (localUserSocketMap = {}) => {
  if (upstash) {
    try {
      const members = await upstash.smembers(ONLINE_USERS_KEY);
      if (Array.isArray(members) && members.length > 0) {
        return members;
      }
    } catch (err) {
      console.warn("[Redis] getOnlineUserIds error:", err.message);
    }
  }
  // Fallback to local in-memory map
  return Object.keys(localUserSocketMap);
};
