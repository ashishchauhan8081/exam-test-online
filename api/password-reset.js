// ============================================================
// Exam Test
// Password Reset API
// User -> Admin Request -> Admin generates OTP -> Admin sends
// WhatsApp manually -> User verifies OTP + sets new password
// ============================================================

import admin from "firebase-admin";
import crypto from "crypto";

function getFirebaseAdmin() {
  if (admin.apps.length > 0) return admin;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not configured");
  }

  const serviceAccount = JSON.parse(raw);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL:
      process.env.FIREBASE_DATABASE_URL ||
      "https://study-with-power-f6914-default-rtdb.asia-southeast1.firebasedatabase.app",
  });

  return admin;
}

function sendJSON(res, status, data) {
  res.status(status);
  res.setHeader("Content-Type", "application/json");
  return res.end(JSON.stringify(data));
}

function normalizeMobile(value) {
  let number = String(value || "").replace(/\D/g, "");

  if (number.startsWith("91") && number.length === 12) {
    number = number.slice(2);
  }

  if (number.length === 11 && number.startsWith("0")) {
    number = number.slice(1);
  }

  return number.slice(-10);
}

function normalizeWhatsAppMobile(value) {
  const mobile = normalizeMobile(value);
  return mobile ? `91${mobile}` : "";
}

function generateOTP() {
  return crypto.randomInt(100000, 1000000).toString();
}

function hashOTP(otp) {
  return crypto
    .createHash("sha256")
    .update(String(otp))
    .digest("hex");
}

async function getBody(req) {
  if (req.body && typeof req.body === "object") return req.body;

  if (typeof req.body === "string" && req.body.trim()) {
    return JSON.parse(req.body);
  }

  return {};
}

// ------------------------------------------------------------
// ADMIN AUTH
// ------------------------------------------------------------

async function requireAdmin(firebaseAdmin, req) {
  const authHeader = String(
    req.headers?.authorization || ""
  );

  if (!authHeader.startsWith("Bearer ")) {
    throw Object.assign(new Error("Admin authentication required."), {
      statusCode: 401,
    });
  }

  const token = authHeader.substring(7).trim();

  if (!token) {
    throw Object.assign(new Error("Admin authentication required."), {
      statusCode: 401,
    });
  }

  const decoded = await firebaseAdmin
    .auth()
    .verifyIdToken(token);

  const adminEmail = String(
    process.env.ADMIN_EMAIL || "cciashish@gmail.com"
  ).toLowerCase();

  if (
    String(decoded.email || "").toLowerCase() !==
    adminEmail
  ) {
    throw Object.assign(new Error("Admin access denied."), {
      statusCode: 403,
    });
  }

  return decoded;
}

// ------------------------------------------------------------
// USER LOOKUP
// ------------------------------------------------------------

async function findUserByMobile(firebaseAdmin, mobile) {
  const db = firebaseAdmin.database();

  const snapshot = await db
    .ref(`mobileUsers/${mobile}`)
    .get();

  if (!snapshot.exists()) return null;

  const data = snapshot.val();

  if (!data?.uid) return null;

  try {
    return await firebaseAdmin.auth().getUser(data.uid);
  } catch {
    return null;
  }
}

async function getRequestByMobile(db, mobile) {
  const snapshot = await db
    .ref("passwordResetRequests")
    .orderByChild("mobile")
    .equalTo(mobile)
    .get();

  if (!snapshot.exists()) return null;

  const values = snapshot.val() || {};

  const items = Object.entries(values)
    .map(([id, data]) => ({ id, ...(data || {}) }))
    .sort(
      (a, b) =>
        Number(b.createdAt || 0) -
        Number(a.createdAt || 0)
    );

  return items[0] || null;
}

