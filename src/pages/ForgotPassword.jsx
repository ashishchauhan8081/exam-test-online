import React, { useEffect, useState } from "react";
import "../App.css";

// ======================================================
// API BASE URL
// ======================================================

const getApiBase = () => {
  try {
    const configured =
      typeof import.meta !== "undefined" &&
      import.meta.env?.VITE_API_BASE_URL
        ? String(import.meta.env.VITE_API_BASE_URL).replace(/\/$/, "")
        : "";

    if (configured) {
      return configured;
    }
  } catch (error) {
    console.warn("API environment read error:", error);
  }

  if (
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1")
  ) {
    return "http://localhost:5000";
  }

  // Production में VITE_API_BASE_URL जरूर रखें।
  return "";
};

const API_BASE = getApiBase();

// ======================================================
// HELPERS
// ======================================================

const cleanMobile = (value) => {
  return String(value || "")
    .replace(/\D/g, "")
    .slice(0, 10);
};

const formatTime = (seconds) => {
  const min = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");

  const sec = (seconds % 60)
    .toString()
    .padStart(2, "0");

  return `${min}:${sec}`;
};

// ======================================================
// COMPONENT
// ======================================================

export default function ForgotPassword({
  onBack,
  onLogin,
}) {
  // ----------------------------------------------------
  // STATES
  // ----------------------------------------------------

  const [mobile, setMobile] = useState("");

  const [step, setStep] = useState("mobile");

  const [requestId, setRequestId] = useState("");

  const [otp, setOtp] = useState("");

  const [resetToken, setResetToken] = useState("");

  const [newPassword, setNewPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const [remaining, setRemaining] =
    useState(0);

  // ====================================================
  // OTP TIMER
  // ====================================================

  useEffect(() => {
    if (remaining <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setRemaining((oldValue) => {
        if (oldValue <= 1) {
          return 0;
        }

        return oldValue - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [remaining]);

  // ====================================================
  // CLEAR MESSAGES
  // ====================================================

  const clearMessages = () => {
    setMessage("");
    setError("");
  };

  // ====================================================
  // API HELPER
  // ====================================================

  const apiRequest = async (
    endpoint,
    options = {}
  ) => {
    const url = `${API_BASE}${endpoint}`;

    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      ...options,
    });

    let data = {};

    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      throw new Error(
        data?.message ||
          `Server Error (${response.status})`
      );
    }

    return data;
  };

  // ====================================================
  // STEP 1
  // PASSWORD RESET REQUEST
  // ====================================================

  const requestReset = async () => {
    clearMessages();

    const clean = cleanMobile(mobile);

    if (!/^[6-9]\d{9}$/.test(clean)) {
      setError(
        "❌ कृपया 6 से शुरू होने वाला सही 10 अंकों का Mobile Number डालें।"
      );
      return;
    }

    if (!API_BASE) {
      setError(
        "❌ Backend API configure नहीं है। VITE_API_BASE_URL check करें।"
      );
      return;
    }

    try {
      setLoading(true);

      const data = await apiRequest(
        "/api/forgot-password/request",
        {
          method: "POST",

          body: JSON.stringify({
            identifier: clean,
          }),
        }
      );

      if (!data?.success) {
        throw new Error(
          data?.message ||
            "Password reset request नहीं भेजी गई।"
        );
      }

      const newRequestId =
        data?.requestId || "";

      if (!newRequestId) {
        throw new Error(
          "Server ने Request ID नहीं भेजी।"
        );
      }

      setRequestId(newRequestId);

      setOtp("");

      setResetToken("");

      setRemaining(10 * 60);

      setStep("waiting");

      setMessage(
        "✅ Password Reset Request Admin Panel में भेज दी गई है। Admin OTP generate करके WhatsApp पर भेजेगा।"
      );
    } catch (err) {
      console.error(
        "Password reset request error:",
        err
      );

      setError(
        err?.message ||
          "❌ Request भेजने में समस्या हुई।"
      );
    } finally {
      setLoading(false);
    }
  };

  // ====================================================
  // STEP 2
  // VERIFY OTP
  // ====================================================

  const verifyOTP = async () => {
    clearMessages();

    if (!requestId) {
      setError(
        "❌ Reset Request ID नहीं मिली।"
      );
      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      setError(
        "❌ कृपया 6 अंकों का OTP डालें।"
      );
      return;
    }

    try {
      setLoading(true);

      const data = await apiRequest(
        "/api/forgot-password/verify-otp",
        {
          method: "POST",

          body: JSON.stringify({
            requestId,
            otp,
          }),
        }
      );

      if (!data?.success) {
        throw new Error(
          data?.message ||
            "OTP verify नहीं हुआ।"
        );
      }

      if (!data?.resetToken) {
        throw new Error(
          "Server ने Reset Token नहीं भेजा।"
        );
      }

      setResetToken(
        data.resetToken
      );

      setRemaining(0);

      setStep("password");

      setMessage(
        "✅ OTP successfully verify हो गया। अब नया Password बनाएं।"
      );
    } catch (err) {
      console.error(
        "OTP verification error:",
        err
      );

      setError(
        err?.message ||
          "❌ OTP verify नहीं हो पाया।"
      );
    } finally {
      setLoading(false);
    }
  };

  // ====================================================
  // STEP 3
  // RESET PASSWORD
  // ====================================================

  const resetPassword = async () => {
    clearMessages();

    if (!requestId) {
      setError(
        "❌ Reset Request ID नहीं मिली।"
      );
      return;
    }

    if (!resetToken) {
      setError(
        "❌ Reset Token नहीं मिला। पहले OTP verify करें।"
      );
      return;
    }

    if (newPassword.length < 6) {
      setError(
        "❌ Password कम से कम 6 characters का होना चाहिए।"
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(
        "❌ दोनों Password समान नहीं हैं।"
      );
      return;
    }

    try {
      setLoading(true);

      const data = await apiRequest(
        "/api/forgot-password/reset",
        {
          method: "POST",

          body: JSON.stringify({
            requestId,
            resetToken,
            newPassword,
          }),
        }
      );

      if (!data?.success) {
        throw new Error(
          data?.message ||
            "Password reset नहीं हुआ।"
        );
      }

      setNewPassword("");

      setConfirmPassword("");

      setOtp("");

      setResetToken("");

      setStep("done");

      setMessage(
        "✅ आपका Password successfully change हो गया है। अब नए Password से Login करें।"
      );
    } catch (err) {
      console.error(
        "Password reset error:",
        err
      );

      setError(
        err?.message ||
          "❌ Password change नहीं हो पाया।"
      );
    } finally {
      setLoading(false);
    }
  };

  // ====================================================
  // RESEND / NEW REQUEST
  // ====================================================

  const startAgain = () => {
    setMobile("");

    setRequestId("");

    setOtp("");

    setResetToken("");

    setNewPassword("");

    setConfirmPassword("");

    setRemaining(0);

    clearMessages();

    setStep("mobile");
  };

  // ====================================================
  // BACK
  // ====================================================

  const handleBack = () => {
    if (onBack) {
      onBack();
    }
  };

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <div
      style={{
        minHeight: "100vh",

        display: "flex",

        alignItems: "center",

        justifyContent: "center",

        padding: "20px",

        background:
          "linear-gradient(135deg,#eef2ff,#ffffff)",

        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",

          maxWidth: "430px",

          background: "#ffffff",

          borderRadius: "22px",

          padding: "28px",

          boxShadow:
            "0 10px 35px rgba(0,0,0,0.12)",

          boxSizing: "border-box",
        }}
      >
        {/* ==================================================
            HEADER
        ================================================== */}

        <div
          style={{
            textAlign: "center",

            marginBottom: "24px",
          }}
        >
          <div
            style={{
              width: "78px",

              height: "78px",

              margin: "0 auto 12px",

              borderRadius: "22px",

              background: "#eff6ff",

              display: "flex",

              alignItems: "center",

              justifyContent: "center",

              fontSize: "43px",
            }}
          >
            🔑
          </div>

          <h2
            style={{
              margin: "8px 0",

              color: "#111827",

              fontSize: "29px",
            }}
          >
            Forgot Password
          </h2>

          <p
            style={{
              color: "#64748b",

              margin: 0,

              fontSize: "15px",
            }}
          >
            Mobile Number से Password Reset करें
          </p>
        </div>

        {/* ==================================================
            SUCCESS MESSAGE
        ================================================== */}

        {message && (
          <div
            style={{
              padding: "13px",

              marginBottom: "15px",

              background: "#ecfdf5",

              color: "#047857",

              border:
                "1px solid #a7f3d0",

              borderRadius: "10px",

              fontSize: "14px",

              lineHeight: 1.5,
            }}
          >
            {message}
          </div>
        )}

        {/* ==================================================
            ERROR MESSAGE
        ================================================== */}

        {error && (
          <div
            style={{
              padding: "13px",

              marginBottom: "15px",

              background: "#fef2f2",

              color: "#dc2626",

              border:
                "1px solid #fecaca",

              borderRadius: "10px",

              fontSize: "14px",

              lineHeight: 1.5,
            }}
          >
            {error}
          </div>
        )}

        {/* ==================================================
            STEP 1 - MOBILE
        ================================================== */}

        {step === "mobile" && (
          <>
            <label
              style={{
                display: "block",

                fontWeight: "600",

                color: "#1f2937",

                marginBottom: "7px",
              }}
            >
              📱 Mobile Number
            </label>

            <input
              type="tel"

              inputMode="numeric"

              autoComplete="tel"

              maxLength={10}

              value={mobile}

              onChange={(e) => {
                setMobile(
                  cleanMobile(
                    e.target.value
                  )
                );

                setError("");

                setMessage("");
              }}

              placeholder="10 digit mobile number"

              style={{
                width: "100%",

                boxSizing: "border-box",

                padding: "15px",

                marginBottom: "18px",

                border:
                  "1px solid #d1d5db",

                borderRadius: "11px",

                fontSize: "17px",

                outline: "none",
              }}
            />

            <button
              onClick={requestReset}

              disabled={loading}

              style={{
                width: "100%",

                padding: "15px",

                border: 0,

                borderRadius: "11px",

                background:
                  loading
                    ? "#93c5fd"
                    : "#2563eb",

                color: "#ffffff",

                fontSize: "16px",

                fontWeight: "700",

                cursor: loading
                  ? "not-allowed"
                  : "pointer",
              }}
            >
              {loading
                ? "⏳ Request भेजी जा रही है..."
                : "📱 Password Reset Request"}
            </button>

            <div
              style={{
                marginTop: "15px",

                padding: "12px",

                background: "#fff7ed",

                border:
                  "1px solid #fed7aa",

                borderRadius: "10px",

                color: "#9a3412",

                fontSize: "13px",

                lineHeight: 1.5,
              }}
            >
              🔐 Mobile Number डालने के बाद
              Admin Panel में request दिखाई देगी।
              Admin OTP generate करके WhatsApp से भेजेगा।
            </div>
          </>
        )}

        {/* ==================================================
            STEP 2 - OTP
        ================================================== */}

        {step === "waiting" && (
          <>
            <div
              style={{
                textAlign: "center",

                padding:
                  "5px 0 18px",
              }}
            >
              <div
                style={{
                  fontSize: "48px",
                }}
              >
                📲
              </div>

              <h3
                style={{
                  margin:
                    "8px 0",

                  color: "#111827",
                }}
              >
                OTP Verification
              </h3>

              <p
                style={{
                  color: "#64748b",

                  lineHeight: 1.6,

                  margin:
                    "0 0 8px",
                }}
              >
                आपका Password Reset Request
                Admin Panel में पहुँच गया है।
              </p>

              <p
                style={{
                  color: "#64748b",

                  fontSize: "14px",

                  margin: 0,
                }}
              >
                WhatsApp पर मिले 6 digit OTP को
                यहाँ डालें।
              </p>

              {remaining > 0 && (
                <div
                  style={{
                    marginTop: "12px",

                    display:
                      "inline-block",

                    padding:
                      "7px 12px",

                    background:
                      "#eff6ff",

                    color:
                      "#1d4ed8",

                    borderRadius:
                      "20px",

                    fontWeight: "700",

                    fontSize: "13px",
                  }}
                >
                  ⏱️ OTP valid:
                  {" "}
                  {formatTime(
                    remaining
                  )}
                </div>
              )}
            </div>

            <div
              style={{
                padding: "10px",

                marginBottom: "15px",

                background: "#f8fafc",

                border:
                  "1px solid #e2e8f0",

                borderRadius: "10px",

                fontSize: "12px",

                color: "#64748b",

                wordBreak:
                  "break-word",
              }}
            >
              <strong>
                Request ID:
              </strong>

              <br />

              {requestId}
            </div>

            <label
              style={{
                display: "block",

                fontWeight: "600",

                marginBottom: "7px",
              }}
            >
              🔐 OTP
            </label>

            <input
              type="tel"

              inputMode="numeric"

              autoComplete="one-time-code"

              maxLength={6}

              value={otp}

              onChange={(e) =>
                setOtp(
                  e.target.value
                    .replace(/\D/g, "")
                    .slice(0, 6)
                )
              }

              placeholder="6 digit OTP"

              style={{
                width: "100%",

                boxSizing: "border-box",

                padding: "15px",

                marginBottom: "15px",

                border:
                  "1px solid #d1d5db",

                borderRadius: "11px",

                fontSize: "23px",

                textAlign: "center",

                letterSpacing: "7px",

                outline: "none",
              }}
            />

            <button
              onClick={verifyOTP}

              disabled={
                loading ||
                otp.length !== 6
              }

              style={{
                width: "100%",

                padding: "15px",

                border: 0,

                borderRadius: "11px",

                background:
                  loading ||
                  otp.length !== 6
                    ? "#86efac"
                    : "#16a34a",

                color: "#ffffff",

                fontSize: "16px",

                fontWeight: "700",

                cursor:
                  loading ||
                  otp.length !== 6
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              {loading
                ? "⏳ Verify हो रहा है..."
                : "✅ OTP Verify करें"}
            </button>

            <button
              type="button"

              onClick={startAgain}

              style={{
                width: "100%",

                marginTop: "10px",

                padding: "12px",

                border:
                  "1px solid #cbd5e1",

                borderRadius: "10px",

                background: "#ffffff",

                color: "#475569",

                fontWeight: "600",

                cursor: "pointer",
              }}
            >
              ← दूसरा Mobile Number
            </button>
          </>
        )}

        {/* ==================================================
            STEP 3 - NEW PASSWORD
        ================================================== */}

        {step === "password" && (
          <>
            <div
              style={{
                textAlign: "center",

                marginBottom: "20px",
              }}
