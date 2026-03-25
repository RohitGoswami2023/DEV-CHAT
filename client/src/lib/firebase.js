import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyCPBbo23eDw34k-_dMzxQ2ZEJUGOoOyL-U",
  authDomain: "dev-chat-85ed5.firebaseapp.com",
  projectId: "dev-chat-85ed5",
  storageBucket: "dev-chat-85ed5.firebasestorage.app",
  messagingSenderId: "388773569345",
  appId: "1:388773569345:web:83559235fa66377dedb7c0",
  measurementId: "G-7CY4RFPE5X"
};

const app = initializeApp(firebaseConfig);
export const messaging = typeof window !== "undefined" && "Notification" in window ? getMessaging(app) : null;

export const requestFirebaseToken = async () => {
    if (!messaging) return null;
    try {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
            const token = await getToken(messaging, { vapidKey: "BIyAC1bS_A6hdUcbIipHujTVipOeHigdZK1UsUJHBNaIRAZG0v1v2hOcx_5OhHmXcYLBBbJKKN_qqpJAmKRlscc" });
            return token;
        } else {
            console.warn("Firebase Notification permission denied by user.");
            return null;
        }
    } catch (err) {
        console.error("Failed to generate FCM Token:", err);
        return null;
    }
};

export const onMessageListener = (callback) => {
    if (messaging) {
       return onMessage(messaging, (payload) => {
           callback(payload);
       });
    }
};
