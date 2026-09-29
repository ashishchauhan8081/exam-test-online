import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import "./App.css";

import {
  getApps,
  getApp,
  initializeApp,
} from "firebase/app";

import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";

import {
  getDatabase,
  ref,
  get,
  set,
} from "firebase/database";

import firebaseConfig from "./firebase-config.json";

import AdminPanel from "./components/AdminPanel";
import AIMCQGenerator from "./components/AIMCQGenerator";
import CurrentAffairs from "./pages/CurrentAffairs";
import TestSeries from "./pages/TestSeries";
import TestRunner from "./components/TestRunner";

/* ======================================================
   FIREBASE
====================================================== */

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

/* ======================================================
   APP SETTINGS
====================================================== */

const APP_NAME = "Exam Test";

const ADMIN_EMAIL = "cciashish@gmail.com";

/* ======================================================
   EXAMS
====================================================== */

const exams = [
  {
    id: "upsc",
    name: "UPSC",
    icon: "🇮🇳",
    color: "#fee2e2",
  },
  {
    id: "uppcs",
    name: "UPPCS",
    icon: "🏛️",
    color: "#fef3c7",
  },
  {
    id: "uppet",
    name: "UP PET",
    icon: "🎯",
    color: "#dcfce7",
  },
  {
    id: "bpsc",
    name: "BPSC",
    icon: "🏛️",
    color: "#ede9fe",
  },
  {
    id: "mppsc",
    name: "MPPSC",
    icon: "📚",
    color: "#dbeafe",
  },
  {
    id: "ssc",
    name: "SSC",
    icon: "📝",
    color: "#fce7f3",
  },
  {
    id: "railway",
    name: "Railway",
    icon: "🚆",
    color: "#e0f2fe",
  },
  {
    id: "banking",
    name: "Banking",
    icon: "🏦",
    color: "#dcfce7",
  },
  {
    id: "upsssc",
    name: "UPSSSC",
    icon: "📖",
    color: "#f3e8ff",
  },
  {
    id: "roaro",
    name: "RO/ARO",
    icon: "📜",
    color: "#fef3c7",
  },
  {
    id: "police",
    name: "Police",
    icon: "👮",
    color: "#fee2e2",
  },
  {
    id: "teaching",
    name: "Teaching",
    icon: "👨‍🏫",
    color: "#dbeafe",
  },
];

/* ======================================================
   HELPERS
====================================================== */

function normalizeMobile(value) {
  return String(value || "")
    .replace(/\D/g, "")
    .replace(/^91/, "")
    .slice(-10);
}

/*
  User को केवल Mobile Number दिखाई देगा।
  Firebase Authentication के लिए internal email बनेगा।
*/

function mobileToAuthEmail(mobile) {
  return `${normalizeMobile(
    mobile
  )}@mobile.examtest.local`;
}

/* ======================================================
   GET USER DATA
====================================================== */

async function getUserData(uid) {
  if (!uid) return null;

  try {
    const snapshot = await get(
      ref(db, `users/${uid}`)
    );

    if (snapshot.exists()) {
      return snapshot.val();
    }

    return null;
  } catch (error) {
    console.error(
      "getUserData Error:",
      error
    );

    return null;
  }
}

/* ======================================================
   AUTH SHELL
====================================================== */

function AuthShell({ children }) {
  return (
    <div className="auth-overlay">
      <div className="auth-card">
        {children}
      </div>
    </div>
  );
}

/* ======================================================
   USER LOGIN
====================================================== */

