// ============================================================
// Exam Test
// API: Password Reset by Mobile Number + OTP
// File: /api/password-reset.js
// ============================================================

import admin from "firebase-admin";

// ------------------------------------------------------------
// Firebase Admin Initialization
// ------------------------------------------------------------

function getFirebaseAdmin() {
  try {
    if (admin.apps.length > 0) {
      return admin;
    }

    let serviceAccount;

    // Firebase service account JSON
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      serviceAccount = JSON.parse(
        process.env.FIREBASE_SERVICE_ACCOUNT_JSON
      );
    }

    if (!serviceAccount) {
      throw new Error(
        "FIREBASE_SERVICE_ACCOUNT_JSON is not configured"
      );
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL:
        process.env.FIREBASE_DATABASE_URL ||
        `https://${serviceAccount.project_id}-default-rtdb.firebaseio.com`,
    });

    return admin;
  } catch (error) {
    console.error("Firebase Admin Init Error:", error);
    throw error;
  }
}

// ------------------------------------------------------------
// JSON Response Helper
// ------------------------------------------------------------

function sendJSON(res, status, data) {
  res.status(status);
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

// ------------------------------------------------------------
// Mobile Number Normalizer
// ------------------------------------------------------------

function normalizeMobile(mobile) {
  if (!mobile) return "";

  let number = String(mobile).replace(/\D/g, "");

  // India
  if (number.length === 10) {
    number = "91" + number;
  }

  // If user entered 0XXXXXXXXXX
  if (number.length === 11 && number.startsWith("0")) {
    number = "91" + number.substring(1);
  }

  return number;
}

// ------------------------------------------------------------
// Generate 6 Digit OTP
// ------------------------------------------------------------

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ------------------------------------------------------------
// Hash OTP
// ------------------------------------------------------------

async function hashOTP(otp) {
  const crypto = await import("crypto");

  return crypto
    .createHash("sha256")
    .update(String(otp))
    .digest("hex");
}

// ------------------------------------------------------------
// Send WhatsApp Message
// ------------------------------------------------------------

async function sendWhatsAppOTP(mobile, otp) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    throw new Error(
      "WhatsApp API environment variables are missing"
    );
  }

  const url =
    `https://graph.facebook.com/v22.0/` +
    `${phoneNumberId}/messages`;

  const message =
    `Exam Test Password Reset\n\n` +
    `Aapka OTP hai: ${otp}\n\n` +
    `Ye OTP 10 minutes ke liye valid hai.\n` +
    `Agar aapne password reset request nahi ki hai, ` +
    `to is message ko ignore karein.`;

  const response = await fetch(url, {
    method: "POST",

    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },

    body: JSON.stringify({
      messaging_product: "whatsapp",

      to: mobile,

      type: "text",

      text: {
        preview_url: false,
        body: message,
      },
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("WhatsApp API Error:", data);

    throw new Error(
      data?.error?.message ||
        "WhatsApp message send failed"
    );
  }

  return data;
}

// ------------------------------------------------------------
// Find Firebase User By Mobile Number
// ------------------------------------------------------------

async function findUserByMobile(firebaseAdmin, mobile) {
  try {
    const auth = firebaseAdmin.auth();

    // Firebase Auth phone number format
    const phoneNumber = "+" + mobile;

    const userRecord = await auth.getUserByPhoneNumber(
      phoneNumber
    );

    return userRecord;
  } catch (error) {
    console.error(
      "Firebase User Search Error:",
      error.code,
      error.message
    );

    return null;
  }
}

// ------------------------------------------------------------
// MAIN API
// ------------------------------------------------------------

export default async function handler(req, res) {
  // Always return JSON
  res.setHeader("Content-Type", "application/json");

  // ----------------------------------------------------------
  // OPTIONS
  // ----------------------------------------------------------

  if (req.method === "OPTIONS") {
    res.setHeader(
      "Access-Control-Allow-Origin",
      "*"
    );

    res.setHeader(
      "Access-Control-Allow-Methods",
      "POST, OPTIONS"
    );

    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type"
    );

    return res.status(200).end();
  }

  // ----------------------------------------------------------
  // Only POST
  // ----------------------------------------------------------

  if (req.method !== "POST") {
    return sendJSON(res, 405, {
      success: false,
      message: "Only POST method is allowed",
    });
  }

  try {
    const firebaseAdmin = getFirebaseAdmin();

    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : req.body || {};

    const action = body.action;

    // ========================================================
    // ACTION 1: SEND OTP
    // ========================================================

    if (action === "send-otp") {
      const mobile = normalizeMobile(body.mobile);

      if (!mobile) {
        return sendJSON(res, 400, {
          success: false,
          message: "Mobile number required",
        });
      }

      if (mobile.length !== 12) {
        return sendJSON(res, 400, {
          success: false,
          message:
            "Please enter a valid 10 digit mobile number",
        });
      }

      // --------------------------------------------
      // Check user exists in Firebase Auth
      // --------------------------------------------

      const user = await findUserByMobile(
        firebaseAdmin,
        mobile
      );

      if (!user) {
        return sendJSON(res, 404, {
          success: false,
          message:
            "Is mobile number se koi account nahi mila.",
        });
      }

      // --------------------------------------------
      // Generate OTP
      // --------------------------------------------

      const otp = generateOTP();

      const otpHash = await hashOTP(otp);

      // --------------------------------------------
      // Save OTP in Realtime Database
      // --------------------------------------------

      const db = firebaseAdmin.database();

      const otpRef = db.ref(
        `passwordResetOtps/${mobile}`
      );

      await otpRef.set({
        otpHash: otpHash,
        uid: user.uid,
        mobile: mobile,
        createdAt: Date.now(),
        expiresAt:
          Date.now() + 10 * 60 * 1000,
        attempts: 0,
      });

      // --------------------------------------------
      // Send WhatsApp
      // --------------------------------------------

      await sendWhatsAppOTP(
        mobile,
        otp
      );

      return sendJSON(res, 200, {
        success: true,
        message:
          "OTP WhatsApp par bhej diya gaya hai.",
      });
    }

    // ========================================================
    // ACTION 2: VERIFY OTP
    // ========================================================

    if (action === "verify-otp") {
      const mobile = normalizeMobile(body.mobile);
      const otp = String(body.otp || "").trim();

      if (!mobile || !otp) {
        return sendJSON(res, 400, {
          success: false,
          message:
            "Mobile number aur OTP required hai.",
        });
      }

      if (!/^\d{6}$/.test(otp)) {
        return sendJSON(res, 400, {
          success: false,
          message: "OTP 6 digit ka hona chahiye.",
        });
      }

      const db = firebaseAdmin.database();

      const snapshot = await db
        .ref(`passwordResetOtps/${mobile}`)
        .get();

      if (!snapshot.exists()) {
        return sendJSON(res, 400, {
          success: false,
          message:
            "OTP nahi mila. Pehle OTP generate karein.",
        });
      }

      const data = snapshot.val();

      // --------------------------------------------
      // Check expiry
      // --------------------------------------------

      if (
        !data.expiresAt ||
        Date.now() > Number(data.expiresAt)
      ) {
        await db
          .ref(`passwordResetOtps/${mobile}`)
          .remove();

        return sendJSON(res, 400, {
          success: false,
          message:
            "OTP expire ho gaya. Naya OTP generate karein.",
        });
      }

      // --------------------------------------------
      // Check attempts
      // --------------------------------------------

      const attempts =
        Number(data.attempts || 0);

      if (attempts >= 5) {
        await db
          .ref(`passwordResetOtps/${mobile}`)
          .remove();

        return sendJSON(res, 429, {
          success: false,
          message:
            "OTP attempts limit complete ho gayi. Naya OTP generate karein.",
        });
      }

      // --------------------------------------------
      // Verify OTP
      // --------------------------------------------

      const enteredHash =
        await hashOTP(otp);

      if (enteredHash !== data.otpHash) {
        await db
          .ref(`passwordResetOtps/${mobile}/attempts`)
          .set(attempts + 1);

        return sendJSON(res, 400, {
          success: false,
          message: "OTP galat hai.",
        });
      }

      // --------------------------------------------
      // OTP verified
      // --------------------------------------------

      await db
        .ref(`passwordResetOtps/${mobile}/verified`)
        .set(true);

      return sendJSON(res, 200, {
        success: true,
        message: "OTP verified successfully.",
      });
    }

    // ========================================================
    // ACTION 3: RESET PASSWORD
    // ========================================================

    if (action === "reset-password") {
      const mobile = normalizeMobile(body.mobile);

      const newPassword =
        String(body.newPassword || "");

      if (!mobile || !newPassword) {
        return sendJSON(res, 400, {
          success: false,
          message:
            "Mobile number aur new password required hai.",
        });
      }

      // --------------------------------------------
      // Password validation
      // --------------------------------------------

      if (newPassword.length < 6) {
        return sendJSON(res, 400, {
          success: false,
          message:
            "Password kam se kam 6 characters ka hona chahiye.",
        });
      }

      const db = firebaseAdmin.database();

      const snapshot = await db
        .ref(`passwordResetOtps/${mobile}`)
        .get();

      if (!snapshot.exists()) {
        return sendJSON(res, 400, {
          success: false,
          message:
            "Password reset session nahi mila.",
        });
      }

      const data = snapshot.val();

      // --------------------------------------------
      // OTP expiry
      // --------------------------------------------

      if (
        !data.expiresAt ||
        Date.now() > Number(data.expiresAt)
      ) {
        await db
          .ref(`passwordResetOtps/${mobile}`)
          .remove();

        return sendJSON(res, 400, {
          success: false,
          message:
            "Reset session expire ho gaya.",
        });
      }

      // --------------------------------------------
      // OTP verification required
      // --------------------------------------------

      if (data.verified !== true) {
        return sendJSON(res, 403, {
          success: false,
          message:
            "Pehle OTP verify karein.",
        });
      }

      // --------------------------------------------
      // Find Firebase user
      // --------------------------------------------

      const user =
        await findUserByMobile(
          firebaseAdmin,
          mobile
        );

      if (!user) {
        return sendJSON(res, 404, {
          success: false,
          message:
            "User account nahi mila.",
        });
      }

      // --------------------------------------------
      // Update Firebase Auth Password
      // --------------------------------------------

      await firebaseAdmin
        .auth()
        .updateUser(user.uid, {
          password: newPassword,
        });

      // --------------------------------------------
      // Delete OTP data
      // --------------------------------------------

      await db
        .ref(`passwordResetOtps/${mobile}`)
        .remove();

      return sendJSON(res, 200, {
        success: true,
        message:
          "Password successfully change ho gaya.",
      });
    }

    // ========================================================
    // UNKNOWN ACTION
    // ========================================================

    return sendJSON(res, 400, {
      success: false,
      message:
        "Invalid action. Use send-otp, verify-otp or reset-password.",
    });
  } catch (error) {
    console.error(
      "PASSWORD RESET API ERROR:",
      error
    );

    return sendJSON(res, 500, {
      success: false,
      message:
        error?.message ||
        "Server error occurred.",
    });
  }
}
