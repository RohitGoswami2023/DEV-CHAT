import admin from "firebase-admin";
import { readFileSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
  const accountPath = path.join(__dirname, "../serviceAccountKey.json");
  if (existsSync(accountPath)) {
      const serviceAccount = JSON.parse(readFileSync(accountPath, "utf8"));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log("✅ Firebase Admin Initialized Successfully.");
  } else {
      console.warn("⚠️ Firebase Admin: serviceAccountKey.json not found.");
  }
} catch (error) {
  console.error("❌ Failed to initialize Firebase Admin:", error.message);
}

export default admin;