function LoginPage({
  onSuccess,
  onRegister,
  onForgot,
  onAdmin,
}) {
  const [mobile, setMobile] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const handleLogin = async (
    event
  ) => {
    event.preventDefault();

    const cleanMobile =
      normalizeMobile(mobile);

    if (!/^\d{10}$/.test(cleanMobile)) {
      alert(
        "कृपया 10 अंकों का Mobile Number डालें।"
      );
      return;
    }

    if (!password) {
      alert("Password डालें।");
      return;
    }

    try {
      setLoading(true);

      const result =
        await signInWithEmailAndPassword(
          auth,
          mobileToAuthEmail(
            cleanMobile
          ),
          password
        );

      /*
        Admin को User Login से रोकना
      */

      if (
        result.user.email &&
        result.user.email.toLowerCase() ===
          ADMIN_EMAIL.toLowerCase()
      ) {
        await signOut(auth);

        alert(
          "❌ Admin के लिए Admin Login इस्तेमाल करें।"
        );

        return;
      }

      onSuccess?.(result.user);
    } catch (error) {
      console.error(
        "User Login Error:",
        error
      );

      if (
        error.code ===
          "auth/invalid-credential" ||
        error.code ===
          "auth/user-not-found" ||
        error.code ===
          "auth/wrong-password"
      ) {
        alert(
          "❌ Mobile Number या Password गलत है।"
        );
      } else {
        alert(
          "❌ Login Error:\n" +
            error.message
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <div className="auth-icon">
        📱
      </div>

      <h1>
        {APP_NAME} Login
      </h1>

      <p>
        Mobile Number और Password से Login करें
      </p>

      <form
        onSubmit={handleLogin}
      >
        <label>
          📱 Mobile Number
        </label>

        <input
          type="tel"
          inputMode="numeric"
          maxLength={10}
          placeholder="10 digit mobile number"
          value={mobile}
          onChange={(e) =>
            setMobile(
              e.target.value
                .replace(/\D/g, "")
                .slice(0, 10)
            )
          }
        />

        <label>
          🔐 Password
        </label>

        <input
          type="password"
          placeholder="अपना Password डालें"
          value={password}
          onChange={(e) =>
            setPassword(
              e.target.value
            )
          }
        />

        <button
          type="submit"
          disabled={loading}
          className="auth-primary-btn"
        >
          {loading
            ? "⏳ Login हो रहा है..."
            : "🔐 Login"}
        </button>
      </form>

      <button
        type="button"
        className="forgot-btn"
        onClick={onForgot}
      >
        🔑 Forgot Password?
      </button>

      <div className="auth-switch">
        नया account बनाना है?

        <button
          type="button"
          onClick={onRegister}
        >
          Create Account
        </button>
      </div>

      <button
        type="button"
        className="admin-login-link"
        onClick={onAdmin}
      >
        👨‍💼 Admin Login
      </button>
    </AuthShell>
  );
}

/* ======================================================
   REGISTER
====================================================== */

function RegisterPage({
  onSuccess,
  onLogin,
}) {
  const [name, setName] =
    useState("");

  const [mobile, setMobile] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [confirm, setConfirm] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const handleRegister = async (
    event
  ) => {
    event.preventDefault();

    const cleanMobile =
      normalizeMobile(mobile);

    if (!name.trim()) {
      alert(
        "कृपया अपना नाम डालें।"
      );
      return;
    }

    if (!/^\d{10}$/.test(cleanMobile)) {
      alert(
        "कृपया 10 अंकों का Mobile Number डालें।"
      );
      return;
    }

    if (password.length < 6) {
      alert(
        "Password कम से कम 6 characters का होना चाहिए।"
      );
      return;
    }

    if (password !== confirm) {
      alert(
        "Password और Confirm Password समान नहीं हैं।"
      );
      return;
    }

    try {
      setLoading(true);

      /*
        Mobile → Internal Firebase Email
      */

      const authEmail =
        mobileToAuthEmail(
          cleanMobile
        );

      const result =
        await createUserWithEmailAndPassword(
          auth,
          authEmail,
          password
        );

      await updateProfile(
        result.user,
        {
          displayName:
            name.trim(),
        }
      );

      const createdAt =
        new Date().toISOString();

      /*
        User Profile
      */

      const userData = {
        uid: result.user.uid,

        name:
          name.trim(),

        mobile:
          cleanMobile,

        authEmail,

        preparation:
          "",

        createdAt,

        role:
          "user",

        status:
          "active",
      };

      await set(
        ref(
          db,
          `users/${result.user.uid}`
        ),
        userData
      );

      /*
        Mobile Index
      */

      await set(
        ref(
          db,
          `mobileUsers/${cleanMobile}`
        ),
        {
          uid:
            result.user.uid,

          name:
            name.trim(),

          mobile:
            cleanMobile,

          authEmail,

          createdAt,

          role:
            "user",

          status:
            "active",
        }
      );

      alert(
        "✅ Account सफलतापूर्वक बन गया।"
      );

      onSuccess?.(
        result.user
      );
    } catch (error) {
      console.error(
        "Registration Error:",
        error
      );

      if (
        error.code ===
        "auth/email-already-in-use"
      ) {
        alert(
          "❌ यह Mobile Number पहले से registered है।"
        );
      } else if (
        error.code ===
        "auth/weak-password"
      ) {
        alert(
          "❌ Password बहुत कमजोर है।"
        );
      } else {
        alert(
          "❌ Registration Error:\n" +
            error.message
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <div className="auth-icon">
        📝
      </div>

      <h1>
        Create Account
      </h1>

      <p>
        {APP_NAME} पर अपना account बनाएं
      </p>

      <form
        onSubmit={handleRegister}
      >
        <label>
          👤 आपका नाम
        </label>

        <input
          type="text"
          placeholder="अपना पूरा नाम"
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
          placeholder="10 digit mobile number"
          value={mobile}
          onChange={(e) =>
            setMobile(
              e.target.value
                .replace(/\D/g, "")
                .slice(0, 10)
            )
          }
        />

        <label>
          🔐 Password बनाएं
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
          placeholder="Password दोबारा डालें"
          value={confirm}
          onChange={(e) =>
            setConfirm(
              e.target.value
            )
          }
        />

        <button
          type="submit"
          disabled={loading}
          className="auth-primary-btn"
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
          onClick={onLogin}
        >
          Login करें
        </button>
      </div>
    </AuthShell>
  );
}

/* ======================================================
   EXAM SELECTION
====================================================== */

function ExamSelectionPage({
  user,
  onComplete,
}) {
  const [selected, setSelected] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const saveExam = async () => {
    if (!selected) {
      alert(
        "कृपया परीक्षा चुनें।"
      );
      return;
    }

    if (!user?.uid) {
      alert(
        "❌ User session नहीं मिला।"
      );
      return;
    }

    try {
      setLoading(true);

      await set(
        ref(
          db,
          `users/${user.uid}/preparation`
        ),
        selected
      );

      onComplete?.(
        selected
      );
    } catch (error) {
      console.error(
        "Exam Selection Error:",
        error
      );

      alert(
        "❌ परीक्षा save नहीं हुई:\n" +
          error.message
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <div className="auth-icon">
        🎯
      </div>

      <h1>
        परीक्षा चुनें
      </h1>

      <p>
        आप किस परीक्षा की तैयारी कर रहे हैं?
      </p>

      <div className="exam-selection-grid">
        {exams.map(
          (exam) => {
            const active =
              selected ===
              exam.name;

            return (
              <button
                key={exam.id}
                type="button"
                className={
                  `exam-select-card ` +
                  (active
                    ? "active"
                    : "")
                }
                onClick={() =>
                  setSelected(
                    exam.name
                  )
                }
                style={{
                  background:
                    active
                      ? "#eff6ff"
                      : exam.color,
                }}
              >
                <span>
                  {exam.icon}
                </span>

                <strong>
                  {exam.name}
                </strong>
              </button>
            );
          }
        )}
      </div>

      <button
        type="button"
        className="auth-primary-btn"
        disabled={
          loading ||
          !selected
        }
        onClick={saveExam}
      >
        {loading
          ? "⏳ Save हो रहा है..."
          : "Continue →"}
      </button>
    </AuthShell>
  );
}

/* ======================================================
   FORGOT PASSWORD
====================================================== */

function ForgotPassword({
  onBack,
}) {
  const [step, setStep] =
    useState(1);

  const [mobile, setMobile] =
    useState("");

  const [otp, setOtp] =
    useState("");

  const [newPassword, setNewPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  /* ====================================================
     REQUEST OTP
  ==================================================== */

  const requestOtp = async (
    event
  ) => {
    event.preventDefault();

    const cleanMobile =
      normalizeMobile(mobile);

    if (!/^\d{10}$/.test(cleanMobile)) {
      alert(
        "कृपया 10 अंकों का Mobile Number डालें।"
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

            body: JSON.stringify({
              action:
                "request",

              mobile:
                cleanMobile,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Request failed"
        );
      }

      setMobile(
        cleanMobile
      );

      setStep(2);

      alert(
        "✅ Password reset request Admin Panel में भेज दी गई है। Admin OTP Generate करके WhatsApp पर भेजेगा।"
      );
    } catch (error) {
      console.error(
        "Reset Request:",
        error
      );

      alert(
        "❌ " +
          error.message
      );
    } finally {
      setLoading(false);
    }
  };

  /* ====================================================
     VERIFY OTP
  ==================================================== */

  const verifyReset = async (
    event
  ) => {
    event.preventDefault();

    if (!/^\d{6}$/.test(otp)) {
      alert(
        "6 अंकों का OTP डालें।"
      );
      return;
    }

    if (
      newPassword.length < 6
    ) {
      alert(
        "नया Password कम से कम 6 characters का होना चाहिए।"
      );
      return;
    }

    if (
      newPassword !==
      confirmPassword
    ) {
      alert(
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

            body: JSON.stringify({
              action:
                "verify",

              mobile,

              otp,

              newPassword,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "OTP verification failed"
        );
      }

      alert(
        "✅ Password सफलतापूर्वक बदल गया। अब Mobile Number + नया Password से Login करें।"
      );

      onBack?.();
    } catch (error) {
      console.error(
        "Reset Verify:",
        error
      );

      alert(
        "❌ " +
          error.message
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <div className="auth-icon">
        🔑
      </div>

      <h1>
        Forgot Password
      </h1>

      {step === 1 ? (
        <>
          <p>
            Registered Mobile Number डालें
          </p>

          <form
            onSubmit={
              requestOtp
            }
          >
            <label>
              📱 Mobile Number
            </label>

            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              placeholder="10 digit mobile number"
              value={mobile}
              onChange={(e) =>
                setMobile(
                  e.target.value
                    .replace(/\D/g, "")
                    .slice(0, 10)
                )
              }
            />

            <button
              type="submit"
              disabled={loading}
              className="auth-primary-btn"
            >
              {loading
                ? "⏳ Request भेजी जा रही है..."
                : "📲 OTP Request भेजें"}
            </button>
          </form>
        </>
      ) : (
        <>
          <p>
            Admin द्वारा भेजा गया OTP और
            नया Password डालें
          </p>

          <form
            onSubmit={
              verifyReset
            }
          >
            <label>
              🔢 OTP
            </label>

            <input
              type="tel"
              inputMode="numeric"
              maxLength={6}
              placeholder="6 digit OTP"
              value={otp}
              onChange={(e) =>
                setOtp(
                  e.target.value
                    .replace(/\D/g, "")
                    .slice(0, 6)
                )
              }
            />

            <label>
              🔐 New Password
            </label>

            <input
              type="password"
              placeholder="नया Password"
              value={newPassword}
              onChange={(e) =>
                setNewPassword(
                  e.target.value
                )
              }
            />

            <label>
              🔐 Confirm New Password
            </label>

            <input
              type="password"
              placeholder="Password दोबारा डालें"
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
              disabled={loading}
              className="auth-primary-btn"
            >
              {loading
                ? "⏳ Password बदल रहा है..."
                : "✅ Password Reset करें"}
            </button>
          </form>

          <button
            type="button"
            className="auth-close-btn"
            onClick={() =>
              setStep(1)
            }
          >
            ← Mobile Number बदलें
          </button>
        </>
      )}

      <button
        type="button"
        className="auth-close-btn"
        onClick={onBack}
      >
        ← Login पर वापस जाएँ
      </button>
    </AuthShell>
  );
}

/* ======================================================
   ADMIN LOGIN
====================================================== */

function AdminLogin({
  onSuccess,
  onBack,
}) {
  const [email, setEmail] =
    useState(
      ADMIN_EMAIL
    );

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const handleLogin = async (
    event
  ) => {
    event.preventDefault();

    if (
      !email.trim() ||
      !password
    ) {
      alert(
        "Email और Password दोनों डालें।"
      );
      return;
    }

    try {
      setLoading(true);

      const result =
        await signInWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );

      if (
        result.user.email?.toLowerCase() !==
        ADMIN_EMAIL.toLowerCase()
      ) {
        await signOut(auth);

        alert(
          "❌ यह Admin account नहीं है।"
        );

        return;
      }

      onSuccess?.(
        result.user
      );
    } catch (error) {
      console.error(
        "Admin Login:",
        error
      );

      alert(
        "❌ Admin Login failed:\n" +
          error.message
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <div className="auth-icon">
        👨‍💼
      </div>

      <h1>
        Admin Login
      </h1>

      <p>
        Admin के लिए Email + Password
      </p>

      <form
        onSubmit={handleLogin}
      >
        <label>
          📧 Admin Email
        </label>

        <input
          type="email"
          value={email}
          onChange={(e) =>
            setEmail(
              e.target.value
            )
          }
        />

        <label>
          🔐 Password
        </label>

        <input
          type="password"
          placeholder="Admin Password"
          value={password}
          onChange={(e) =>
            setPassword(
              e.target.value
            )
          }
        />

        <button
          type="submit"
          disabled={loading}
          className="auth-primary-btn"
        >
          {loading
            ? "⏳ Login..."
            : "👨‍💼 Admin Login"}
        </button>
      </form>

      <button
        type="button"
        className="auth-close-btn"
        onClick={onBack}
      >
        ← User Login
      </button>
    </AuthShell>
  );
}

/* ======================================================
   PASSWORD RESET ADMIN
====================================================== */

function PasswordResetAdmin() {
  const [requests, setRequests] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  const [generating, setGenerating] =
    useState("");

  const [message, setMessage] =
    useState("");

  const loadRequests =
    async () => {
      try {
        setLoading(true);

        const currentUser =
          auth.currentUser;

        if (!currentUser) {
          throw new Error(
            "Admin session नहीं मिला।"
          );
        }

        const token =
          await currentUser.getIdToken();

        const response =
          await fetch(
            "/api/password-reset?action=list",
            {
              method: "GET",

              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Requests load नहीं हुईं"
          );
        }

        setRequests(
          Array.isArray(
            data.requests
          )
            ? data.requests
            : []
        );
      } catch (error) {
        console.error(
          "Load reset requests:",
          error
        );

        setMessage(
          "❌ " +
            error.message
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadRequests();
  }, []);

  const generateOtp =
    async (request) => {
      try {
        const requestKey =
          request.requestId ||
          request.id ||
          request.mobile ||
          "";

        setGenerating(
          requestKey
        );

        setMessage("");

        const currentUser =
          auth.currentUser;

        if (!currentUser) {
          throw new Error(
            "Admin session नहीं मिला।"
          );
        }

        const token =
          await currentUser.getIdToken();

        const response =
          await fetch(
            "/api/password-reset",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",

                Authorization:
                  `Bearer ${token}`,
              },

              body: JSON.stringify({
                action:
                  "generate",

                requestId:
                  request.requestId ||
                  request.id ||
                  "",

                mobile:
                  request.mobile ||
                  request.identifier ||
                  "",

                identifier:
                  request.identifier ||
                  request.mobile ||
                  "",
              }),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "OTP generate नहीं हुआ"
          );
        }

        setMessage(
          data.message ||
            "✅ OTP Generate हो गया और WhatsApp भेजने की प्रक्रिया शुरू हो गई।"
        );

        await loadRequests();
      } catch (error) {
        console.error(
          "Generate OTP:",
          error
        );

        setMessage(
          "❌ " +
            error.message
        );
      } finally {
        setGenerating("");
      }
    };

  return (
    <div
      style={{
        padding: "20px",
        maxWidth: "1100px",
        margin: "0 auto",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems:
            "center",
          gap: "12px",
          flexWrap:
            "wrap",
          marginBottom:
            "20px",
        }}
      >
        <div>
          <h1>
            🔑 Password Reset Requests
          </h1>

          <p>
            Users के Mobile Password Reset
            Requests यहाँ दिखाई देंगी।
          </p>
        </div>

        <button
          type="button"
          onClick={
            loadRequests
          }
          disabled={loading}
          style={{
            padding:
              "10px 16px",

            border:
              "none",

            borderRadius:
              "8px",

            cursor:
              "pointer",

            fontWeight:
              "700",
          }}
        >
          {loading
            ? "⏳ Loading..."
            : "🔄 Refresh"}
        </button>
      </div>

      {message && (
        <div
          style={{
            padding:
              "12px",

            marginBottom:
              "15px",

            background:
              "#f3f4f6",

            borderRadius:
              "8px",

            fontWeight:
              "600",
          }}
        >
          {message}
        </div>
      )}

      {requests.length ===
      0 ? (
        <div
          style={{
            padding:
              "30px",

            textAlign:
              "center",

            background:
              "#f8fafc",

            borderRadius:
              "12px",
          }}
        >
          <div
            style={{
              fontSize:
                "40px",
            }}
          >
            📭
          </div>

          <h3>
            अभी कोई Password Reset Request नहीं है
          </h3>

          <p>
            User Forgot Password से request
            भेजेगा तो यहाँ दिखाई देगी।
          </p>
        </div>
      ) : (
        <div
          style={{
            display:
              "grid",

            gap:
              "15px",
          }}
        >
          {requests.map(
            (
              request,
              index
            ) => {
              const key =
                request.requestId ||
                request.id ||
                request.mobile ||
                index;

              const mobile =
                request.mobile ||
                request.identifier ||
                "—";

              const status =
                request.status ||
                "Pending";

              const isGenerating =
                generating ===
                key;

              return (
                <div
                  key={key}
                  style={{
                    background:
                      "#fff",

                    border:
                      "1px solid #e5e7eb",

                    borderRadius:
                      "12px",

                    padding:
                      "18px",

                    boxShadow:
                      "0 3px 12px rgba(0,0,0,.06)",
                  }}
                >
                  <div
                    style={{
                      display:
                        "flex",

                      justifyContent:
                        "space-between",

                      gap:
                        "15px",

                      flexWrap:
                        "wrap",
                    }}
                  >
                    <div>
                      <h3>
                        📱 {mobile}
                      </h3>

                      <p>
                        <strong>
                          Status:
                        </strong>{" "}
                        {status}
                      </p>

                      {request.name && (
                        <p>
                          <strong>
                            Name:
                          </strong>{" "}
                          {request.name}
                        </p>
                      )}

                      {request.createdAt && (
                        <p>
                          <strong>
                            Request:
                          </strong>{" "}
                          {String(
                            request.createdAt
                          )}
                        </p>
                      )}

                      {request.otpCreatedAt && (
                        <p>
                          <strong>
                            OTP:
                          </strong>{" "}
                          {String(
                            request.otpCreatedAt
                          )}
                        </p>
                      )}
                    </div>

                    <div>
                      <button
                        type="button"
                        onClick={() =>
                          generateOtp(
                            request
                          )
                        }
                        disabled={
                          isGenerating
                        }
                        style={{
                          padding:
                            "12px 18px",

                          border:
                            "none",

                          borderRadius:
                            "8px",

                          cursor:
                            isGenerating
                              ? "wait"
                              : "pointer",

                          fontWeight:
                            "800",
                        }}
                      >
                        {isGenerating
                          ? "⏳ Generating..."
                          : "📲 Generate OTP + WhatsApp"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            }
          )}
        </div>
      )}
    </div>
  );
}

/* ======================================================
   HOME PAGE
====================================================== */

function HomePage({
  user,
  userData,
  onLogout,
  onNavigate,
}) {
  return (
    <div className="app-container">

      {/* =================================================
          HEADER
      ================================================= */}

      <header className="top-header">

        <div className="brand">

          <div className="brand-logo">
            📚
          </div>

          <div>
            <h1>
              {APP_NAME}
            </h1>

            <small>
              Competitive Exam Preparation
            </small>
          </div>

        </div>

        <div className="header-actions">

          {user && (
            <>
              {/* USER NAME */}
              <span
                className="welcome-user"
              >
                👤{" "}
                {userData?.name ||
                  user.displayName ||
                  "User"}
              </span>

              <button
                type="button"
                onClick={
                  onLogout
                }
              >
                Logout
              </button>
            </>
          )}

        </div>

      </header>

      {/* =================================================
          HOME CONTENT
      ================================================= */}

      <main className="home-content">

        <section className="hero-section">

          <div>

            <span className="hero-badge">
              🎯 EXAM PREPARATION
            </span>

            <h2>
              Welcome to{" "}
              <strong>
                {APP_NAME}
              </strong>
            </h2>

            <p>
              UPSC, UPPCS, UP PET,
              SSC, Railway, Banking,
              Police और अन्य
              प्रतियोगी परीक्षाओं की
              तैयारी एक ही जगह करें।
            </p>

            {/* =================================================
                USER NAME MESSAGE
            ================================================= */}

            <p className="logged-message">
              ✅ Welcome{" "}
              <strong>
                {userData?.name ||
                  user?.displayName ||
                  "User"}
              </strong>

              {userData?.preparation
                ? ` • तैयारी: ${userData.preparation}`
                : ""}
            </p>

          </div>

        </section>

        {/* =================================================
            EXAMS
        ================================================= */}

        <section className="section-block">

          <h2>
            📚 Exam Preparation
          </h2>

          <div className="exam-grid">

            {exams.map(
              (exam) => (
                <button
                  key={exam.id}
                  type="button"
                  className="exam-card"
                  onClick={() =>
                    onNavigate(
                      "tests"
                    )
                  }
                  style={{
                    background:
                      exam.color,
                  }}
                >
                  <span>
                    {exam.icon}
                  </span>

                  <strong>
                    {exam.name}
                  </strong>

                  <small>
                    Practice & Test
                  </small>
                </button>
              )
            )}

          </div>

        </section>

        {/* =================================================
            FEATURES
        ================================================= */}

        <section className="feature-grid">

          <button
            type="button"
            onClick={() =>
              onNavigate(
                "mcq"
              )
            }
          >
            <span>
              📝
            </span>

            <strong>
              MCQ Practice
            </strong>

            <small>
              Important Questions
            </small>
          </button>

          <button
            type="button"
            onClick={() =>
              onNavigate(
                "tests"
              )
            }
          >
            <span>
              🎯
            </span>

            <strong>
              Test Series
            </strong>

            <small>
              Mock Tests
            </small>
          </button>

          <button
            type="button"
            onClick={() =>
              onNavigate(
                "current"
              )
            }
          >
            <span>
              📰
            </span>

            <strong>
              Current Affairs
            </strong>

            <small>
              Daily Updates
            </small>
          </button>

          <button
            type="button"
            onClick={() =>
              onNavigate(
                "ai"
              )
            }
          >
            <span>
              🤖
            </span>

            <strong>
              AI MCQ Generator
            </strong>

            <small>
              Generate Questions
            </small>
          </button>

        </section>

      </main>
    </div>
  );
}

/* ======================================================
   MCQ PAGE
====================================================== */

function MCQPage({
  onBack,
}) {
  return (
    <div className="page-container">

      <button
        type="button"
        onClick={onBack}
        className="back-btn"
      >
        ← Home
      </button>

      <h1>
        📝 MCQ Practice
      </h1>

      <p>
        आपके MCQ / Test modules
        यहाँ उपलब्ध होंगे।
      </p>

    </div>
  );
}

/* ======================================================
   TESTS PAGE
====================================================== */

function TestsPage({
  onBack,
}) {
  return (
    <div className="page-container">

      <button
        type="button"
        onClick={onBack}
        className="back-btn"
      >
        ← Home
      </button>

      <h1>
        🎯 Test Series
      </h1>

      <p>
        आपकी Test Series यहाँ
        दिखाई जाएगी।
      </p>

    </div>
  );
}

/* ======================================================
   RESOURCES PAGE
====================================================== */

function ResourcesPage({
  onBack,
}) {
  return (
    <div className="page-container">

      <button
        type="button"
        onClick={onBack}
        className="back-btn"
      >
        ← Home
      </button>

      <h1>
        📚 Study Resources
      </h1>

      <div className="resource-list">

        <div>
          📖 NCERT Books
        </div>

        <div>
          📝 Previous Year Questions
        </div>

        <div>
          🎯 Practice Tests
        </div>

        <div>
          📰 Current Affairs
        </div>

      </div>

    </div>
  );
}

/* ======================================================
   LOGIN REQUIRED SCREEN
====================================================== */

function LoginRequiredPage({
  onLogin,
  onRegister,
  onAdmin,
}) {
  return (
    <AuthShell>

      <div className="auth-icon">
        🔐
      </div>

      <h1>
        {APP_NAME}
      </h1>

      <p>
        इस Website का उपयोग करने के लिए
        पहले Login करें।
      </p>

      <button
        type="button"
        className="auth-primary-btn"
        onClick={onLogin}
      >
        🔐 Login करें
      </button>

      <button
        type="button"
        className="create-account-btn"
        onClick={onRegister}
      >
        📝 Create Account
      </button>

      <button
        type="button"
        className="admin-login-link"
        onClick={onAdmin}
      >
        👨‍💼 Admin Login
      </button>

    </AuthShell>
  );
}

/* ======================================================
   MAIN APP
====================================================== */

export default function App() {

  const [
    firebaseUser,
    setFirebaseUser,
  ] = useState(null);

  const [
    userData,
    setUserData,
  ] = useState(null);

  const [
    screen,
    setScreen,
  ] = useState("home");

  const [
    selectedTest,
    setSelectedTest,
  ] = useState(null);

  const [
    authPage,
    setAuthPage,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  /* ====================================================
     AUTH STATE
  ==================================================== */

  useEffect(() => {

    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (user) => {

          setFirebaseUser(
            user
          );

          if (user) {

            const data =
              await getUserData(
                user.uid
              );

            setUserData(
              data
            );

            /*
              ADMIN
            */

            if (
              user.email?.toLowerCase() ===
              ADMIN_EMAIL.toLowerCase()
            ) {

              setScreen(
                "admin"
              );

              setAuthPage(
                null
              );

            } else {

              /*
                USER LOGIN
              */

              setScreen(
                "home"
              );

              setAuthPage(
                null
              );
            }

          } else {

            /*
              NO USER
            */

            setUserData(
              null
            );

            /*
              बिना Login कोई protected
              page नहीं खुलेगा।
            */

            setScreen(
              "home"
            );

            /*
              Login automatically open
            */

            setAuthPage(
              "login"
            );
          }

          setLoading(
            false
          );
        }
      );

    return () =>
      unsubscribe();

  }, []);

  /* ====================================================
     REFRESH USER DATA
  ==================================================== */

  const refreshUserData =
    async (user) => {

      if (!user?.uid) {
        return;
      }

      const data =
        await getUserData(
          user.uid
        );

      setUserData(
        data
      );
    };

  /* ====================================================
     USER LOGIN SUCCESS
  ==================================================== */

  const handleUserLogin =
    async (user) => {

      /*
        Admin को User Login से
        enter नहीं करने देना
      */

      if (
        user.email?.toLowerCase() ===
        ADMIN_EMAIL.toLowerCase()
      ) {

        await signOut(
          auth
        );

        alert(
          "Admin के लिए Admin Login इस्तेमाल करें।"
        );

        return;
      }

      await refreshUserData(
        user
      );

      setFirebaseUser(
        user
      );

      setAuthPage(
        null
      );

      setScreen(
        "home"
      );
    };

  /* ====================================================
     REGISTER SUCCESS
  ==================================================== */

  const handleRegisterSuccess =
    (user) => {

      setFirebaseUser(
        user
      );

      /*
        Registration के बाद
        Exam Selection खुलेगा।
      */

      setAuthPage(
        "exam-selection"
      );
    };

  /* ====================================================
     EXAM COMPLETE
  ==================================================== */

  const handleExamComplete =
    async () => {

      if (firebaseUser) {

        await refreshUserData(
          firebaseUser
        );
      }

      setAuthPage(
        null
      );

      setScreen(
        "home"
      );
    };

  /* ====================================================
     LOGOUT
  ==================================================== */

  const logout =
    async () => {

      try {

        await signOut(
          auth
        );

        setFirebaseUser(
          null
        );

        setUserData(
          null
        );

        setScreen(
          "home"
        );

        /*
          Logout के बाद Login
          फिर से खुलेगा।
        */

        setAuthPage(
          "login"
        );

      } catch (error) {

        alert(
          "Logout Error: " +
            error.message
        );
      }
    };

  /* ====================================================
     TEST SERIES -> TEST RUNNER
  ==================================================== */

  const handleStartTest = (test) => {
    const raw = test?.raw || {};

    const normalizedTest = {
      ...raw,
      id: test?.id || raw?.id,
      title: test?.title || raw?.title || "Test",
      exam: test?.exam || raw?.exam || raw?.examName || "",
      examId:
        raw?.examId ||
        raw?.exam ||
        test?.exam ||
        "",
      testNumber:
        raw?.testNumber ??
        test?.testNo ??
        1,
      durationMinutes:
        raw?.durationMinutes ??
        raw?.duration ??
        test?.duration ??
        30,
      questions:
        raw?.questions ??
        [],
    };

    console.log("OPENING TEST RUNNER:", normalizedTest);

    setSelectedTest(normalizedTest);
    setScreen("test-runner");
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleBackFromTest = () => {
    setSelectedTest(null);
    setScreen("tests");
  };

  /* ====================================================
     NAVIGATION PROTECTION
  ==================================================== */

  const protectedNavigate =
    (targetScreen) => {

      /*
        User Login नहीं है
      */

      if (!firebaseUser) {

        setAuthPage(
          "login"
        );

        return;
      }

      /*
        Admin को user pages से अलग
        रखा जा सकता है।
      */

      if (
        firebaseUser.email?.toLowerCase() ===
        ADMIN_EMAIL.toLowerCase()
      ) {

        /*
          Admin के लिए normal
          website भी खुल सकती है।
        */

        setScreen(
          targetScreen
        );

        return;
      }

      setScreen(
        targetScreen
      );
    };

  /* ====================================================
     ADMIN CHECK
  ==================================================== */

  const isAdmin =
    firebaseUser?.email
      ?.toLowerCase() ===
    ADMIN_EMAIL.toLowerCase();

  /* ====================================================
     APP PAGE
  ==================================================== */

  const appPage =
    useMemo(() => {

      /* ================================================
         ADMIN PANEL
      ================================================ */

      if (
        screen === "admin"
      ) {

        if (!isAdmin) {

          return (
            <AdminLogin
              onSuccess={(
                user
              ) => {

                setFirebaseUser(
                  user
                );

                setScreen(
                  "admin"
                );

                setAuthPage(
                  null
                );
              }}

              onBack={() =>
                setScreen(
                  "home"
                )
              }
            />
          );
        }

        return (
          <div>

            <div className="admin-topbar">

              <strong>
                👨‍💼 {APP_NAME} Admin Panel
              </strong>

              <div>

                <button
                  type="button"
                  onClick={() =>
                    setScreen(
                      "password-reset-admin"
                    )
                  }
                >
                  🔑 Password Reset
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setScreen(
                      "home"
                    )
                  }
                >
                  🏠 Website
                </button>

                <button
                  type="button"
                  onClick={
                    logout
                  }
                >
                  Logout
                </button>

              </div>

            </div>

            <AdminPanel />

          </div>
        );
      }

      /* ================================================
         PASSWORD RESET ADMIN
      ================================================ */

      if (
        screen ===
        "password-reset-admin"
      ) {

        if (!isAdmin) {

          return (
            <AdminLogin
              onSuccess={(
                user
              ) => {

                setFirebaseUser(
                  user
                );

                setScreen(
                  "password-reset-admin"
                );

                setAuthPage(
                  null
                );
              }}

              onBack={() =>
                setScreen(
                  "home"
                )
              }
            />
          );
        }

        return (
          <div>

            <div className="admin-topbar">

              <strong>
                🔑 {APP_NAME} Password Reset
              </strong>

              <div>

                <button
                  type="button"
                  onClick={() =>
                    setScreen(
                      "admin"
                    )
                  }
                >
                  ← Admin Panel
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setScreen(
                      "home"
                    )
                  }
                >
                  🏠 Website
                </button>

                <button
                  type="button"
                  onClick={
                    logout
                  }
                >
                  Logout
                </button>

              </div>

            </div>

            <PasswordResetAdmin />

          </div>
        );
      }

      /* ================================================
         PROTECTED PAGES
      ================================================ */

      if (
        !firebaseUser &&
        screen !== "home"
      ) {

        return null;
      }

      /* ================================================
         CURRENT AFFAIRS
      ================================================ */

      if (
        screen === "current"
      ) {

        return (
          <div className="page-container">

            <button
              type="button"
              className="back-btn"
              onClick={() =>
                setScreen(
                  "home"
                )
              }
            >
              ← Home
            </button>

            <CurrentAffairs />

          </div>
        );
      }

      /* ================================================
         AI MCQ
      ================================================ */

      if (
        screen === "ai"
      ) {

        return (
          <div className="page-container">

            <button
              type="button"
              className="back-btn"
              onClick={() =>
                setScreen(
                  "home"
                )
              }
            >
              ← Home
            </button>

            <AIMCQGenerator />

          </div>
        );
      }

      /* ================================================
         MCQ
      ================================================ */

      if (
        screen === "mcq"
      ) {

        return (
          <MCQPage
            onBack={() =>
              setScreen(
                "home"
              )
            }
          />
        );
      }

      /* ================================================
         TESTS
      ================================================ */

      if (
        screen === "tests"
      ) {

        return (
          <TestSeries
            onBack={() =>
              setScreen(
                "home"
              )
            }
            onStartTest={
              handleStartTest
            }
          />
        );
      }

      /* ================================================
         TEST RUNNER
      ================================================ */

      if (
        screen === "test-runner"
      ) {

        if (!selectedTest) {
          return (
            <TestSeries
              onBack={() =>
                setScreen(
                  "home"
                )
              }
              onStartTest={
                handleStartTest
              }
            />
          );
        }

        return (
          <TestRunner
            test={selectedTest}
            onBack={
              handleBackFromTest
            }
          />
        );
      }

      /* ================================================
         RESOURCES
      ================================================ */

      if (
        screen === "resources"
      ) {

        return (
          <ResourcesPage
            onBack={() =>
              setScreen(
                "home"
              )
            }
          />
        );
      }

      /* ================================================
         HOME
      ================================================ */

      return (
        <HomePage
          user={
            firebaseUser
          }

          userData={
            userData
          }

          onLogout={
            logout
          }

          onNavigate={
            protectedNavigate
          }
        />
      );

    }, [
      screen,
      firebaseUser,
      userData,
      isAdmin,
      selectedTest,
    ]);

  /* ====================================================
     LOADING
  ==================================================== */

  if (loading) {

    return (
      <div className="app-loading">

        <div className="loading-logo">
          📚
        </div>

        <h2>
          {APP_NAME}
        </h2>

        <p>
          Loading...
        </p>

      </div>
    );
  }

  /* ====================================================
     RETURN
  ==================================================== */

  return (
    <>

      {appPage}

      {/* =================================================
          NO LOGIN = LOGIN REQUIRED
      ================================================= */}

      {!firebaseUser &&
        !authPage && (
          <LoginRequiredPage
            onLogin={() =>
              setAuthPage(
                "login"
              )
            }

            onRegister={() =>
              setAuthPage(
                "register"
              )
            }

            onAdmin={() =>
              setAuthPage(
                "admin"
              )
            }
          />
        )}

      {/* =================================================
          USER LOGIN
      ================================================= */}

      {authPage ===
        "login" && (
        <LoginPage

          onSuccess={
            handleUserLogin
          }

          onRegister={() =>
            setAuthPage(
              "register"
            )
          }

          onForgot={() =>
            setAuthPage(
              "forgot"
            )
          }

          onAdmin={() =>
            setAuthPage(
              "admin"
            )
          }
        />
      )}

      {/* =================================================
          REGISTER
      ================================================= */}

      {authPage ===
        "register" && (
        <RegisterPage

          onSuccess={
            handleRegisterSuccess
          }

          onLogin={() =>
            setAuthPage(
              "login"
            )
          }
        />
      )}

      {/* =================================================
          EXAM SELECTION
      ================================================= */}

      {authPage ===
        "exam-selection" && (
        <ExamSelectionPage

          user={
            firebaseUser
          }

          onComplete={
            handleExamComplete
          }
        />
      )}

      {/* =================================================
          FORGOT PASSWORD
      ================================================= */}

      {authPage ===
        "forgot" && (
        <ForgotPassword

          onBack={() =>
            setAuthPage(
              "login"
            )
          }
        />
      )}

      {/* =================================================
          ADMIN LOGIN
      ================================================= */}

      {authPage ===
        "admin" && (
        <AdminLogin

          onSuccess={(
            user
          ) => {

            setFirebaseUser(
              user
            );

            setAuthPage(
              null
            );

            setScreen(
              "admin"
            );
          }}

          onBack={() =>
            setAuthPage(
              "login"
            )
          }
        />
      )}

    </>
  );
}
