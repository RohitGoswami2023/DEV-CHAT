import { dbPromise } from "./db";

export async function saveMessages(messages) {
  if (!Array.isArray(messages)) return;
  const db = await dbPromise;
  const tx = db.transaction("messages", "readwrite");
  for (const m of messages) {
    if (m && (m._id || m.clientId)) {
      tx.store.put(m);
    }
  }
  await tx.done;
}

// Newest `limit` messages in the room that are older than `before`. Returned oldest first.
export async function getCachedMessages(roomId, { before, limit = 50 } = {}) {
  const db = await dbPromise;
  const all = await db.getAllFromIndex("messages", "byRoom", roomId);
  const cutoff = before ? new Date(before).getTime() : Infinity;
  return all
    .filter((m) => new Date(m.createdAt).getTime() < cutoff)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .slice(-limit);
}

export async function clearMessageCache() {
  const db = await dbPromise;
  await db.clear("messages");
  await db.clear("outbox");
}

