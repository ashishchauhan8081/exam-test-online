// ======================================================
// FORGOT PASSWORD
// Exam Test
// Mobile Number + Admin OTP + New Password
// ======================================================

import React, { useEffect, useState } from "react";
import "../App.css";

// ======================================================
// API URL
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
  // ----------------------------------------------------
  // STATES
  // ----------------------------------------------------

  const [mobile, setMobile] = useState("");

  const [step, setStep] = useState("mobile");

  const [requestId, setRequestId] = useState("");

  const [otp, setOtp] = useState("");

  const [newPassword, setNewPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  // ====================================================
  // CLEAR MESSAGES
  // ====================================================

  const clearMessages = () => {
    setMessage("");
    setError("");
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
  // STEP 1
  // REQUEST PASSWORD RESET
  // ====================================================

  const requestReset = async () => {
    clearMessages();

    const clean = cleanMobile(mobile);

    // Mobile validation
    if (!/^[6-9]\d{9}$/.test(clean)) {
      setError(
        "❌ कृपया 6 से शुरू होने वाला सही 10 अंकों का Mobile Number डालें।"
      );
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        API_URL,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            action: "request",
            mobile: clean,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data?.error ||
            "Password reset request भेजने में समस्या हुई।"
        );
      }

      // Save request ID
      setRequestId(
        data.requestId || ""
      );

      // Save mobile
      setMobile(clean);

      // Go OTP screen
      setStep("otp");

      setMessage(
        "✅ Password reset request Admin Panel में भेज दी गई है। Admin OTP generate करके WhatsApp पर भेजेगा।"
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
  // OTP VALIDATION
  //
  // Server final password reset के समय OTP verify
  // करेगा। यहाँ केवल OTP format check किया जाता है।
  // ====================================================

  const continueToPassword = () => {
    clearMessages();

    if (!requestId) {
      setError(
        "❌ Reset request नहीं मिली। कृपया दोबारा request करें।"
      );
      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      setError(
        "❌ कृपया 6 अंकों का OTP डालें।"
      );
      return;
    }

    setStep("password");

    setMessage(
      "✅ OTP दर्ज हो गया। नया Password बनाइए। OTP की अंतिम पुष्टि Password Save करते समय server पर होगी।"
    );
  };

  // ====================================================
  // STEP 3
  // RESET PASSWORD
  // ====================================================

  const resetPassword = async () => {
    clearMessages();

    if (!requestId) {
      setError(
        "❌ Reset request नहीं मिली।"
      );
      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      setError(
        "❌ कृपया सही 6 अंकों का OTP डालें।"
      );
      setStep("otp");
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

      const response = await fetch(
        API_URL,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            action:
              "resetPassword",

            requestId:
              requestId,

            otp:
              otp,

            newPassword:
              newPassword,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data?.error ||
            "Password reset नहीं हो पाया।"
        );
      }

      // Clear sensitive values
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");

      setStep("done");

      setMessage(
        "✅ Password successfully change हो गया। अब नए Password से Login करें।"
      );
    } catch (err) {
      console.error(
        "Password reset error:",
        err
      );

      setError(
        err?.message ||
          "❌ Password reset करते समय समस्या हुई।"
      );
    } finally {
      setLoading(false);
    }
  };

  // ====================================================
  // CHANGE MOBILE
  // ====================================================

  const changeMobile = () => {
    clearMessages();

    setRequestId("");
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");

    setStep("mobile");
  };

  // ====================================================
  // GO OTP
  // ====================================================

  const goToOtp = () => {
    clearMessages();

    setStep("otp");
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

          borderRadius: "24px",

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

            marginBottom: "25px",
          }}
        >
          <div
            style={{
              width: "80px",

              height: "80px",

              margin: "0 auto 12px",

              borderRadius: "22px",

              background: "#eff6ff",

              display: "flex",

              alignItems: "center",

              justifyContent: "center",

              fontSize: "45px",
            }}
          >
            🔑
          </div>

          <h1
            style={{
              margin: "8px 0",

              color: "#111827",

              fontSize: "30px",

              fontWeight: "800",
            }}
          >
            Forgot Password
          </h1>

          <p
            style={{
              color: "#64748b",

              margin: 0,

              fontSize: "16px",
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
            STEP 1
            MOBILE NUMBER
        ================================================== */}

        {step === "mobile" && (
          <>
            <label
              style={{
                display: "block",

                fontWeight: "700",

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
              }}

              placeholder="10 अंकों का Mobile Number"

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
              type="button"

              onClick={requestReset}

              disabled={loading}

              style={{
                width: "100%",

                padding: "15px",

                border: 0,

                borderRadius: "11px",

                background: loading
                  ? "#93c5fd"
                  : "#2563eb",

                color: "#fff",

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

                padding: "13px",

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
              Admin Panel में Reset Request जाएगी।
              Admin OTP generate करेगा और WhatsApp
              पर भेजेगा।
            </div>
          </>
        )}

        {/* ==================================================
            STEP 2
            OTP
        ================================================== */}

        {step === "otp" && (
          <>
            <div
              style={{
                textAlign: "center",

                padding:
                  "5px 0 20px",
              }}
            >
              <div
                style={{
                  fontSize: "48px",
                }}
              >
                📲
              </div>

              <h2
                style={{
                  margin: "8px 0",

                  color: "#111827",

                  fontSize: "23px",
                }}
              >
                OTP Verification
              </h2>

              <p
                style={{
                  color: "#64748b",

                  lineHeight: 1.6,

                  marginBottom: "8px",
                }}
              >
                Admin द्वारा WhatsApp पर भेजा गया
                6 digit OTP यहाँ डालें।
              </p>

              <p
                style={{
                  color: "#2563eb",

                  fontWeight: "700",

                  margin: 0,
                }}
              >
                📱 {mobile}
              </p>
            </div>

            {/* Request ID */}

            <div
              style={{
                padding: "10px",

                marginBottom: "16px",

                background: "#f8fafc",

                border:
                  "1px solid #e2e8f0",

                borderRadius: "9px",

                fontSize: "12px",

                color: "#64748b",

                wordBreak: "break-all",

                textAlign: "center",
              }}
            >
              Request ID:
              <br />
              <strong
                style={{
                  color: "#475569",
                }}
              >
                {requestId}
              </strong>
            </div>

            <label
              style={{
                display: "block",

                fontWeight: "700",

                color: "#1f2937",

                marginBottom: "7px",
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

              placeholder="••••••"

              style={{
                width: "100%",

                boxSizing: "border-box",

                padding: "15px",

                marginBottom: "15px",

                border:
                  "1px solid #d1d5db",

                borderRadius: "11px",

                fontSize: "25px",

                textAlign: "center",

                letterSpacing: "8px",

                outline: "none",
              }}
            />

            <button
              type="button"

              onClick={continueToPassword}

              disabled={
                otp.length !== 6
              }

              style={{
                width: "100%",

                padding: "15px",

                border: 0,

                borderRadius: "11px",

                background:
                  otp.length === 6
                    ? "#16a34a"
                    : "#94a3b8",

                color: "#fff",

                fontSize: "16px",

                fontWeight: "700",

                cursor:
                  otp.length === 6
                    ? "pointer"
                    : "not-allowed",
              }}
            >
              ✅ OTP आगे बढ़ाएँ
            </button>

            <button
              type="button"

              onClick={changeMobile}

              style={{
                width: "100%",

                marginTop: "12px",

                padding: "12px",

                border:
                  "1px solid #d1d5db",

                borderRadius: "10px",

                background: "#fff",

                color: "#475569",

                fontWeight: "600",
              }}
            >
              ← Mobile Number बदलें
            </button>
          </>
        )}

        {/* ==================================================
            STEP 3
            NEW PASSWORD
        ================================================== */}

        {step === "password" && (
          <>
            <div
              style={{
                textAlign: "center",

                marginBottom: "20px",
              }}
            >
              <div
                style={{
                  fontSize: "45px",
                }}
              >
                🔐
              </div>

              <h2
                style={{
                  margin: "5px 0",

                  color: "#111827",

                  fontSize: "23px",
                }}
              >
                नया Password बनाएं
              </h2>

              <p
                style={{
                  color: "#64748b",

                  fontSize: "14px",

                  marginBottom: 0,
                }}
              >
                OTP दर्ज हो चुका है।
                अब नया Password बनाएं।
              </p>
            </div>

            {/* OTP DISPLAY */}

            <div
              style={{
                padding: "10px",

                marginBottom: "16px",

                background: "#f0fdf4",

                border:
                  "1px solid #bbf7d0",

                borderRadius: "9px",

                textAlign: "center",

                color: "#166534",

                fontSize: "13px",
              }}
            >
              📱 Mobile:{" "}
              <strong>
                {mobile}
              </strong>

              <br />

              🔐 OTP:{" "}
              <strong>
                {otp}
              </strong>
            </div>

            {/* NEW PASSWORD */}

            <label
              style={{
                display: "block",

                fontWeight: "700",

                color: "#1f2937",

                marginBottom: "7px",
              }}
            >
              🔑 New Password
            </label>

            <div
              style={{
                position: "relative",

                width: "100%",

                marginBottom: "15px",
              }}
            >
              <input
                type={
                  showPassword
                    ? "text"
                    : "password"
                }

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

                  boxSizing: "border-box",

                  padding: "15px 50px 15px 15px",

                  border:
                    "1px solid #d1d5db",

                  borderRadius: "11px",

                  fontSize: "16px",

                  outline: "none",
                }}
              />

              <button
                type="button"

                onClick={() =>
                  setShowPassword(
                    !showPassword
                  )
                }

                style={{
                  position:
                    "absolute",

                  right: "10px",

                  top: "50%",

                  transform:
                    "translateY(-50%)",

                  border: "none",

                  background:
                    "transparent",

                  fontSize: "20px",

                  cursor: "pointer",
                }}
              >
                {showPassword
                  ? "🙈"
                  : "👁️"}
              </button>
            </div>

            {/* CONFIRM PASSWORD */}

            <label
              style={{
                display: "block",

                fontWeight: "700",

                color: "#1f2937",

                marginBottom: "7px",
              }}
            >
              🔐 Confirm Password
            </label>

            <div
              style={{
                position: "relative",

                width: "100%",

                marginBottom: "18px",
              }}
            >
              <input
                type={
                  showConfirmPassword
                    ? "text"
                    : "password"
                }

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

                  boxSizing: "border-box",

                  padding: "15px 50px 15px 15px",

                  border:
                    "1px solid #d1d5db",

                  borderRadius: "11px",

                  fontSize: "16px",

                  outline: "none",
                }}
              />

              <button
                type="button"

                onClick={() =>
                  setShowConfirmPassword(
                    !showConfirmPassword
                  )
                }

                style={{
                  position:
                    "absolute",

                  right: "10px",

                  top: "50%",

                  transform:
                    "translateY(-50%)",

                  border: "none",

                  background:
                    "transparent",

                  fontSize: "20px",

                  cursor: "pointer",
                }}
              >
                {showConfirmPassword
                  ? "🙈"
                  : "👁️"}
              </button>
            </div>

            {/* PASSWORD REQUIREMENT */}

            <div
              style={{
                marginBottom: "16px",

                padding: "11px",

                background: "#eff6ff",

                border:
                  "1px solid #bfdbfe",

                borderRadius: "9px",

                color: "#1e40af",

                fontSize: "13px",

                lineHeight: 1.5,
              }}
            >
              🔒 Password कम से कम 6 characters
              का होना चाहिए।
            </div>

            {/* RESET BUTTON */}

            <button
              type="button"

              onClick={resetPassword}

              disabled={loading}

              style={{
                width: "100%",

                padding: "15px",

                border: 0,

                borderRadius: "11px",

                background: loading
                  ? "#86efac"
                  : "#16a34a",

                color: "#fff",

                fontSize: "16px",

                fontWeight: "700",

                cursor: loading
                  ? "not-allowed"
                  : "pointer",
              }}
            >
              {loading
                ? "⏳ Password बदल रहा है..."
                : "🔐 Password Reset करें"}
            </button>

            <button
              type="button"

              onClick={goToOtp}

              disabled={loading}

              style={{
                width: "100%",

                marginTop: "12px",

                padding: "12px",

                border:
                  "1px solid #d1d5db",

                borderRadius: "10px",

                background: "#fff",

                color: "#475569",

                fontWeight: "600",

                cursor: "pointer",
              }}
            >
              ← OTP बदलें
            </button>
          </>
        )}

        {/* ==================================================
            STEP 4
            DONE
        ================================================== */}

        {step === "done" && (
          <>
            <div
              style={{
                textAlign: "center",

                padding:
                  "15px 0 20px",
              }}
            >
              <div
                style={{
                  width: "85px",

                  height: "85px",

                  margin:
                    "0 auto 15px",

                  borderRadius: "50%",

                  background: "#dcfce7",

                  display: "flex",

                  alignItems: "center",

                  justifyContent: "center",

                  fontSize: "48px",
                }}
              >
                ✅
              </div>

              <h2
                style={{
                  color: "#166534",

                  margin: "10px 0",

                  fontSize: "25px",
                }}
              >
                Password Changed!
              </h2>

              <p
                style={{
                  color: "#64748b",

                  lineHeight: 1.6,

                  fontSize: "15px",
                }}
              >
                आपका Password सफलतापूर्वक बदल गया है।
                अब नए Password से Login करें।
              </p>
            </div>

            <button
              type="button"

              onClick={() => {
                if (onLogin) {
                  onLogin();
                }
              }}

              style={{
                width: "100%",

                padding: "15px",

                border: 0,

                borderRadius: "11px",

                background: "#2563eb",

                color: "#fff",

                fontSize: "16px",

                fontWeight: "700",

                cursor: "pointer",
              }}
            >
              🔐 Login करें
            </button>
          </>
        )}

        {/* ==================================================
            BACK TO LOGIN
        ================================================== */}

        {step !== "done" && (
          <button
            type="button"

            onClick={() => {
              if (onLogin) {
                onLogin();
              } else {
                handleBack();
              }
            }}

            style={{
              width: "100%",

              marginTop: "15px",

              padding: "13px",

              border:
                "1px solid #cbd5e1",

              borderRadius: "11px",

              background: "#f8fafc",

              color: "#334155",

              fontSize: "15px",

              fontWeight: "700",

              cursor: "pointer",
            }}
          >
            ← Login पर वापस जाएँ
          </button>
        )}

      </div>
    </div>
  );
}
