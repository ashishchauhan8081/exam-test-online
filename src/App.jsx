import React, { useEffect, useMemo, useState } from "react";
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
import PasswordResetAdmin from "./components/PasswordResetAdmin";

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
  { id: "upsc", name: "UPSC", icon: "🇮🇳", color: "#fee2e2" },
  { id: "uppcs", name: "UPPCS", icon: "🏛️", color: "#fef3c7" },
  { id: "uppet", name: "UP PET", icon: "🎯", color: "#dcfce7" },
  { id: "bpsc", name: "BPSC", icon: "🏛️", color: "#ede9fe" },
  { id: "mppsc", name: "MPPSC", icon: "📚", color: "#dbeafe" },
  { id: "ssc", name: "SSC", icon: "📝", color: "#fce7f3" },
  { id: "railway", name: "Railway", icon: "🚆", color: "#e0f2fe" },
  { id: "banking", name: "Banking", icon: "🏦", color: "#dcfce7" },
  { id: "upsssc", name: "UPSSSC", icon: "📖", color: "#f3e8ff" },
  { id: "roaro", name: "RO/ARO", icon: "📜", color: "#fef3c7" },
  { id: "police", name: "Police", icon: "👮", color: "#fee2e2" },
  { id: "teaching", name: "Teaching", icon: "👨‍🏫", color: "#dbeafe" },
];

/* ======================================================
   HELPERS
====================================================== */

function normalizeMobile(value) {
  return String(value || "")
    .replace(/\D/g, "")
    .slice(-10);
}

/*
  Firebase Email/Password authentication is used internally.
  The user sees only Mobile Number + Password.
*/
function mobileToAuthEmail(mobile) {
  return `${normalizeMobile(mobile)}@studywithpower.app`;
}

async function getUserData(uid) {
  if (!uid) return null;

  try {
    const snap = await get(ref(db, `users/${uid}`));
    return snap.exists() ? snap.val() : null;
  } catch (error) {
    console.error("getUserData:", error);
    return null;
  }
}

/* ======================================================
   AUTH CARD STYLE
====================================================== */

function AuthShell({ children }) {
  return (
    <div className="auth-overlay">
      <div className="auth-card">{children}</div>
    </div>
  );
}

/* ======================================================
   LOGIN PAGE
====================================================== */

