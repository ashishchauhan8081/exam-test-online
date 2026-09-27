import React, {
  useState,
} from "react";

// ======================================================
// EXAM TEST
// FORGOT PASSWORD - MOBILE OTP
// ======================================================

function ForgotPassword({
  onBack,
  onLogin,
}) {
  // ====================================================
  // STATES
  // ====================================================

  const [mobile, setMobile] =
    useState("");

  const [requestId, setRequestId] =
    useState("");

  const [otp, setOtp] =
    useState("");

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

  const [step, setStep] =
    useState("mobile");

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  // ====================================================
  // API URL
  // ====================================================

  /*
   * Vercel पर:
   *
   * https://your-domain.com/api/forgot-password
   *
   * इसलिए localhost इस्तेमाल नहीं करेंगे।
   */

  const API_URL =
    "/api/forgot-password";

  // ====================================================
  // CLEAN MOBILE
  // ====================================================

  const cleanMobile = (value) => {
    return String(value || "")
      .replace(/\D/g, "")
      .slice(0, 10);
  };

  // ====================================================
  // MOBILE CHANGE
  // ====================================================

  const handleMobileChange = (e) => {
    const value =
      cleanMobile(
        e.target.value
      );

    setMobile(value);

    setError("");
    setMessage("");
  };

  // ====================================================
  // REQUEST OTP
  // ====================================================

  const handleRequest = async (
    e
  ) => {
    e.preventDefault();

    setError("");
    setMessage("");

    // ------------------------------------------
    // MOBILE VALIDATION
    // ------------------------------------------

    if (
      !/^[6-9]\d{9}$/.test(
        mobile
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
          API_URL,
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
                mobile,
            }),
          }
        );

      const data =
        await response
          .json()
          .catch(
            () => ({})
          );

      console.log(
        "Forgot Password Request:",
        data
      );

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
            data.message ||
            "Forgot Password Request नहीं भेजी जा सकी।"
        );
      }

      // ------------------------------------------
      // REQUEST ID SAVE
      // ------------------------------------------

      setRequestId(
        data.requestId || ""
      );

      setMessage(
        "✅ Password Reset Request Admin Panel में भेज दी गई है। Admin OTP Generate करके WhatsApp पर भेजेगा।"
      );

      // ------------------------------------------
      // NEXT STEP
      // ------------------------------------------

      setStep("otp");

    } catch (error) {
      console.error(
        "Forgot Password Request Error:",
        error
      );

      setError(
        error?.message ||
          "Server से connection नहीं हो पाया।"
      );
    } finally {
      setLoading(false);
    }
  };

  // ====================================================
  // RESET PASSWORD
  // ====================================================

  const handleResetPassword =
    async (e) => {
      e.preventDefault();

      setError("");
      setMessage("");

      // ------------------------------------------
      // REQUEST ID
      // ------------------------------------------

      if (!requestId) {
        setError(
          "Password Reset Request ID नहीं मिली। कृपया फिर से Mobile Number डालें।"
        );

        setStep("mobile");

        return;
      }

      // ------------------------------------------
      // OTP
      // ------------------------------------------

      if (
        !/^\d{6}$/.test(
          otp
        )
      ) {
        setError(
          "कृपया 6 अंकों का OTP डालें।"
        );

        return;
      }

      // ------------------------------------------
      // PASSWORD
      // ------------------------------------------

      if (
        newPassword.length < 6
      ) {
        setError(
          "Password कम से कम 6 characters का होना चाहिए।"
        );

        return;
      }

      // ------------------------------------------
      // CONFIRM PASSWORD
      // ------------------------------------------

      if (
        newPassword !==
        confirmPassword
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
          await response
            .json()
            .catch(
              () => ({})
            );

        console.log(
          "Reset Password Response:",
          data
        );

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.error ||
              data.message ||
              "Password Reset नहीं हो पाया।"
          );
        }

        // ------------------------------------------
        // SUCCESS
        // ------------------------------------------

        setMessage(
          "✅ Password successfully change हो गया। अब नए Password से Login करें।"
        );

        setOtp("");
        setNewPassword("");
        setConfirmPassword("");

        setStep(
          "success"
        );

      } catch (error) {
        console.error(
          "Reset Password Error:",
          error
        );

        setError(
          error?.message ||
            "Password Reset करते समय server error आया।"
        );
      } finally {
        setLoading(false);
      }
    };

  // ====================================================
  // RESET EVERYTHING
  // ====================================================

  const handleStartAgain =
    () => {
      setMobile("");
      setRequestId("");
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");

      setMessage("");
      setError("");

      setStep("mobile");
    };

  // ====================================================
  // BACK
  // ====================================================

  const handleBack =
    () => {
      if (
        step === "otp"
      ) {
        setStep("mobile");
        setError("");
        setMessage("");
        return;
      }

      if (
        typeof onBack ===
        "function"
      ) {
        onBack();
      }
    };

  // ====================================================
  // MAIN STYLE
  // ====================================================

  const pageStyle = {
    minHeight:
      "100vh",

    width:
      "100%",

    background:
      "linear-gradient(135deg, #eef6ff 0%, #f8fbff 50%, #eaf3ff 100%)",

    display:
      "flex",

    alignItems:
      "center",

    justifyContent:
      "center",

    padding:
      "20px",

    boxSizing:
      "border-box",

    fontFamily:
      "Arial, Helvetica, sans-serif",
  };

  const cardStyle = {
    width:
      "100%",

    maxWidth:
      "620px",

    background:
      "#ffffff",

    borderRadius:
      "28px",

    padding:
      "34px 28px",

    boxSizing:
      "border-box",

    boxShadow:
      "0 20px 60px rgba(30, 80, 140, 0.15)",

    border:
      "1px solid #e5edf7",
  };

  const inputStyle = {
    width:
      "100%",

    padding:
      "16px 17px",

    border:
      "1px solid #cbd5e1",

    borderRadius:
      "14px",

    fontSize:
      "17px",

    outline:
      "none",

    boxSizing:
      "border-box",

    background:
      "#ffffff",

    color:
      "#172033",
  };

  const primaryButtonStyle = {
    width:
      "100%",

    padding:
      "16px",

    border:
      "none",

    borderRadius:
      "14px",

    background:
      "linear-gradient(135deg, #0866ff, #1557d6)",

    color:
      "#ffffff",

    fontSize:
      "18px",

    fontWeight:
      "800",

    cursor:
      loading
        ? "not-allowed"
        : "pointer",

    opacity:
      loading
        ? 0.7
        : 1,

    boxShadow:
      "0 8px 20px rgba(8, 102, 255, 0.22)",
  };

  const secondaryButtonStyle = {
    width:
      "100%",

    padding:
      "14px",

    border:
      "1px solid #cbd5e1",

    borderRadius:
      "14px",

    background:
      "#f8fafc",

    color:
      "#243047",

    fontSize:
      "17px",

    fontWeight:
      "700",

    cursor:
      "pointer",
  };

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <div
      style={
        pageStyle
      }
    >
      <div
        style={
          cardStyle
        }
      >

        {/* ==================================================
            HEADER
        ================================================== */}

        <div
          style={{
            textAlign:
              "center",

            marginBottom:
              "28px",
          }}
        >

          <div
            style={{
              width:
                "88px",

              height:
                "88px",

              margin:
                "0 auto 18px",

              borderRadius:
                "24px",

              background:
                "#eef6ff",

              display:
                "flex",

              alignItems:
                "center",

              justifyContent:
                "center",

              fontSize:
                "48px",
            }}
          >
            🔑
          </div>

          <h1
            style={{
              margin:
                "0",

              color:
                "#111827",

              fontSize:
                "40px",

              lineHeight:
                "1.1",

              fontWeight:
                "800",
            }}
          >
            Forgot Password
          </h1>

          <p
            style={{
              margin:
                "12px 0 0",

              color:
                "#64748b",

              fontSize:
                "18px",

              lineHeight:
                "1.5",
            }}
          >
            Exam Test account का
            Password Reset करें
          </p>
        </div>

        {/* ==================================================
            STEP 1 - MOBILE
        ================================================== */}

        {step ===
          "mobile" && (
          <form
            onSubmit={
              handleRequest
            }
          >

            <div
              style={{
                marginBottom:
                  "12px",

                color:
                  "#1e293b",

                fontWeight:
                  "800",

                fontSize:
                  "18px",
              }}
            >
              📱 Registered Mobile Number
            </div>

            <input
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              maxLength={10}
              value={mobile}
              onChange={
                handleMobileChange
              }
              placeholder="10 अंकों का Mobile Number"
              style={
                inputStyle
              }
            />

            <div
              style={{
                marginTop:
                  "9px",

                color:
                  "#64748b",

                fontSize:
                  "14px",
              }}
            >
              जिस Mobile Number से आपका
              Exam Test account registered है,
              वही Mobile Number डालें।
            </div>

            {/* ERROR */}

            {error && (
              <div
                style={{
                  marginTop:
                    "16px",

                  padding:
                    "13px 15px",

                  borderRadius:
                    "12px",

                  background:
                    "#fef2f2",

                  border:
                    "1px solid #fecaca",

                  color:
                    "#b91c1c",

                  fontSize:
                    "15px",

                  lineHeight:
                    "1.5",
                }}
              >
                ❌ {error}
              </div>
            )}

            {/* MESSAGE */}

            {message && (
              <div
                style={{
                  marginTop:
                    "16px",

                  padding:
                    "13px 15px",

                  borderRadius:
                    "12px",

                  background:
                    "#ecfdf5",

                  border:
                    "1px solid #a7f3d0",

                  color:
                    "#047857",

                  fontSize:
                    "15px",

                  lineHeight:
                    "1.5",
                }}
              >
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={
                loading
              }
              style={{
                ...primaryButtonStyle,

                marginTop:
                  "22px",
              }}
            >
              {loading
                ? "⏳ Request भेजी जा रही है..."
                : "📱 Forgot Password Request भेजें"}
            </button>

          </form>
        )}

        {/* ==================================================
            STEP 2 - OTP + NEW PASSWORD
        ================================================== */}

        {step ===
          "otp" && (
          <form
            onSubmit={
              handleResetPassword
            }
          >

            {/* REQUEST INFO */}

            <div
              style={{
                padding:
                  "15px",

                borderRadius:
                  "14px",

                background:
                  "#eff6ff",

                border:
                  "1px solid #bfdbfe",

                marginBottom:
                  "22px",
              }}
            >
              <div
                style={{
                  color:
                    "#1e40af",

                  fontWeight:
                    "800",

                  marginBottom:
                    "6px",
                }}
              >
                📱 Mobile Number
              </div>

              <div
                style={{
                  fontSize:
                    "18px",

                  fontWeight:
                    "700",

                  color:
                    "#111827",
                }}
              >
                +91 {mobile}
              </div>

              {requestId && (
                <div
                  style={{
                    marginTop:
                      "8px",

                    fontSize:
                      "12px",

                    color:
                      "#64748b",

                    wordBreak:
                      "break-all",
                  }}
                >
                  Request ID:{" "}
                  {requestId}
                </div>
              )}
            </div>

            {/* ADMIN MESSAGE */}

            <div
              style={{
                padding:
                  "15px",

                borderRadius:
                  "14px",

                background:
                  "#fff7ed",

                border:
                  "1px solid #fed7aa",

                color:
                  "#9a3412",

                fontSize:
                  "15px",

                lineHeight:
                  "1.55",

                marginBottom:
                  "22px",
              }}
            >
              🔐 Admin आपके Mobile Number पर
              OTP Generate करके WhatsApp पर
              भेजेगा। WhatsApp पर प्राप्त
              6 अंकों का OTP यहाँ डालें।
            </div>

            {/* OTP */}

            <label
              style={{
                display:
                  "block",

                marginBottom:
                  "9px",

                fontSize:
                  "17px",

                fontWeight:
                  "800",

                color:
                  "#1e293b",
              }}
            >
              🔢 OTP
            </label>

            <input
              type="tel"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              onChange={(e) => {
                setOtp(
                  String(
                    e.target.value
                  )
                    .replace(
                      /\D/g,
                      ""
                    )
                    .slice(
                      0,
                      6
                    )
                );

                setError("");
              }}
              placeholder="6 अंकों का OTP"
              style={{
                ...inputStyle,

                textAlign:
                  "center",

                letterSpacing:
                  "7px",

                fontSize:
                  "24px",

                fontWeight:
                  "800",
              }}
            />

            {/* NEW PASSWORD */}

            <label
              style={{
                display:
                  "block",

                marginTop:
                  "20px",

                marginBottom:
                  "9px",

                fontSize:
                  "17px",

                fontWeight:
                  "800",

                color:
                  "#1e293b",
              }}
            >
              🔒 New Password
            </label>

            <div
              style={{
                position:
                  "relative",
              }}
            >
              <input
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                value={
                  newPassword
                }
                onChange={(e) => {
                  setNewPassword(
                    e.target.value
                  );

                  setError("");
                }}
                placeholder="नया Password"
                style={{
                  ...inputStyle,

                  paddingRight:
                    "55px",
                }}
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    (value) =>
                      !value
                  )
                }
                style={{
                  position:
                    "absolute",

                  right:
                    "10px",

                  top:
                    "50%",

                  transform:
                    "translateY(-50%)",

                  border:
                    "none",

                  background:
                    "transparent",

                  cursor:
                    "pointer",

                  fontSize:
                    "21px",
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
                display:
                  "block",

                marginTop:
                  "20px",

                marginBottom:
                  "9px",

                fontSize:
                  "17px",

                fontWeight:
                  "800",

                color:
                  "#1e293b",
              }}
            >
              🔒 Confirm Password
            </label>

            <div
              style={{
                position:
                  "relative",
              }}
            >
              <input
                type={
                  showConfirmPassword
                    ? "text"
                    : "password"
                }
                value={
                  confirmPassword
                }
                onChange={(e) => {
                  setConfirmPassword(
                    e.target.value
                  );

                  setError("");
                }}
                placeholder="Password फिर से डालें"
                style={{
                  ...inputStyle,

                  paddingRight:
                    "55px",
                }}
              />

              <button
                type="button"
                onClick={() =>
                  setShowConfirmPassword(
                    (value) =>
                      !value
                  )
                }
                style={{
                  position:
                    "absolute",

                  right:
                    "10px",

                  top:
                    "50%",

                  transform:
                    "translateY(-50%)",

                  border:
                    "none",

                  background:
                    "transparent",

                  cursor:
                    "pointer",

                  fontSize:
                    "21px",
                }}
              >
                {showConfirmPassword
                  ? "🙈"
                  : "👁️"}
              </button>
            </div>

            {/* PASSWORD RULE */}

            <div
              style={{
                marginTop:
                  "9px",

                color:
                  "#64748b",

                fontSize:
                  "14px",
              }}
            >
              Password कम से कम 6
              characters का होना चाहिए।
            </div>

            {/* ERROR */}

            {error && (
              <div
                style={{
                  marginTop:
                    "16px",

                  padding:
                    "13px 15px",

                  borderRadius:
                    "12px",

                  background:
                    "#fef2f2",

                  border:
                    "1px solid #fecaca",

                  color:
                    "#b91c1c",

                  fontSize:
                    "15px",

                  lineHeight:
                    "1.5",
                }}
              >
                ❌ {error}
              </div>
            )}

            {/* MESSAGE */}

            {message && (
              <div
                style={{
                  marginTop:
                    "16px",

                  padding:
                    "13px 15px",

                  borderRadius:
                    "12px",

                  background:
                    "#ecfdf5",

                  border:
                    "1px solid #a7f3d0",

                  color:
                    "#047857",

                  fontSize:
                    "15px",

                  lineHeight:
                    "1.5",
                }}
              >
                {message}
              </div>
            )}

            {/* RESET */}

            <button
              type="submit"
              disabled={
                loading
              }
              style={{
                ...primaryButtonStyle,

                marginTop:
                  "22px",
              }}
            >
              {loading
                ? "⏳ Password Change हो रहा है..."
                : "🔐 Password Change करें"}
            </button>

            {/* CHANGE MOBILE */}

            <button
              type="button"
              onClick={() => {
                setStep(
                  "mobile"
                );

                setOtp("");
                setError("");
                setMessage("");
              }}
              style={{
                ...secondaryButtonStyle,

                marginTop:
                  "12px",
              }}
            >
              📱 दूसरा Mobile Number डालें
            </button>

          </form>
        )}

        {/* ==================================================
            SUCCESS
        ================================================== */}

        {step ===
          "success" && (
          <div
            style={{
              textAlign:
                "center",
            }}
          >

            <div
              style={{
                width:
                  "90px",

                height:
                  "90px",

                margin:
                  "0 auto 20px",

                borderRadius:
                  "50%",

                background:
                  "#dcfce7",

                display:
                  "flex",

                alignItems:
                  "center",

                justifyContent:
                  "center",

                fontSize:
                  "50px",
              }}
            >
              ✅
            </div>

            <h2
              style={{
                margin:
                  "0 0 12px",

                color:
                  "#166534",

                fontSize:
                  "28px",
              }}
            >
              Password Successfully Changed
            </h2>

            <p
              style={{
                color:
                  "#475569",

                fontSize:
                  "17px",

                lineHeight:
                  "1.6",

                marginBottom:
                  "25px",
              }}
            >
              आपका Exam Test Password
              successfully change हो गया है।
              अब आप नए Password से Login कर
              सकते हैं।
            </p>

            <button
              type="button"
              onClick={() => {
                if (
                  typeof onLogin ===
                  "function"
                ) {
                  onLogin();
                } else {
                  handleStartAgain();
                }
              }}
              style={
                primaryButtonStyle
              }
            >
              🔐 Login करें
            </button>

          </div>
        )}

        {/* ==================================================
            BACK BUTTON
        ================================================== */}

        {step !==
          "success" && (
          <button
            type="button"
            onClick={
              handleBack
            }
            style={{
              ...secondaryButtonStyle,

              marginTop:
                "16px",
            }}
          >
            ← Login पर वापस जाएँ
          </button>
        )}

        {/* ==================================================
            FOOTER
        ================================================== */}

        <div
          style={{
            marginTop:
              "25px",

            textAlign:
              "center",

            color:
              "#94a3b8",

            fontSize:
              "13px",
          }}
        >
          🔐 Exam Test • Secure Password Reset
        </div>

      </div>
    </div>
  );
}

export default ForgotPassword;
