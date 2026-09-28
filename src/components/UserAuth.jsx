import React, { useState } from "react";
import "./UserAuth.css";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
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
    .replace(/^91/, "")
    .slice(-10);
}

// ======================================================
// MOBILE → FIREBASE INTERNAL EMAIL
//
// User को Email नहीं दिखेगा.
// Firebase Auth के लिए internal email बनाया जाएगा.
// ======================================================

function mobileToAuthEmail(mobile) {
  const cleanMobile =
    normalizeMobile(mobile);

  return `${cleanMobile}@studywithpower.app`;
}

// ======================================================
// EXAMS
// ======================================================

const exams = [
  "UPSC",
  "UPPCS",
  "UP PET",
  "BPSC",
  "MPPSC",
  "SSC",
  "Railway / RRB",
  "Banking",
  "UPSSSC",
  "RO/ARO",
  "Police",
  "Teaching",
  "Other",
];

// ======================================================
// USER AUTH
// ======================================================

export default function UserAuth({
  onClose,
  onLoginSuccess,
}) {
  const [mode, setMode] =
    useState("login");

  // Register
  const [name, setName] =
    useState("");

  const [mobile, setMobile] =
    useState("");

  const [exam, setExam] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  // Forgot Password
  const [forgotMobile, setForgotMobile] =
    useState("");

  const [otp, setOtp] =
    useState("");

  const [newPassword, setNewPassword] =
    useState("");

  const [confirmNewPassword, setConfirmNewPassword] =
    useState("");

  const [forgotStep, setForgotStep] =
    useState(1);

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  // ====================================================
  // CLEAR MESSAGE
  // ====================================================

  const clearMessages = () => {
    setMessage("");
    setError("");
  };

  // ====================================================
  // REGISTER
  // ====================================================

  const handleRegister = async (e) => {
    e.preventDefault();

    clearMessages();

    const cleanMobile =
      normalizeMobile(mobile);

    // Name
    if (!name.trim()) {
      setError(
        "कृपया अपना नाम डालें।"
      );
      return;
    }

    // Mobile
    if (!/^\d{10}$/.test(cleanMobile)) {
      setError(
        "कृपया सही 10 अंकों का Mobile Number डालें।"
      );
      return;
    }

    // Exam
    if (!exam) {
      setError(
        "कृपया अपनी परीक्षा चुनें।"
      );
      return;
    }

    // Password
    if (password.length < 6) {
      setError(
        "Password कम से कम 6 characters का होना चाहिए।"
      );
      return;
    }

    if (
      password !==
      confirmPassword
    ) {
      setError(
        "Password और Confirm Password समान नहीं हैं।"
      );
      return;
    }

    try {
      setLoading(true);

      // Firebase internal email
      const authEmail =
        mobileToAuthEmail(
          cleanMobile
        );

      // ================================================
      // CREATE FIREBASE USER
      // ================================================

      const result =
        await createUserWithEmailAndPassword(
          auth,
          authEmail,
          password
        );

      const firebaseUser =
        result.user;

      // ================================================
      // SAVE DISPLAY NAME
      // ================================================

      await updateProfile(
        firebaseUser,
        {
          displayName:
            name.trim(),
        }
      );

      // ================================================
      // USER DATA
      // ================================================

      const userData = {
        uid: firebaseUser.uid,

        name:
          name.trim(),

        mobile:
          cleanMobile,

        authEmail:
          authEmail,

        exam:
          exam,

        createdAt:
          Date.now(),

        role:
          "user",

        status:
          "active",
      };

      // ================================================
      // SAVE USERS/{UID}
      // ================================================

      await set(
        ref(
          db,
          `users/${firebaseUser.uid}`
        ),
        userData
      );

      // ================================================
      // SAVE MOBILE INDEX
      // ================================================

      await set(
        ref(
          db,
          `mobileUsers/${cleanMobile}`
        ),
        {
          uid:
            firebaseUser.uid,

          name:
            name.trim(),

          mobile:
            cleanMobile,

          authEmail:
            authEmail,

          exam:
            exam,

          createdAt:
            Date.now(),

          role:
            "user",

          status:
            "active",
        }
      );

      setMessage(
        "✅ Account सफलतापूर्वक बन गया।"
      );

      // ================================================
      // LOGIN SUCCESS
      // ================================================

      if (onLoginSuccess) {
        onLoginSuccess(
          firebaseUser
        );
      }

    } catch (err) {
      console.error(
        "Registration Error:",
        err
      );

      if (
        err.code ===
        "auth/email-already-in-use"
      ) {
        setError(
          "❌ यह Mobile Number पहले से registered है।"
        );
      } else if (
        err.code ===
        "auth/weak-password"
      ) {
        setError(
          "❌ Password कम से कम 6 characters का रखें।"
        );
      } else {
        setError(
          "❌ Registration नहीं हुआ: " +
            err.message
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // ====================================================
  // LOGIN
  // ====================================================

  const handleLogin = async (e) => {
    e.preventDefault();

    clearMessages();

    const cleanMobile =
      normalizeMobile(mobile);

    if (!/^\d{10}$/.test(cleanMobile)) {
      setError(
        "कृपया 10 अंकों का Mobile Number डालें।"
      );
      return;
    }

    if (!password) {
      setError(
        "Password डालें।"
      );
      return;
    }

    try {
      setLoading(true);

      const authEmail =
        mobileToAuthEmail(
          cleanMobile
        );

      const result =
        await signInWithEmailAndPassword(
          auth,
          authEmail,
          password
        );

      setMessage(
        "✅ Login सफल हो गया।"
      );

      if (onLoginSuccess) {
        onLoginSuccess(
          result.user
        );
      }

    } catch (err) {
      console.error(
        "Login Error:",
        err
      );

      if (
        err.code ===
          "auth/invalid-credential" ||
        err.code ===
          "auth/wrong-password" ||
        err.code ===
          "auth/user-not-found"
      ) {
        setError(
          "❌ Mobile Number या Password गलत है।"
        );
      } else {
        setError(
          "❌ Login Error: " +
            err.message
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // ====================================================
  // FORGOT PASSWORD - REQUEST OTP
  // ====================================================

  const handleRequestOtp =
    async (e) => {
      e.preventDefault();

      clearMessages();

      const cleanMobile =
        normalizeMobile(
          forgotMobile
        );

      if (
        !/^\d{10}$/.test(
          cleanMobile
        )
      ) {
        setError(
          "कृपया सही 10 अंकों का Mobile Number डालें।"
        );
        return;
      }

      try {
        setLoading(true);

        const response =
          await fetch(
            "/api/password-reset",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  action:
                    "request",

                  mobile:
                    cleanMobile,
                }),
            }
          );

        // ============================================
        // JSON ERROR SAFE HANDLING
        // ============================================

        const text =
          await response.text();

        let data = {};

        try {
          data =
            JSON.parse(text);
        } catch {
          throw new Error(
            "Server ने JSON response नहीं दिया। Vercel /api/password-reset check करें।"
          );
        }

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Password reset request failed."
          );
        }

        setForgotMobile(
          cleanMobile
        );

        setForgotStep(2);

        setMessage(
          "✅ Request Admin Panel में भेज दी गई है। Admin OTP Generate करके WhatsApp पर भेजेगा।"
        );

      } catch (err) {
        console.error(
          "Forgot Password:",
          err
        );

        setError(
          "❌ " +
            err.message
        );
      } finally {
        setLoading(false);
      }
    };

  // ====================================================
  // VERIFY OTP + NEW PASSWORD
  // ====================================================

  const handleVerifyOtp =
    async (e) => {
      e.preventDefault();

      clearMessages();

      if (
        !/^\d{6}$/.test(otp)
      ) {
        setError(
          "कृपया 6 अंकों का OTP डालें।"
        );
        return;
      }

      if (
        newPassword.length < 6
      ) {
        setError(
          "नया Password कम से कम 6 characters का होना चाहिए।"
        );
        return;
      }

      if (
        newPassword !==
        confirmNewPassword
      ) {
        setError(
          "New Password और Confirm Password समान नहीं हैं।"
        );
        return;
      }

      try {
        setLoading(true);

        const response =
          await fetch(
            "/api/password-reset",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  action:
                    "verify",

                  mobile:
                    normalizeMobile(
                      forgotMobile
                    ),

                  otp:
                    otp,

                  newPassword:
                    newPassword,
                }),
            }
          );

        const text =
          await response.text();

        let data = {};

        try {
          data =
            JSON.parse(text);
        } catch {
          throw new Error(
            "Server ने JSON response नहीं दिया। password-reset.js check करें।"
          );
        }

        if (!response.ok) {
          throw new Error(
            data.message ||
              "OTP verification failed."
          );
        }

        alert(
          "✅ Password सफलतापूर्वक बदल गया। अब Mobile Number और नए Password से Login करें।"
        );

        // Reset
        setOtp("");
        setNewPassword("");
        setConfirmNewPassword("");
        setForgotMobile("");
        setForgotStep(1);

        setMode("login");

      } catch (err) {
        console.error(
          "OTP Verify Error:",
          err
        );

        setError(
          "❌ " +
            err.message
        );
      } finally {
        setLoading(false);
      }
    };

  // ====================================================
  // FORGOT PASSWORD PAGE
  // ====================================================

  if (
    mode ===
    "forgot"
  ) {
    return (
      <div className="user-auth-overlay">

        <div className="user-auth-box">

          <button
            className="user-auth-close"
            onClick={onClose}
          >
            ×
          </button>

          <div className="user-auth-header">

            <div className="user-auth-logo">
              🔑
            </div>

            <h1>
              Forgot Password
            </h1>

            <p>
              {APP_NAME}
            </p>

          </div>

          {error && (
            <div className="auth-error">
              ❌ {error}
            </div>
          )}

          {message && (
            <div className="auth-success">
              {message}
            </div>
          )}

          {/* ==========================================
              STEP 1
          ========================================== */}

          {forgotStep === 1 && (
            <form
              onSubmit={
                handleRequestOtp
              }
            >

              <label>
                📱 Registered Mobile Number
              </label>

              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="10 अंकों का Mobile Number"
                value={
                  forgotMobile
                }
                onChange={(e) =>
                  setForgotMobile(
                    e.target.value
                      .replace(
                        /\D/g,
                        ""
                      )
                      .slice(
                        0,
                        10
                      )
                  )
                }
              />

              <button
                type="submit"
                className="auth-main-btn"
                disabled={
                  loading
                }
              >
                {loading
                  ? "⏳ Request भेजी जा रही है..."
                  : "📲 OTP Request भेजें"}
              </button>

            </form>
          )}

          {/* ==========================================
              STEP 2
          ========================================== */}

          {forgotStep === 2 && (
            <form
              onSubmit={
                handleVerifyOtp
              }
            >

              <label>
                🔢 WhatsApp OTP
              </label>

              <input
                type="tel"
                inputMode="numeric"
                maxLength={6}
                placeholder="6 अंकों का OTP"
                value={otp}
                onChange={(e) =>
                  setOtp(
                    e.target.value
                      .replace(
                        /\D/g,
                        ""
                      )
                      .slice(
                        0,
                        6
                      )
                  )
                }
              />

              <label>
                🔐 नया Password
              </label>

              <input
                type="password"
                placeholder="नया Password"
                value={
                  newPassword
                }
                onChange={(e) =>
                  setNewPassword(
                    e.target.value
                  )
                }
              />

              <label>
                🔐 Confirm Password
              </label>

              <input
                type="password"
                placeholder="Password दोबारा डालें"
                value={
                  confirmNewPassword
                }
                onChange={(e) =>
                  setConfirmNewPassword(
                    e.target.value
                  )
                }
              />

              <button
                type="submit"
                className="auth-main-btn"
                disabled={
                  loading
                }
              >
                {loading
                  ? "⏳ Password बदल रहा है..."
                  : "✅ Password Reset करें"}
              </button>

              <button
                type="button"
                className="forgot-btn"
                onClick={() => {
                  clearMessages();
                  setForgotStep(1);
                }}
              >
                ← Mobile Number बदलें
              </button>

            </form>
          )}

          <button
            className="auth-switch"
            onClick={() => {
              clearMessages();
              setMode("login");
              setForgotStep(1);
            }}
          >
            ← Login पर वापस जाएँ
          </button>

        </div>

      </div>
    );
  }

  // ====================================================
  // REGISTER PAGE
  // ====================================================

  if (
    mode ===
    "register"
  ) {
    return (
      <div className="user-auth-overlay">

        <div className="user-auth-box">

          <button
            className="user-auth-close"
            onClick={onClose}
          >
            ×
          </button>

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

          {error && (
            <div className="auth-error">
              ❌ {error}
            </div>
          )}

          {message && (
            <div className="auth-success">
              {message}
            </div>
          )}

          <form
            onSubmit={
              handleRegister
            }
          >

            <label>
              👤 आपका नाम
            </label>

            <input
              type="text"
              placeholder="पूरा नाम"
              value={name}
              onChange={(e) =>
                setName(
                  e.target.value
                )
              }
            />

            <label>
              📱 Mobile Number
            </label>

            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              placeholder="10 अंकों का Mobile Number"
              value={mobile}
              onChange={(e) =>
                setMobile(
                  e.target.value
                    .replace(
                      /\D/g,
                      ""
                    )
                    .slice(
                      0,
                      10
                    )
                )
              }
            />

            <label>
              🎯 किस परीक्षा की तैयारी कर रहे हैं?
            </label>

            <select
              value={exam}
              onChange={(e) =>
                setExam(
                  e.target.value
                )
              }
            >

              <option value="">
                परीक्षा चुनें
              </option>

              {exams.map(
                (item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                )
              )}

            </select>

            <label>
              🔐 Create Password
            </label>

            <input
              type="password"
              placeholder="कम से कम 6 characters"
              value={password}
              onChange={(e) =>
                setPassword(
                  e.target.value
                )
              }
            />

            <label>
              🔐 Confirm Password
            </label>

            <input
              type="password"
              placeholder="Password फिर से डालें"
              value={
                confirmPassword
              }
              onChange={(e) =>
                setConfirmPassword(
                  e.target.value
                )
              }
            />

            <button
              type="submit"
              className="auth-main-btn"
              disabled={
                loading
              }
            >
              {loading
                ? "⏳ Account बन रहा है..."
                : "✅ Create Account"}
            </button>

          </form>

          <div className="auth-switch">

            Account पहले से है?

            <button
              type="button"
              onClick={() => {
                clearMessages();
                setMode("login");
              }}
            >
              Login करें
            </button>

          </div>

        </div>

      </div>
    );
  }

  // ====================================================
  // LOGIN PAGE
  // ====================================================

  return (
    <div className="user-auth-overlay">

      <div className="user-auth-box">

        <button
          className="user-auth-close"
          onClick={onClose}
        >
          ×
        </button>

        <div className="user-auth-header">

          <div className="user-auth-logo">
            📚
          </div>

          <h1>
            {APP_NAME} Login
          </h1>

          <p>
            Mobile Number और Password से Login करें
          </p>

        </div>

        {error && (
          <div className="auth-error">
            ❌ {error}
          </div>
        )}

        {message && (
          <div className="auth-success">
            {message}
          </div>
        )}

        <form
          onSubmit={
            handleLogin
          }
        >

          <label>
            📱 Mobile Number
          </label>

          <input
            type="tel"
            inputMode="numeric"
            maxLength={10}
            placeholder="10 अंकों का Mobile Number"
            value={mobile}
            onChange={(e) =>
              setMobile(
                e.target.value
                  .replace(
                    /\D/g,
                    ""
                  )
                  .slice(
                    0,
                    10
                  )
              )
            }
          />

          <label>
            🔐 Password
          </label>

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) =>
              setPassword(
                e.target.value
              )
            }
          />

          <button
            type="submit"
            className="auth-main-btn"
            disabled={
              loading
            }
          >
            {loading
              ? "⏳ Login हो रहा है..."
              : "🔐 Login करें"}
          </button>

        </form>

        <button
          type="button"
          className="forgot-btn"
          onClick={() => {
            clearMessages();
            setForgotStep(1);
            setForgotMobile("");
            setMode("forgot");
          }}
          disabled={
            loading
          }
        >
          🔑 Forgot Password?
        </button>

        <div className="auth-divider">
          <span>
            या
          </span>
        </div>

        <button
          type="button"
          className="create-account-btn"
          onClick={() => {
            clearMessages();
            setMode("register");
          }}
        >
          📝 नया Account बनाएं
        </button>

        <div className="auth-note">
          नया account बनाने के लिए
          नाम, Mobile Number, परीक्षा और
          Password भरें।
        </div>

      </div>

    </div>
  );
}