function LoginPage({
  onSuccess,
  onRegister,
  onForgot,
  onAdmin,
  onClose,
}) {
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async (e) => {
    e.preventDefault();

    const cleanMobile = normalizeMobile(mobile);

    if (!/^\d{10}$/.test(cleanMobile)) {
      alert("कृपया 10 अंकों का Mobile Number डालें।");
      return;
    }

    if (!password) {
      alert("Password डालें।");
      return;
    }

    try {
      setLoading(true);

      const result = await signInWithEmailAndPassword(
        auth,
        mobileToAuthEmail(cleanMobile),
        password
      );

      if (
        result.user.email &&
        result.user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()
      ) {
        await signOut(auth);
        alert("Admin के लिए Admin Login इस्तेमाल करें।");
        return;
      }

      onSuccess?.(result.user);
    } catch (error) {
      console.error(error);

      if (
        error.code === "auth/invalid-credential" ||
        error.code === "auth/user-not-found" ||
        error.code === "auth/wrong-password"
      ) {
        alert("❌ Mobile Number या Password गलत है।");
      } else {
        alert("❌ Login Error:\n" + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <div className="auth-icon">📱</div>
      <h1>User Login</h1>
      <p>{APP_NAME} में Mobile Number और Password से Login करें</p>

      <form onSubmit={login}>
        <label>📱 Mobile Number</label>
        <input
          type="tel"
          inputMode="numeric"
          maxLength={10}
          placeholder="10 digit mobile number"
          value={mobile}
          onChange={(e) =>
            setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))
          }
        />

        <label>🔐 Password</label>
        <input
          type="password"
          placeholder="Account बनाते समय बनाया गया Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          type="submit"
          disabled={loading}
          className="auth-primary-btn"
        >
          {loading ? "⏳ Login हो रहा है..." : "🔐 Login"}
        </button>
      </form>

      <button className="forgot-btn" onClick={onForgot}>
        🔑 Forgot Password?
      </button>

      <div className="auth-switch">
        नया account बनाना है?
        <button onClick={onRegister}>Create Account</button>
      </div>

      <button className="admin-login-link" onClick={onAdmin}>
        👨‍💼 Admin Login
      </button>

      <button className="auth-close-btn" onClick={onClose}>
        ← Website पर वापस जाएँ
      </button>
    </AuthShell>
  );
}

/* ======================================================
   REGISTER PAGE
====================================================== */

function RegisterPage({ onSuccess, onLogin, onClose }) {
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const register = async (e) => {
    e.preventDefault();

    const cleanMobile = normalizeMobile(mobile);

    if (!name.trim()) {
      alert("कृपया अपना नाम डालें।");
      return;
    }

    if (!/^\d{10}$/.test(cleanMobile)) {
      alert("कृपया 10 अंकों का Mobile Number डालें।");
      return;
    }

    if (password.length < 6) {
      alert("Password कम से कम 6 characters का होना चाहिए।");
      return;
    }

    if (password !== confirm) {
      alert("Password और Confirm Password समान नहीं हैं।");
      return;
    }

    try {
      setLoading(true);

      const authEmail = mobileToAuthEmail(cleanMobile);

      const result = await createUserWithEmailAndPassword(
        auth,
        authEmail,
        password
      );

      await updateProfile(result.user, {
        displayName: name.trim(),
      });

      const userData = {
        uid: result.user.uid,
        name: name.trim(),
        mobile: cleanMobile,
        authEmail,
        preparation: "",
        createdAt: new Date().toISOString(),
      };

      await set(ref(db, `users/${result.user.uid}`), userData);

      await set(ref(db, `mobileUsers/${cleanMobile}`), {
        uid: result.user.uid,
        name: name.trim(),
        mobile: cleanMobile,
        authEmail,
        createdAt: userData.createdAt,
      });

      alert("✅ Account सफलतापूर्वक बन गया।");

      onSuccess?.(result.user);
    } catch (error) {
      console.error("Registration:", error);

      if (error.code === "auth/email-already-in-use") {
        alert("❌ यह Mobile Number पहले से registered है।");
      } else if (error.code === "auth/weak-password") {
        alert("❌ Password बहुत कमजोर है।");
      } else {
        alert("❌ Registration Error:\n" + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <div className="auth-icon">📝</div>
      <h1>Create Account</h1>
      <p>{APP_NAME} पर अपना account बनाएं</p>

      <form onSubmit={register}>
        <label>👤 पूरा नाम</label>
        <input
          type="text"
          placeholder="अपना नाम दर्ज करें"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <label>📱 Mobile Number</label>
        <input
          type="tel"
          inputMode="numeric"
          maxLength={10}
          placeholder="10 digit mobile number"
          value={mobile}
          onChange={(e) =>
            setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))
          }
        />

        <label>🔐 Password बनाएं</label>
        <input
          type="password"
          placeholder="कम से कम 6 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <label>🔐 Confirm Password</label>
        <input
          type="password"
          placeholder="Password दोबारा डालें"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />

        <button
          type="submit"
          disabled={loading}
          className="auth-primary-btn"
        >
          {loading ? "⏳ Account बन रहा है..." : "✅ Create Account"}
        </button>
      </form>

      <div className="auth-switch">
        Account पहले से है?
        <button onClick={onLogin}>Login करें</button>
      </div>

      <button className="auth-close-btn" onClick={onClose}>
        ← Website पर वापस जाएँ
      </button>
    </AuthShell>
  );
}

/* ======================================================
   EXAM SELECTION
====================================================== */

function ExamSelectionPage({ user, onComplete, onClose }) {
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);

  const saveExam = async () => {
    if (!selected) {
      alert("कृपया परीक्षा चुनें।");
      return;
    }

    if (!user?.uid) {
      alert("User session नहीं मिला।");
      return;
    }

    try {
      setLoading(true);

      await set(
        ref(db, `users/${user.uid}/preparation`),
        selected
      );

      onComplete?.(selected);
    } catch (error) {
      console.error(error);
      alert("❌ परीक्षा save नहीं हुई:\n" + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <div className="auth-icon">🎯</div>

      <h1>आप किस परीक्षा की तैयारी कर रहे हैं?</h1>
      <p>अपनी परीक्षा चुनें</p>

      <div className="exam-selection-grid">
        {exams.map((exam) => {
          const active = selected === exam.name;

          return (
            <button
              key={exam.id}
              type="button"
              className={`exam-select-card ${
                active ? "active" : ""
              }`}
              onClick={() => setSelected(exam.name)}
              style={{
                background: active ? "#eff6ff" : exam.color,
              }}
            >
              <span>{exam.icon}</span>
              <strong>{exam.name}</strong>
            </button>
          );
        })}
      </div>

      <button
        className="auth-primary-btn"
        disabled={loading || !selected}
        onClick={saveExam}
      >
        {loading ? "⏳ Save हो रहा है..." : "Continue →"}
      </button>

      <button className="auth-close-btn" onClick={onClose}>
        ← Website पर वापस जाएँ
      </button>
    </AuthShell>
  );
}

/* ======================================================
   FORGOT PASSWORD
====================================================== */

function ForgotPassword({ onBack }) {
  const [step, setStep] = useState(1);
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const requestOtp = async (e) => {
    e.preventDefault();

    const cleanMobile = normalizeMobile(mobile);

    if (!/^\d{10}$/.test(cleanMobile)) {
      alert("कृपया 10 अंकों का Mobile Number डालें।");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/password-reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "request",
          mobile: cleanMobile,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Request failed");
      }

      setMobile(cleanMobile);
      setStep(2);

      alert(
        "✅ Password reset request भेज दी गई है। Admin OTP Generate करके WhatsApp पर भेजेगा।"
      );
    } catch (error) {
      console.error(error);
      alert("❌ " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyReset = async (e) => {
    e.preventDefault();

    if (!/^\d{6}$/.test(otp)) {
      alert("6 अंकों का OTP डालें।");
      return;
    }

    if (newPassword.length < 6) {
      alert("नया Password कम से कम 6 characters का होना चाहिए।");
      return;
    }

    if (newPassword !== confirmPassword) {
      alert("New Password और Confirm Password समान नहीं हैं।");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/password-reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "verify",
          mobile,
          otp,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "OTP verification failed");
      }

      alert(
        "✅ Password सफलतापूर्वक बदल गया। अब Mobile Number + नया Password से Login करें।"
      );

      onBack?.();
    } catch (error) {
      console.error(error);
      alert("❌ " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <div className="auth-icon">🔑</div>
      <h1>Forgot Password</h1>

      {step === 1 ? (
        <>
          <p>Registered Mobile Number डालें</p>

          <form onSubmit={requestOtp}>
            <label>📱 Mobile Number</label>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              placeholder="10 digit mobile number"
              value={mobile}
              onChange={(e) =>
                setMobile(
                  e.target.value.replace(/\D/g, "").slice(0, 10)
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
          <p>Admin द्वारा भेजा गया OTP और नया Password डालें</p>

          <form onSubmit={verifyReset}>
            <label>🔢 OTP</label>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={6}
              placeholder="6 digit OTP"
              value={otp}
              onChange={(e) =>
                setOtp(
                  e.target.value.replace(/\D/g, "").slice(0, 6)
                )
              }
            />

            <label>🔐 New Password</label>
            <input
              type="password"
              placeholder="नया Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />

            <label>🔐 Confirm New Password</label>
            <input
              type="password"
              placeholder="Password दोबारा डालें"
              value={confirmPassword}
              onChange={(e) =>
                setConfirmPassword(e.target.value)
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
            className="auth-close-btn"
            onClick={() => setStep(1)}
          >
            ← Mobile Number बदलें
          </button>
        </>
      )}

      <button className="auth-close-btn" onClick={onBack}>
        ← Login पर वापस जाएँ
      </button>
    </AuthShell>
  );
}

/* ======================================================
   ADMIN LOGIN
====================================================== */

function AdminLogin({ onSuccess, onBack }) {
  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async (e) => {
    e.preventDefault();

    if (!email.trim() || !password) {
      alert("Email और Password दोनों डालें।");
      return;
    }

    try {
      setLoading(true);

      const result = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      if (
        result.user.email?.toLowerCase() !==
        ADMIN_EMAIL.toLowerCase()
      ) {
        await signOut(auth);
        alert("❌ यह Admin account नहीं है।");
        return;
      }

      onSuccess?.(result.user);
    } catch (error) {
      console.error(error);
      alert("❌ Admin Login failed:\n" + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <div className="auth-icon">👨‍💼</div>
      <h1>Admin Login</h1>
      <p>Admin के लिए Email + Password इस्तेमाल करें</p>

      <form onSubmit={login}>
        <label>📧 Admin Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label>🔐 Password</label>
        <input
          type="password"
          placeholder="Admin Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          className="auth-primary-btn"
          disabled={loading}
          type="submit"
        >
          {loading ? "⏳ Login..." : "👨‍💼 Admin Login"}
        </button>
      </form>

      <button className="auth-close-btn" onClick={onBack}>
        ← User Login
      </button>
    </AuthShell>
  );
}

/* ======================================================
   HOME PAGE
====================================================== */

function HomePage({
  user,
  userData,
  onLogin,
  onRegister,
  onLogout,
  onNavigate,
}) {
  return (
    <div className="app-container">
      <header className="top-header">
        <div className="brand">
          <div className="brand-logo">📚</div>
          <div>
            <h1>{APP_NAME}</h1>
            <small>Competitive Exam Preparation</small>
          </div>
        </div>

        <div className="header-actions">
          {user ? (
            <>
              <span className="welcome-user">
                👤 {userData?.name || user.displayName || "User"}
              </span>
              <button onClick={onLogout}>Logout</button>
            </>
          ) : (
            <>
              <button onClick={onLogin}>Login</button>
              <button onClick={onRegister}>Create Account</button>
            </>
          )}
        </div>
      </header>

      <main className="home-content">
        <section className="hero-section">
          <div>
            <span className="hero-badge">🎯 EXAM PREPARATION</span>

            <h2>
              Welcome to <strong>{APP_NAME}</strong>
            </h2>

            <p>
              UPSC, UPPCS, UP PET, SSC, Railway, Banking,
              Police और अन्य प्रतियोगी परीक्षाओं की तैयारी
              एक ही जगह करें।
            </p>

            {!user && (
              <div className="hero-buttons">
                <button onClick={onRegister}>
                  🚀 Create Account
                </button>
                <button onClick={onLogin}>
                  🔐 Login
                </button>
              </div>
            )}

            {user && (
              <p className="logged-message">
                ✅ आप Login हैं
                {userData?.preparation
                  ? ` • तैयारी: ${userData.preparation}`
                  : ""}
              </p>
            )}
          </div>
        </section>

        <section className="section-block">
          <h2>📚 Exam Preparation</h2>

          <div className="exam-grid">
            {exams.map((exam) => (
              <button
                key={exam.id}
                className="exam-card"
                onClick={() => onNavigate("tests")}
                style={{ background: exam.color }}
              >
                <span>{exam.icon}</span>
                <strong>{exam.name}</strong>
                <small>Practice & Test</small>
              </button>
            ))}
          </div>
        </section>

        <section className="feature-grid">
          <button onClick={() => onNavigate("mcq")}>
            <span>📝</span>
            <strong>MCQ Practice</strong>
            <small>Important Questions</small>
          </button>

          <button onClick={() => onNavigate("tests")}>
            <span>🎯</span>
            <strong>Test Series</strong>
            <small>Mock Tests</small>
          </button>

          <button onClick={() => onNavigate("current")}>
            <span>📰</span>
            <strong>Current Affairs</strong>
            <small>Daily Updates</small>
          </button>

          <button onClick={() => onNavigate("ai")}>
            <span>🤖</span>
            <strong>AI MCQ Generator</strong>
            <small>Generate Questions</small>
          </button>
        </section>
      </main>
    </div>
  );
}

/* ======================================================
   SIMPLE CONTENT PAGES
====================================================== */

function MCQPage({ onBack }) {
  return (
    <div className="page-container">
      <button onClick={onBack} className="back-btn">← Home</button>
      <h1>📝 MCQ Practice</h1>
      <p>यहाँ आपके MCQ / Test modules जोड़े जा सकते हैं।</p>
    </div>
  );
}

function TestsPage({ onBack }) {
  return (
    <div className="page-container">
      <button onClick={onBack} className="back-btn">← Home</button>
      <h1>🎯 Test Series</h1>
      <p>आपकी Test Series यहाँ दिखाई जाएगी।</p>
    </div>
  );
}

function ResourcesPage({ onBack }) {
  return (
    <div className="page-container">
      <button onClick={onBack} className="back-btn">← Home</button>
      <h1>📚 Study Resources</h1>

      <div className="resource-list">
        <div>📖 NCERT Books</div>
        <div>📝 Previous Year Questions</div>
        <div>🎯 Practice Tests</div>
        <div>📰 Current Affairs</div>
      </div>
    </div>
  );
}

/* ======================================================
   MAIN APP
====================================================== */

export default function App() {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [userData, setUserData] = useState(null);

  const [screen, setScreen] = useState("home");

  const [authPage, setAuthPage] = useState(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);

      if (user) {
        const data = await getUserData(user.uid);
        setUserData(data);

        if (
          user.email?.toLowerCase() ===
          ADMIN_EMAIL.toLowerCase()
        ) {
          setScreen("admin");
          setAuthPage(null);
        }
      } else {
        setUserData(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const refreshUserData = async (user) => {
    if (!user?.uid) return;

    const data = await getUserData(user.uid);
    setUserData(data);
  };

  const handleUserLogin = async (user) => {
    await refreshUserData(user);
    setAuthPage(null);
    setScreen("home");
  };

  const handleRegisterSuccess = (user) => {
    setFirebaseUser(user);
    setAuthPage("exam-selection");
  };

  const handleExamComplete = async (exam) => {
    if (firebaseUser) {
      await refreshUserData(firebaseUser);
    }

    setAuthPage(null);
    setScreen("home");
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setFirebaseUser(null);
      setUserData(null);
      setScreen("home");
      setAuthPage(null);
    } catch (error) {
      alert("Logout Error: " + error.message);
    }
  };

  const isAdmin =
    firebaseUser?.email?.toLowerCase() ===
    ADMIN_EMAIL.toLowerCase();

  const appPage = useMemo(() => {
    if (screen === "current") {
      return (
        <div className="page-container">
          <CurrentAffairs />
        </div>
      );
    }

    if (screen === "ai") {
      return (
        <div className="page-container">
          <AIMCQGenerator />
        </div>
      );
    }

    if (screen === "admin") {
      if (!isAdmin) {
        return (
          <AdminLogin
            onSuccess={(user) => {
              setFirebaseUser(user);
              setScreen("admin");
              setAuthPage(null);
            }}
            onBack={() => setScreen("home")}
          />
        );
      }

      return (
        <div>
          <div className="admin-topbar">
            <strong>👨‍💼 {APP_NAME} Admin Panel</strong>

            <div>
              <button onClick={() => setScreen("password-reset-admin")}>
                🔑 Password Reset
              </button>

              <button onClick={() => setScreen("home")}>
                🏠 Website
              </button>

              <button onClick={logout}>Logout</button>
            </div>
          </div>

          <AdminPanel />
        </div>
      );
    }

    if (screen === "password-reset-admin") {
      if (!isAdmin) {
        return (
          <AdminLogin
            onSuccess={(user) => {
              setFirebaseUser(user);
              setScreen("password-reset-admin");
              setAuthPage(null);
            }}
            onBack={() => setScreen("home")}
          />
        );
      }

      return (
        <div className="page-container">
          <button
            className="back-btn"
            onClick={() => setScreen("admin")}
          >
            ← Admin Panel
          </button>

          <PasswordResetAdmin />
        </div>
      );
    }

    if (screen === "mcq") {
      return <MCQPage onBack={() => setScreen("home")} />;
    }

    if (screen === "tests") {
      return <TestsPage onBack={() => setScreen("home")} />;
    }

    if (screen === "resources") {
      return <ResourcesPage onBack={() => setScreen("home")} />;
    }

    return (
      <HomePage
        user={firebaseUser}
        userData={userData}
        onLogin={() => setAuthPage("login")}
        onRegister={() => setAuthPage("register")}
        onLogout={logout}
        onNavigate={setScreen}
      />
    );
  }, [screen, firebaseUser, userData, isAdmin]);

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-logo">📚</div>
        <h2>{APP_NAME}</h2>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <>
      {appPage}

      {authPage === "login" && (
        <LoginPage
          onSuccess={handleUserLogin}
          onRegister={() => setAuthPage("register")}
          onForgot={() => setAuthPage("forgot")}
          onAdmin={() => setAuthPage("admin")}
          onClose={() => setAuthPage(null)}
        />
      )}

      {authPage === "register" && (
        <RegisterPage
          onSuccess={handleRegisterSuccess}
          onLogin={() => setAuthPage("login")}
          onClose={() => setAuthPage(null)}
        />
      )}

      {authPage === "exam-selection" && (
        <ExamSelectionPage
          user={firebaseUser}
          onComplete={handleExamComplete}
          onClose={() => setAuthPage(null)}
        />
      )}

      {authPage === "forgot" && (
        <ForgotPassword
          onBack={() => setAuthPage("login")}
        />
      )}

      {authPage === "admin" && (
        <AdminLogin
          onSuccess={(user) => {
            setFirebaseUser(user);
            setAuthPage(null);
            setScreen("admin");
          }}
          onBack={() => setAuthPage("login")}
        />
      )}
    </>
  );
}
