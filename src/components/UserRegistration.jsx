import React, { useState } from "react";
import "./UserAuth.css";

import {
  getAuth,
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";

import {
  getDatabase,
  ref,
  set,
} from "firebase/database";

import {
  getApps,
  getApp,
  initializeApp,
} from "firebase/app";

import firebaseConfig from "../firebase-config.json";

// ======================================================
// FIREBASE
// ======================================================

const firebaseApp = getApps().length
  ? getApp()
  : initializeApp({
      ...firebaseConfig,
      databaseURL:
        firebaseConfig.databaseURL ||
        "https://study-with-power-f6914-default-rtdb.asia-southeast1.firebasedatabase.app",
    });

const auth = getAuth(firebaseApp);
const db = getDatabase(firebaseApp);

// ======================================================
// APP NAME
// ======================================================

const APP_NAME = "Exam Test";

// ======================================================
// MOBILE NORMALIZE
// ======================================================

function normalizeMobile(value) {
  return String(value || "")
    .replace(/\D/g, "")
    .slice(-10);
}

// ======================================================
// MOBILE → FIREBASE AUTH EMAIL
// IMPORTANT:
// Login में भी यही function होना चाहिए.
// ======================================================

function mobileToAuthEmail(mobile) {
  return `${normalizeMobile(mobile)}@studywithpower.app`;
}

// ======================================================
// EXAM LIST
// ======================================================

const exams = [
  {
    id: "upsc",
    name: "UPSC",
    icon: "🇮🇳",
  },
  {
    id: "uppcs",
    name: "UPPCS",
    icon: "🏛️",
  },
  {
    id: "uppet",
    name: "UP PET",
    icon: "🎯",
  },
  {
    id: "bpsc",
    name: "BPSC",
    icon: "🏛️",
  },
  {
    id: "mppsc",
    name: "MPPSC",
    icon: "📚",
  },
  {
    id: "ssc",
    name: "SSC",
    icon: "📝",
  },
  {
    id: "railway",
    name: "Railway / RRB",
    icon: "🚆",
  },
  {
    id: "banking",
    name: "Banking",
    icon: "🏦",
  },
  {
    id: "upsssc",
    name: "UPSSSC",
    icon: "📖",
  },
  {
    id: "roaro",
    name: "RO/ARO",
    icon: "📜",
  },
  {
    id: "police",
    name: "Police",
    icon: "👮",
  },
  {
    id: "teaching",
    name: "Teaching",
    icon: "👨‍🏫",
  },
  {
    id: "other",
    name: "Other",
    icon: "🎓",
  },
];

// ======================================================
// USER REGISTRATION
// ======================================================

export default function UserRegistration({
  onSuccess,
  onLogin,
  onClose,
}) {
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [exam, setExam] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // ====================================================
  // CLEAR MESSAGE
  // ====================================================

  const clearMessages = () => {
    setError("");
    setMessage("");
  };

  // ====================================================
  // REGISTER
  // ====================================================

  const handleRegister = async (event) => {
    event.preventDefault();

    clearMessages();

    const cleanName = name.trim();
    const cleanMobile = normalizeMobile(mobile);

    // --------------------------------------------------
    // NAME
    // --------------------------------------------------

    if (!cleanName) {
      setError("कृपया अपना नाम डालें।");
      return;
    }

    if (cleanName.length < 2) {
      setError("कृपया सही नाम डालें।");
      return;
    }

    // --------------------------------------------------
    // MOBILE
    // --------------------------------------------------

    if (!/^\d{10}$/.test(cleanMobile)) {
      setError(
        "कृपया सही 10 अंकों का Mobile Number डालें।"
      );
      return;
    }

    // --------------------------------------------------
    // EXAM
    // --------------------------------------------------

    if (!exam) {
      setError(
        "कृपया अपनी परीक्षा चुनें।"
      );
      return;
    }

    // --------------------------------------------------
    // PASSWORD
    // --------------------------------------------------

    if (password.length < 6) {
      setError(
        "Password कम से कम 6 characters का होना चाहिए।"
      );
      return;
    }

    if (password !== confirmPassword) {
      setError(
        "Password और Confirm Password समान नहीं हैं।"
      );
      return;
    }

    try {
      setLoading(true);

      // =================================================
      // FIREBASE AUTH EMAIL
      // User को यह Email दिखाई नहीं देगा.
      // =================================================

      const authEmail =
        mobileToAuthEmail(cleanMobile);

      // =================================================
      // CREATE FIREBASE ACCOUNT
      // =================================================

      const result =
        await createUserWithEmailAndPassword(
          auth,
          authEmail,
          password
        );

      const firebaseUser = result.user;

      // =================================================
      // DISPLAY NAME
      // =================================================

      await updateProfile(
        firebaseUser,
        {
          displayName: cleanName,
        }
      );

      // =================================================
      // USER DATA
      // =================================================

      const createdAt =
        new Date().toISOString();

      const userData = {
        uid: firebaseUser.uid,

        name: cleanName,

        mobile: cleanMobile,

        authEmail: authEmail,

        preparation: exam,

        exam: exam,

        createdAt: createdAt,

        role: "user",

        status: "active",
      };

      // =================================================
      // SAVE USERS/{UID}
      // =================================================

      await set(
        ref(
          db,
          `users/${firebaseUser.uid}`
        ),
        userData
      );

      // =================================================
      // SAVE MOBILE USERS
      // इससे mobile number से user खोजना आसान होगा.
      // =================================================

      await set(
        ref(
          db,
          `mobileUsers/${cleanMobile}`
        ),
        {
          uid: firebaseUser.uid,

          name: cleanName,

          mobile: cleanMobile,

          authEmail: authEmail,

          exam: exam,

          createdAt: createdAt,

          role: "user",

          status: "active",
        }
      );

      // =================================================
      // SUCCESS
      // =================================================

      setMessage(
        "✅ Account सफलतापूर्वक बन गया।"
      );

      // थोड़ी देर बाद parent को user भेजें
      setTimeout(() => {
        if (onSuccess) {
          onSuccess(firebaseUser);
        }
      }, 500);

    } catch (err) {
      console.error(
        "User Registration Error:",
        err
      );

      // =================================================
      // FIREBASE ERRORS
      // =================================================

      if (
        err.code ===
        "auth/email-already-in-use"
      ) {
        setError(
          "❌ यह Mobile Number पहले से registered है। कृपया Login करें।"
        );
      } else if (
        err.code ===
        "auth/weak-password"
      ) {
        setError(
          "❌ Password बहुत कमजोर है। कम से कम 6 characters रखें।"
        );
      } else if (
        err.code ===
        "auth/invalid-email"
      ) {
        setError(
          "❌ Mobile Number सही नहीं है।"
        );
      } else if (
        err.code ===
        "auth/operation-not-allowed"
      ) {
        setError(
          "❌ Firebase Console में Email/Password Authentication चालू नहीं है।"
        );
      } else {
        setError(
          "❌ Account नहीं बन पाया: " +
            (err.message ||
              "Unknown error")
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // ====================================================
  // UI
  // ====================================================

  return (
    <div className="user-auth-overlay">

      <div className="user-auth-box">

        {/* ==============================================
            CLOSE
        ============================================== */}

        <button
          type="button"
          className="user-auth-close"
          onClick={onClose}
          disabled={loading}
        >
          ×
        </button>

        {/* ==============================================
            HEADER
        ============================================== */}

        <div className="user-auth-header">

          <div className="user-auth-logo">
            📚
          </div>

          <h1>
            Create Account
          </h1>

          <p>
            {APP_NAME} पर अपना account बनाएं
          </p>

        </div>

        {/* ==============================================
            ERROR
        ============================================== */}

        {error && (
          <div className="auth-error">
            {error}
          </div>
        )}

        {/* ==============================================
            SUCCESS
        ============================================== */}

        {message && (
          <div className="auth-success">
            {message}
          </div>
        )}

        {/* ==============================================
            FORM
        ============================================== */}

        <form
          onSubmit={handleRegister}
        >

          {/* ============================================
              NAME
          ============================================ */}

          <label>
            👤 आपका नाम
          </label>

          <input
            type="text"
            placeholder="अपना पूरा नाम"
            value={name}
            autoComplete="name"
            disabled={loading}
            onChange={(event) => {
              setName(
                event.target.value
              );
              clearMessages();
            }}
          />

          {/* ============================================
              MOBILE
          ============================================ */}

          <label>
            📱 Mobile Number
          </label>

          <input
            type="tel"
            inputMode="numeric"
            maxLength={10}
            placeholder="10 अंकों का Mobile Number"
            value={mobile}
            autoComplete="tel"
            disabled={loading}
            onChange={(event) => {
              const value =
                event.target.value
                  .replace(/\D/g, "")
                  .slice(0, 10);

              setMobile(value);
              clearMessages();
            }}
          />

          {/* ============================================
              EXAM
          ============================================ */}

          <label>
            🎯 किस परीक्षा की तैयारी कर रहे हैं?
          </label>

          <select
            value={exam}
            disabled={loading}
            onChange={(event) => {
              setExam(
                event.target.value
              );
              clearMessages();
            }}
          >

            <option value="">
              परीक्षा चुनें
            </option>

            {exams.map((item) => (
              <option
                key={item.id}
                value={item.name}
              >
                {item.icon} {item.name}
              </option>
            ))}

          </select>

          {/* ============================================
              PASSWORD
          ============================================ */}

          <label>
            🔐 Password बनाएं
          </label>

          <input
            type="password"
            placeholder="कम से कम 6 characters"
            value={password}
            autoComplete="new-password"
            disabled={loading}
            onChange={(event) => {
              setPassword(
                event.target.value
              );
              clearMessages();
            }}
          />

          {/* ============================================
              CONFIRM PASSWORD
          ============================================ */}

          <label>
            🔐 Confirm Password
          </label>

          <input
            type="password"
            placeholder="Password दोबारा डालें"
            value={confirmPassword}
            autoComplete="new-password"
            disabled={loading}
            onChange={(event) => {
              setConfirmPassword(
                event.target.value
              );
              clearMessages();
            }}
          />

          {/* ============================================
              CREATE ACCOUNT BUTTON
          ============================================ */}

          <button
            type="submit"
            className="auth-main-btn"
            disabled={loading}
          >
            {loading
              ? "⏳ Account बन रहा है..."
              : "✅ Create Account"}
          </button>

        </form>

        {/* ==============================================
            LOGIN
        ============================================== */}

        <div className="auth-switch">

          <span>
            Account पहले से है?
          </span>

          <button
            type="button"
            disabled={loading}
            onClick={() => {
              clearMessages();

              if (onLogin) {
                onLogin();
              }
            }}
          >
            Login करें
          </button>

        </div>

        {/* ==============================================
            INFO
        ============================================== */}

        <div className="auth-note">

          📱 Login के लिए केवल आपका
          <strong> Mobile Number </strong>
          और
          <strong> Password </strong>
          इस्तेमाल होगा।

          <br />

          📧 Email की जरूरत नहीं है।

        </div>

      </div>

    </div>
  );
}
