import { useEffect, useState, useCallback } from "react";
import { saveMessages, getCachedMessages } from "../lib/messageCache";

const API = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || "";

export function useMessages(roomId) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  // Initial load: cache first, then server
  useEffect(() => {
    let cancelled = false;

    if (!roomId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    (async () => {
      const cached = await getCachedMessages(roomId);
      if (!cancelled) {
        setMessages(cached);
        setLoading(false);
      }

      if (!navigator.onLine) return;

      try {
        const token = localStorage.getItem("token");
        const headers = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(`${API}/api/messages?roomId=${encodeURIComponent(roomId)}&limit=50`, {
          credentials: "include",
          headers,
        });
        if (!res.ok) throw new Error(res.status);
        await saveMessages(await res.json());
        if (!cancelled) setMessages(await getCachedMessages(roomId));
      } catch {
        // Offline or Render is waking up: keep showing the cache
      }
    })();

    return () => { cancelled = true; };
  }, [roomId]);

  // Reload when a message is queued, sent, or failed
  useEffect(() => {
    if (!roomId) return;
    const reload = () => getCachedMessages(roomId).then(setMessages);
    window.addEventListener("devchat:changed", reload);
    return () => window.removeEventListener("devchat:changed", reload);
  }, [roomId]);

  // Load older messages
  const loadOlder = useCallback(async () => {
    if (!roomId || messages.length === 0) return;
    const oldest = messages[0].createdAt;

    let older = await getCachedMessages(roomId, { before: oldest });

    if (older.length === 0 && navigator.onLine) {
      try {
        const token = localStorage.getItem("token");
        const headers = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(
          `${API}/api/messages?roomId=${encodeURIComponent(roomId)}&before=${encodeURIComponent(oldest)}&limit=50`,
          { credentials: "include", headers }
        );
        if (res.ok) {
          older = await res.json();
          await saveMessages(older);
        }
      } catch {
        // stay offline-friendly
      }
    }

    if (older && older.length) setMessages((prev) => [...older, ...prev]);
  }, [roomId, messages]);

  return { messages, loading, loadOlder, setMessages };
}

