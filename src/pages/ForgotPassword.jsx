import React, { useEffect, useState } from "react";
import "../App.css";

// ======================================================
// EXAM TEST - FORGOT PASSWORD
// Mobile Number + OTP + New Password
// ======================================================

const API_URL = "/api/forgot-password";

// ======================================================
// HELPERS
// ======================================================

const cleanMobile = (value) => {
  return String(value || "")
    .replace(/\D/g, "")
    .slice(0, 10);
};

// ======================================================
// COMPONENT
// ======================================================

export default function ForgotPassword({
  onBack,
  onLogin,
}) {
  const [step, setStep] = useState("mobile");

  const [mobile, setMobile] = useState("");

  const [requestId, setRequestId] = useState("");

  const [otp, setOtp] = useState("");

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

  // ====================================================
  // CLEAR MESSAGE
  // ====================================================

  const clearMessages = () => {
    setMessage("");
    setError("");
  };

  // ====================================================
  // REQUEST OTP
  // ====================================================

  const requestReset = async () => {
    clearMessages();

    const clean = cleanMobile(mobile);

    if (!/^[6-9]\d{9}$/.test(clean)) {
      setError(
        "कृपया सही 10 अंकों का Mobile Number डालें।"
      );
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(API_URL, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          action: "request",
          mobile: clean,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data?.error ||
            "Password reset request भेजने में समस्या हुई।"
        );
      }

      if (!data.requestId) {
        throw new Error(
          "Server ने Request ID नहीं भेजी।"
        );
      }

      setMobile(clean);

      setRequestId(data.requestId);

      setStep("otp");

      setMessage(
        "✅ Reset request सफलतापूर्वक भेज दी गई है। Admin OTP generate करके WhatsApp पर भेजेगा।"
      );
    } catch (err) {
      console.error(
        "Forgot Password Request Error:",
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

    if (!/^\d{6}$/.test(otp)) {
      setError(
        "कृपया 6 अंकों का OTP डालें।"
      );
      return;
    }

    if (newPassword.length < 6) {
      setError(
        "Password कम से कम 6 characters का होना चाहिए।"
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

      const response = await fetch(API_URL, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          action: "resetPassword",

          requestId: requestId,

          otp: otp,

          newPassword: newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data?.error ||
            "Password reset नहीं हो पाया।"
        );
      }

      setStep("done");

      setOtp("");

      setNewPassword("");

      setConfirmPassword("");

      setMessage(
        "✅ Password successfully change हो गया। अब नए Password से Login करें।"
      );
    } catch (err) {
      console.error(
        "Reset Password Error:",
        err
      );

      setError(
        err?.message ||
          "❌ Password reset करने में समस्या हुई।"
      );
    } finally {
      setLoading(false);
    }
  };

  // ====================================================
  // BACK TO LOGIN
  // ====================================================

  const handleBack = () => {
    if (onBack) {
      onBack();
    }
  };

  // ====================================================
  // GO LOGIN
  // ====================================================

  const handleLogin = () => {
    if (onLogin) {
      onLogin();
      return;
    }

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
        boxSizing: "border-box",
        background:
          "linear-gradient(135deg,#eef6ff,#f8fbff)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "450px",
          background: "#ffffff",
          borderRadius: "24px",
          padding: "30px",
          boxSizing: "border-box",
          boxShadow:
            "0 15px 45px rgba(15,23,42,0.12)",
          border:
            "1px solid #e2e8f0",
        }}
      >
        {/* ==================================================
            HEADER
        ================================================== */}

        <div
          style={{
            textAlign: "center",
            marginBottom: "25px",
          }}
        >
          <div
            style={{
              width: "82px",
              height: "82px",
              margin: "0 auto 14px",
              borderRadius: "24px",
              background: "#eff6ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "44px",
            }}
          >
            🔑
          </div>

          <h2
            style={{
              margin: "5px 0 8px",
              color: "#0f172a",
              fontSize: "30px",
              fontWeight: "800",
            }}
          >
            Forgot Password
          </h2>

          <p
            style={{
              margin: 0,
              color: "#64748b",
              fontSize: "16px",
              lineHeight: 1.5,
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
              padding: "13px 14px",
              marginBottom: "18px",
              background: "#ecfdf5",
              color: "#047857",
              border:
                "1px solid #a7f3d0",
              borderRadius: "12px",
              fontSize: "14px",
              lineHeight: 1.6,
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
              padding: "13px 14px",
              marginBottom: "18px",
              background: "#fef2f2",
              color: "#dc2626",
              border:
                "1px solid #fecaca",
              borderRadius: "12px",
              fontSize: "14px",
              lineHeight: 1.6,
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
                marginBottom: "8px",
                color: "#1e293b",
                fontWeight: "700",
                fontSize: "15px",
              }}
            >
              📱 Registered Mobile Number
            </label>

            <input
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              maxLength={10}
              value={mobile}
              onChange={(e) => {
                setMobile(
                  cleanMobile(e.target.value)
                );

                setError("");
                setMessage("");
              }}
              placeholder="10 digit mobile number"
              style={{
                width: "100%",
                padding: "15px",
                boxSizing: "border-box",
                border:
                  "1px solid #cbd5e1",
                borderRadius: "12px",
                fontSize: "17px",
                outline: "none",
                marginBottom: "18px",
              }}
            />

            <button
              type="button"
              onClick={requestReset}
              disabled={loading}
              style={{
                width: "100%",
                padding: "15px",
                border: "none",
                borderRadius: "12px",
                background: loading
                  ? "#93c5fd"
                  : "#2563eb",
                color: "#ffffff",
                fontSize: "16px",
                fontWeight: "800",
                cursor: loading
                  ? "not-allowed"
                  : "pointer",
              }}
            >
              {loading
                ? "Request भेजी जा रही है..."
                : "📱 Password Reset Request भेजें"}
            </button>

            <div
              style={{
                marginTop: "16px",
                padding: "13px",
                background: "#fff7ed",
                border:
                  "1px solid #fed7aa",
                borderRadius: "12px",
                color: "#9a3412",
                fontSize: "13px",
                lineHeight: 1.6,
              }}
            >
              🔐 Mobile Number डालने के बाद
              Admin Panel से OTP generate किया जाएगा
              और OTP WhatsApp पर भेजा जाएगा।
            </div>
          </>
        )}

        {/* ==================================================
            STEP 2 - OTP + NEW PASSWORD
        ================================================== */}

        {step === "otp" && (
          <>
            <div
              style={{
                textAlign: "center",
                marginBottom: "22px",
              }}
            >
              <div
                style={{
                  fontSize: "48px",
                  marginBottom: "5px",
                }}
              >
                📲
              </div>

              <h3
                style={{
                  margin: "5px 0 8px",
                  color: "#0f172a",
                  fontSize: "22px",
                }}
              >
                OTP Verification
              </h3>

              <p
                style={{
                  margin: 0,
                  color: "#64748b",
                  fontSize: "14px",
                  lineHeight: 1.6,
                }}
              >
                आपके registered Mobile Number
                पर Admin द्वारा OTP भेजा जाएगा।
              </p>

              <p
                style={{
                  margin:
                    "10px 0 0",
                  color: "#2563eb",
                  fontWeight: "700",
                  fontSize: "15px",
                }}
              >
                📱 +91 {mobile}
              </p>
            </div>

            {/* REQUEST ID */}

            <div
              style={{
                padding: "10px",
                marginBottom: "18px",
                background: "#f8fafc",
                border:
                  "1px solid #e2e8f0",
                borderRadius: "10px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  color: "#64748b",
                  marginBottom: "3px",
                }}
              >
                Request ID
              </div>

              <div
                style={{
                  fontSize: "12px",
                  color: "#334155",
                  wordBreak:
                    "break-all",
                }}
              >
                {requestId}
              </div>
            </div>

            {/* OTP */}

            <label
              style={{
                display: "block",
                marginBottom: "8px",
                color: "#1e293b",
                fontWeight: "700",
              }}
            >
              🔐 6 Digit OTP
            </label>

            <input
              type="tel"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              onChange={(e) => {
                setOtp(
                  e.target.value
                    .replace(/\D/g, "")
                    .slice(0, 6)
                );

                setError("");
              }}
              placeholder="______"
              style={{
                width: "100%",
                padding: "15px",
                boxSizing: "border-box",
                border:
                  "1px solid #cbd5e1",
                borderRadius: "12px",
                fontSize: "24px",
                textAlign: "center",
                letterSpacing: "8px",
                outline: "none",
                marginBottom: "18px",
              }}
            />

            {/* NEW PASSWORD */}

            <label
              style={{
                display: "block",
                marginBottom: "8px",
                color: "#1e293b",
                fontWeight: "700",
              }}
            >
              🔑 New Password
            </label>

            <input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(
                  e.target.value
                );

                setError("");
              }}
              placeholder="कम से कम 6 characters"
              style={{
                width: "100%",
                padding: "15px",
                boxSizing: "border-box",
                border:
                  "1px solid #cbd5e1",
                borderRadius: "12px",
                fontSize: "16px",
                outline: "none",
                marginBottom: "16px",
              }}
            />

            {/* CONFIRM PASSWORD */}

            <label
              style={{
                display: "block",
                marginBottom: "8px",
                color: "#1e293b",
                fontWeight: "700",
              }}
            >
              🔑 Confirm Password
            </label>

            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(
                  e.target.value
                );

                setError("");
              }}
              placeholder="Password दोबारा डालें"
              style={{
                width: "100%",
                padding: "15px",
                boxSizing: "border-box",
                border:
                  "1px solid #cbd5e1",
                borderRadius: "12px",
                fontSize: "16px",
                outline: "none",
                marginBottom: "18px",
              }}
            />

            {/* RESET BUTTON */}

            <button
              type="button"
              onClick={resetPassword}
              disabled={loading}
              style={{
                width: "100%",
                padding: "15px",
                border: "none",
                borderRadius: "12px",
                background: loading
                  ? "#86efac"
                  : "#16a34a",
                color: "#ffffff",
                fontSize: "16px",
                fontWeight: "800",
                cursor: loading
                  ? "not-allowed"
                  : "pointer",
              }}
            >
              {loading
                ? "Password change हो रहा है..."
                : "✅ Password Reset करें"}
            </button>

            <div
              style={{
                marginTop: "15px",
                padding: "12px",
                background: "#eff6ff",
                border:
                  "1px solid #bfdbfe",
                borderRadius: "10px",
                color: "#1d4ed8",
                fontSize: "13px",
                lineHeight: 1.6,
              }}
            >
              ℹ️ OTP की validity Admin द्वारा
              generate किए जाने के बाद सीमित समय
              तक रहेगी।
            </div>
          </>
        )}

        {/* ==================================================
            STEP 3 - DONE
        ================================================== */}

        {step === "done" && (
          <div
            style={{
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "85px",
                height: "85px",
                margin:
                  "5px auto 18px",
                borderRadius: "50%",
                background: "#dcfce7",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "45px",
              }}
            >
              ✅
            </div>

            <h3
              style={{
                margin:
                  "0 0 10px",
                color: "#166534",
                fontSize: "23px",
              }}
            >
              Password Changed
            </h3>

            <p
              style={{
                color: "#64748b",
                lineHeight: 1.7,
                fontSize: "15px",
                marginBottom: "22px",
              }}
            >
              आपका Password successfully change
              हो गया है।
              <br />
              अब नए Password से Login करें।
            </p>

            <button
              type="button"
              onClick={handleLogin}
              style={{
                width: "100%",
                padding: "15px",
                border: "none",
                borderRadius: "12px",
                background: "#2563eb",
                color: "#ffffff",
                fontSize: "16px",
                fontWeight: "800",
                cursor: "pointer",
              }}
            >
              🔐 Login पर जाएँ
            </button>
          </div>
        )}

        {/* ==================================================
            BACK BUTTON
        ================================================== */}

        {step !== "done" && (
          <button
            type="button"
            onClick={handleBack}
            disabled={loading}
            style={{
              width: "100%",
              marginTop: "16px",
              padding: "14px",
              border:
                "1px solid #cbd5e1",
              borderRadius: "12px",
              background: "#ffffff",
              color: "#334155",
              fontSize: "16px",
              fontWeight: "700",
              cursor: loading
                ? "not-allowed"
                : "pointer",
            }}
          >
            ← Login पर वापस जाएँ
          </button>
        )}

        {/* ==================================================
            BRAND
        ================================================== */}

        <div
          style={{
            textAlign: "center",
            marginTop: "22px",
            color: "#94a3b8",
            fontSize: "12px",
          }}
        >
          Exam Test
        </div>
      </div>
    </div>
  );
}
