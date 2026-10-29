import { dbPromise } from "./db";

const API = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || "";

// Called by the send button. Shows the message immediately and tries to send.
export async function queueMessage({ roomId, text, sender }) {
  const clientId = crypto.randomUUID();
  const msg = {
    clientId,
    roomId,
    text,
    sender,
    senderId: sender,
    createdAt: new Date().toISOString(),
    status: "pending",
  };

  const db = await dbPromise;
  await db.put("outbox", msg);
  await db.put("messages", { ...msg, _id: clientId }); // local copy for the UI

  window.dispatchEvent(new CustomEvent("devchat:changed"));
  flushOutbox();
  return msg;
}

let flushing = false;

// Sends pending messages one by one, oldest first. Stops at the first temporary failure.
export async function flushOutbox() {
  if (flushing || !navigator.onLine) return;
  flushing = true;
  try {
    const db = await dbPromise;
    const pending = (await db.getAll("outbox"))
      .filter((m) => m.status === "pending")
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    for (const msg of pending) {
      const keepGoing = await sendOne(msg);
      if (!keepGoing) break;
    }
  } finally {
    flushing = false;
  }
}

async function sendOne(msg) {
  const db = await dbPromise;
  try {
    const token = localStorage.getItem("token");
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${API}/api/messages`, {
      method: "POST",
      credentials: "include",
      headers,
      body: JSON.stringify({
        clientId: msg.clientId,
        roomId: msg.roomId,
        text: msg.text,
        createdAt: msg.createdAt,
      }),
    });

    // Temporary problems: keep pending, stop, and retry later.
    // 401 means the login expired. Wait until the user logs in again.
    if (res.status === 401 || res.status === 429 || res.status >= 500) return false;

    // Permanent client errors (validation, forbidden): mark failed so the user can see and retry.
    if (!res.ok) {
      const failed = { ...msg, status: "failed" };
      await db.put("outbox", failed);
      await db.put("messages", { ...failed, _id: msg.clientId });
      window.dispatchEvent(new CustomEvent("devchat:changed"));
      return true; // continue with the next message
    }

    const saved = await res.json(); // has the real _id from MongoDB
    await db.delete("messages", msg.clientId); // remove the temporary local copy
    await db.put("messages", saved);
    await db.delete("outbox", msg.clientId);
    window.dispatchEvent(new CustomEvent("devchat:changed"));
    return true;
  } catch {
    return false; // network error: stop, retry later
  }
}

// Retry a failed message: set it back to pending and flush.
export async function retryMessage(clientId) {
  const db = await dbPromise;
  const msg = await db.get("outbox", clientId);
  if (!msg) return;
  await db.put("outbox", { ...msg, status: "pending" });
  const local = await db.get("messages", clientId);
  if (local) await db.put("messages", { ...local, status: "pending" });
  window.dispatchEvent(new CustomEvent("devchat:changed"));
  flushOutbox();
}

// Starts all automatic triggers. Call once from the root component.
export function startOutboxSync() {
  const kick = () => flushOutbox();

  window.addEventListener("online", kick);
  const onVisible = () => { if (!document.hidden) kick(); };
  document.addEventListener("visibilitychange", onVisible);
  const timer = setInterval(kick, 15000);

  kick();

  return () => {
    window.removeEventListener("online", kick);
    document.removeEventListener("visibilitychange", onVisible);
    clearInterval(timer);
  };
}

// Returns true if there are messages that haven't been sent (used by the logout warning).
export async function hasUnsentMessages() {
  const db = await dbPromise;
  return (await db.count("outbox")) > 0;
}

