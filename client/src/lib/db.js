import { openDB } from "idb";

export const dbPromise = openDB("devchat", 2, {
  upgrade(db, oldVersion) {
    if (oldVersion < 1) {
      const messages = db.createObjectStore("messages", { keyPath: "_id" });
      messages.createIndex("byRoom", "roomId");
    }
    if (oldVersion < 2) {
      const outbox = db.createObjectStore("outbox", { keyPath: "clientId" });
      outbox.createIndex("byRoom", "roomId");
    }
  },
});