// ------------------------------------------------------------
// MAIN HANDLER
// ------------------------------------------------------------

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");

  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, OPTIONS"
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
    return res.status(200).end();
  }

  try {
    const firebaseAdmin = getFirebaseAdmin();
    const db = firebaseAdmin.database();

    // ========================================================
    // GET: ADMIN LIST
    // ========================================================

    if (req.method === "GET") {
      await requireAdmin(firebaseAdmin, req);

      const snapshot = await db
        .ref("passwordResetRequests")
        .get();

      const values = snapshot.exists()
        ? snapshot.val() || {}
        : {};

      const requests = Object.entries(values)
        .map(([id, data]) => ({
          id,
          ...(data || {}),
        }))
        .filter(
          (item) =>
            item.status !== "used" &&
            item.status !== "cleared"
        )
        .sort(
          (a, b) =>
            Number(b.createdAt || 0) -
            Number(a.createdAt || 0)
        );

      return sendJSON(res, 200, {
        success: true,
        requests,
      });
    }

    if (req.method !== "POST") {
      return sendJSON(res, 405, {
        success: false,
        message: "Only POST method is allowed.",
      });
    }

    const body = await getBody(req);
    const action = String(body.action || "");

    // ========================================================
    // ACTION: REQUEST
    // Public user action. No OTP is generated here.
    // ========================================================

    if (action === "request") {
      const mobile = normalizeMobile(body.mobile);

      if (!/^[6-9]\d{9}$/.test(mobile)) {
        return sendJSON(res, 400, {
          success: false,
          message: "कृपया सही 10 अंकों का Mobile Number डालें।",
        });
      }

      const user = await findUserByMobile(
        firebaseAdmin,
        mobile
      );

      if (!user) {
        return sendJSON(res, 404, {
          success: false,
          message: "इस Mobile Number से कोई account नहीं मिला।",
        });
      }

      const oldRequest = await getRequestByMobile(
        db,
        mobile
      );

      // If an active request exists, don't create duplicates.
      if (
        oldRequest &&
        ["pending", "otp_generated", "sent"].includes(
          oldRequest.status
        )
      ) {
        return sendJSON(res, 200, {
          success: true,
          requestId: oldRequest.id,
          message:
            "Password reset request पहले से Admin Panel में मौजूद है। Admin से OTP प्राप्त करें।",
        });
      }

      const requestRef = db
        .ref("passwordResetRequests")
        .push();

      const userSnapshot = await db
        .ref(`mobileUsers/${mobile}`)
        .get();

      const userData = userSnapshot.exists()
        ? userSnapshot.val() || {}
        : {};

      await requestRef.set({
        mobile,
        uid: user.uid,
        name:
          userData.name ||
          user.displayName ||
          "",
        status: "pending",
        otp: null,
        createdAt: Date.now(),
        generatedAt: null,
        sentAt: null,
        usedAt: null,
      });

      return sendJSON(res, 200, {
        success: true,
        requestId: requestRef.key,
        message:
          "Password reset request Admin Panel में भेज दी गई है।",
      });
    }

    // ========================================================
    // ALL REMAINING ACTIONS ARE ADMIN ACTIONS
    // ========================================================

    await requireAdmin(firebaseAdmin, req);

    // ========================================================
    // ACTION: GENERATE OTP
    // ========================================================

    if (action === "generate") {
      const mobile = normalizeMobile(body.mobile);
      const requestId = String(body.requestId || "");

      if (!/^[6-9]\d{9}$/.test(mobile)) {
        return sendJSON(res, 400, {
          success: false,
          message: "Invalid mobile number.",
        });
      }

      const user = await findUserByMobile(
        firebaseAdmin,
        mobile
      );

      if (!user) {
        return sendJSON(res, 404, {
          success: false,
          message: "User account नहीं मिला।",
        });
      }

      let requestRef;
      let requestData;

      if (requestId) {
        requestRef = db.ref(
          `passwordResetRequests/${requestId}`
        );

        const snap = await requestRef.get();

        if (snap.exists()) {
          requestData = snap.val() || {};
        }
      }

      if (!requestRef || !requestData) {
        const existing = await getRequestByMobile(
          db,
          mobile
        );

        if (existing) {
          requestRef = db.ref(
            `passwordResetRequests/${existing.id}`
          );
          requestData = existing;
        }
      }

      if (!requestRef || !requestData) {
        return sendJSON(res, 404, {
          success: false,
          message: "Password reset request नहीं मिली।",
        });
      }

      const otp = generateOTP();
      const otpHash = hashOTP(otp);
      const now = Date.now();
      const expiresAt = now + 10 * 60 * 1000;

      await db
        .ref(`passwordResetOtps/${mobile}`)
        .set({
          otpHash,
          uid: user.uid,
          mobile,
          createdAt: now,
          expiresAt,
          attempts: 0,
          verified: false,
        });

      await requestRef.update({
        uid: user.uid,
        mobile,
        status: "otp_generated",
        otp,
        generatedAt: now,
        expiresAt,
        sentAt: null,
        usedAt: null,
      });

      return sendJSON(res, 200, {
        success: true,
        otp,
        expiresAt,
        message:
          "✅ OTP generate हो गया। अब WhatsApp खोलकर OTP manually भेजें।",
      });
    }

    // ========================================================
    // ACTION: MARK SENT
    // ========================================================

    if (action === "mark-sent") {
      const mobile = normalizeMobile(body.mobile);
      const requestId = String(body.requestId || "");

      const requestRef = requestId
        ? db.ref(`passwordResetRequests/${requestId}`)
        : null;

      if (!requestRef) {
        return sendJSON(res, 400, {
          success: false,
          message: "Request ID required.",
        });
      }

      await requestRef.update({
        status: "sent",
        sentAt: Date.now(),
      });

      return sendJSON(res, 200, {
        success: true,
        message: "WhatsApp sent status saved.",
      });
    }

    // ========================================================
    // ACTION: CLEAR
    // ========================================================

    if (action === "clear") {
      const requestId = String(body.requestId || "");

      if (!requestId) {
        return sendJSON(res, 400, {
          success: false,
          message: "Request ID required.",
        });
      }

      const requestRef = db.ref(
        `passwordResetRequests/${requestId}`
      );

      const requestSnap = await requestRef.get();

      if (requestSnap.exists()) {
        const data = requestSnap.val() || {};

        if (data.mobile) {
          await db
            .ref(`passwordResetOtps/${normalizeMobile(data.mobile)}`)
            .remove();
        }
      }

      await requestRef.remove();

      return sendJSON(res, 200, {
        success: true,
        message: "Request cleared.",
      });
    }

    // ========================================================
    // ACTION: VERIFY
    // User sends OTP + new password.
    // ========================================================

    if (action === "verify") {
      const mobile = normalizeMobile(body.mobile);
      const otp = String(body.otp || "").trim();
      const newPassword = String(body.newPassword || "");

      if (!/^[6-9]\d{9}$/.test(mobile)) {
        return sendJSON(res, 400, {
          success: false,
          message: "Invalid mobile number.",
        });
      }

      if (!/^\d{6}$/.test(otp)) {
        return sendJSON(res, 400, {
          success: false,
          message: "OTP 6 digit का होना चाहिए।",
        });
      }

      if (newPassword.length < 6) {
        return sendJSON(res, 400, {
          success: false,
          message:
            "Password कम से कम 6 characters का होना चाहिए।",
        });
      }

      const otpRef = db.ref(
        `passwordResetOtps/${mobile}`
      );

      const otpSnap = await otpRef.get();

      if (!otpSnap.exists()) {
        return sendJSON(res, 400, {
          success: false,
          message:
            "OTP नहीं मिला। Admin से नया OTP प्राप्त करें।",
        });
      }

      const otpData = otpSnap.val() || {};

      if (
        !otpData.expiresAt ||
        Date.now() > Number(otpData.expiresAt)
      ) {
        await otpRef.remove();

        return sendJSON(res, 400, {
          success: false,
          message:
            "OTP expire हो गया। Admin से नया OTP लें।",
        });
      }

      const attempts = Number(
        otpData.attempts || 0
      );

      if (attempts >= 5) {
        await otpRef.remove();

        return sendJSON(res, 429, {
          success: false,
          message:
            "OTP attempts limit पूरी हो गई। नया OTP लें।",
        });
      }

      // Verify OTP hash.
      if (hashOTP(otp) !== otpData.otpHash) {
        await db
          .ref(`passwordResetOtps/${mobile}/attempts`)
          .set(attempts + 1);

        return sendJSON(res, 400, {
          success: false,
          message: "OTP गलत है।",
        });
      }

      const user = await findUserByMobile(
        firebaseAdmin,
        mobile
      );

      if (!user) {
        return sendJSON(res, 404, {
          success: false,
          message: "User account नहीं मिला।",
        });
      }

      await firebaseAdmin
        .auth()
        .updateUser(user.uid, {
          password: newPassword,
        });

      await otpRef.remove();

      const request = await getRequestByMobile(
        db,
        mobile
      );

      if (request) {
        await db
          .ref(`passwordResetRequests/${request.id}`)
          .update({
            status: "used",
            usedAt: Date.now(),
            otp: null,
          });
      }

      return sendJSON(res, 200, {
        success: true,
        message:
          "Password successfully change हो गया।",
      });
    }

    return sendJSON(res, 400, {
      success: false,
      message:
        "Invalid action. Use request, generate, mark-sent, clear or verify.",
    });
  } catch (error) {
    console.error("PASSWORD RESET API ERROR:", error);

    return sendJSON(
      res,
      Number(error?.statusCode || 500),
      {
        success: false,
        message:
          error?.message ||
          "Server error occurred.",
      }
    );
  }
}
