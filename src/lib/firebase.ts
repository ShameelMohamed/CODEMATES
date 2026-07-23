import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase, ref, set, remove, get } from "firebase/database";

// Client Configuration — reads from NEXT_PUBLIC_ env vars.
// These are intentionally public (Firebase Security Rules protect your data, not the config).
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getDatabase(app);

export type RTDBStatus = "checking" | "ok" | "no-database" | "permission-denied";

/**
 * Tests whether the Firebase Realtime Database is reachable and allows writes.
 * Writes under rooms/__health__  so it passes the user's existing security rules
 * which only allow writes at rooms/$roomCode.
 */
export async function checkRTDB(): Promise<RTDBStatus> {
  return new Promise((resolve) => {
    let resolved = false;

    const timer = setTimeout(() => {
      if (!resolved) { resolved = true; resolve("no-database"); }
    }, 6000);

    const finish = (status: RTDBStatus) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timer);
      resolve(status);
    };

    // Write under rooms/ so existing security rules allow it
    const testRef = ref(db, "rooms/__health__");
    set(testRef, { ts: Date.now() })
      .then(() => remove(testRef))
      .then(() => finish("ok"))
      .catch((err: any) => {
        const code: string = err?.code ?? err?.message ?? "";
        if (code.includes("PERMISSION_DENIED") || code.includes("permission")) {
          finish("permission-denied");
        } else {
          finish("no-database");
        }
      });
  });
}

export { app, auth, db };