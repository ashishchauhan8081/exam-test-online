// ======================================================
// FORGOT PASSWORD API
// Exam Test
// ======================================================

import {
  initializeApp,
  getApps,
  cert,
} from "firebase-admin/app";

import {
  getAuth,
} from "firebase-admin/auth";

import {
  getDatabase,
  ref,
  get,
  set,
  update,
} from "firebase-admin/database";

// ======================================================
// FIREBASE ADMIN INITIALIZATION
// ======================================================

function getFirebaseAdmin() {
  if (getApps().length) {
    return getApps()[0];
  }

  const serviceAccountRaw =
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (!serviceAccountRaw) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_JSON Vercel Environment Variables में नहीं मिली।"
    );
  }

  let serviceAccount;

  try {
    serviceAccount =
      JSON.parse(serviceAccountRaw);
  } catch (error) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_JSON valid JSON नहीं है।"
    );
  }

  return initializeApp({
    credential: cert(serviceAccount),

    databaseURL:
      process.env.FIREBASE_DATABASE_URL ||
      "https://study-with-power-f6914-default-rtdb.asia-southeast1.firebasedatabase.app",
  });
}
