import React, { useEffect, useState } from "react";
import "./AdminPanel.css";

function normalizeMobile(value) {
  return String(value || "")
    .replace(/\D/g, "")
    .slice(-10);
}

export default function PasswordResetAdmin() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(null);

  const [message, setMessage] = useState("");

  // =====================================================
  // LOAD PASSWORD RESET REQUESTS
  // =====================================================
  const loadRequests = async () => {
    try {
      setLoading(true);
      setMessage("");

      const response = await fetch("/api/password-reset?action=list", {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      const text = await response.text();

      let data;

      try {
        data = JSON.parse(text);
      } catch (jsonError) {
        console.error("Invalid JSON:", text);

        throw new Error(
          "API से JSON response नहीं मिला। Vercel पर /api/password-reset.js check करें।"
        );
      }

      if (!response.ok) {
        throw new Error(
          data.message || "Password reset requests load नहीं हुईं।"
        );
      }

      setRequests(Array.isArray(data.requests) ? data.requests : []);
    } catch (error) {
      console.error("Load requests:", error);
      setMessage("❌ " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // GENERATE OTP
  // =====================================================
  const generateOtp = async (request) => {
    const mobile = normalizeMobile(request.mobile);

    if (!/^\d{10}$/.test(mobile)) {
      alert("Invalid mobile number");
      return;
    }

    try {
      setGenerating(request.id || mobile);
      setMessage("");

      const response = await fetch("/api/password-reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          action: "generate",
          mobile,
        }),
      });

      const text = await response.text();

      let data;

      try {
        data = JSON.parse(text);
      } catch (jsonError) {
        console.error("Invalid JSON:", text);

        throw new Error(
          "API JSON नहीं भेज रही है। Vercel में /api/password-reset.js मौजूद है या नहीं देखें।"
        );
      }

      if (!response.ok) {
        throw new Error(data.message || "OTP generate नहीं हुआ।");
      }

      if (data.otp) {
        alert(
          `✅ OTP Generate हो गया\n\nMobile: ${mobile}\nOTP: ${data.otp}\n\nइस OTP को User को WhatsApp पर भेजें।`
        );
      } else {
        alert(
          "✅ OTP Generate हो गया।\n" +
            (data.message || "OTP भेजने की प्रक्रिया पूरी हुई।")
        );
      }

      await loadRequests();
    } catch (error) {
      console.error("Generate OTP:", error);
      alert("❌ " + error.message);
    } finally {
      setGenerating(null);
    }
  };

  // =====================================================
  // SEND OTP / WHATSAPP
  // =====================================================
  const sendOtpWhatsApp = async (request) => {
    const mobile = normalizeMobile(request.mobile);

    if (!/^\d{10}$/.test(mobile)) {
      alert("Invalid mobile number");
      return;
    }

    const otp = request.otp;

    if (!otp) {
      alert("पहले Generate OTP करें।");
      return;
    }

    try {
      setGenerating(`send-${request.id || mobile}`);

      const response = await fetch("/api/password-reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          action: "send-whatsapp",
          mobile,
          otp,
        }),
      });

      const text = await response.text();

      let data;

      try {
        data = JSON.parse(text);
      } catch (jsonError) {
        console.error("Invalid JSON:", text);

        throw new Error(
          "WhatsApp API का JSON response नहीं मिला।"
        );
      }

      if (!response.ok) {
        throw new Error(
          data.message || "WhatsApp OTP भेजा नहीं जा सका।"
        );
      }

      alert(
        "✅ OTP WhatsApp भेजने की request सफल हुई।"
      );

      await loadRequests();
    } catch (error) {
      console.error("WhatsApp:", error);
      alert("❌ " + error.message);
    } finally {
      setGenerating(null);
    }
  };

  // =====================================================
  // DELETE / CLEAR REQUEST
  // =====================================================
  const clearRequest = async (request) => {
    const mobile = normalizeMobile(request.mobile);

    if (!mobile) return;

    const confirmDelete = window.confirm(
      `क्या आप ${mobile} की password reset request हटाना चाहते हैं?`
    );

    if (!confirmDelete) return;

    try {
      const response = await fetch("/api/password-reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          action: "clear",
          mobile,
        }),
      });

      const text = await response.text();

      let data;

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          "API ने valid JSON response नहीं दिया।"
        );
      }

      if (!response.ok) {
        throw new Error(
          data.message || "Request delete नहीं हुई।"
        );
      }

      await loadRequests();
    } catch (error) {
      console.error("Clear request:", error);
      alert("❌ " + error.message);
    }
  };

  // =====================================================
  // LOAD ON OPEN
  // =====================================================
  useEffect(() => {
    loadRequests();
  }, []);

  // =====================================================
  // UI
  // =====================================================
  return (
    <div
      style={{
        maxWidth: "1100px",
        margin: "20px auto",
        padding: "20px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "10px",
          flexWrap: "wrap",
          marginBottom: "20px",
        }}
      >
        <div>
          <h1 style={{ marginBottom: "5px" }}>
            🔑 Password Reset Admin
          </h1>

          <p style={{ marginTop: 0 }}>
            User के Forgot Password requests यहाँ दिखाई देंगी।
          </p>
        </div>

        <button
          onClick={loadRequests}
          disabled={loading}
          style={{
            padding: "10px 18px",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
          }}
        >
          {loading ? "⏳ Loading..." : "🔄 Refresh"}
        </button>
      </div>

      {message && (
        <div
          style={{
            background: "#fee2e2",
            color: "#991b1b",
            padding: "14px",
            borderRadius: "10px",
            marginBottom: "20px",
          }}
        >
          {message}
        </div>
      )}

      {loading ? (
        <div
          style={{
            textAlign: "center",
            padding: "40px",
          }}
        >
          ⏳ Requests load हो रही हैं...
        </div>
      ) : requests.length === 0 ? (
        <div
          style={{
            background: "#f8fafc",
            borderRadius: "12px",
            padding: "40px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "45px" }}>📭</div>

          <h3>कोई Password Reset Request नहीं है</h3>

          <p>
            जब कोई User Forgot Password करेगा,
            request यहाँ दिखाई देगी।
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gap: "15px",
          }}
        >
          {requests.map((request, index) => {
            const mobile = normalizeMobile(request.mobile);

            const requestId =
              request.id || request.uid || mobile || index;

            const isGenerating =
              generating === requestId;

            const isSending =
              generating === `send-${requestId}`;

            return (
              <div
                key={requestId}
                style={{
                  background: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "14px",
                  padding: "18px",
                  boxShadow:
                    "0 3px 12px rgba(0,0,0,0.08)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "15px",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <h3 style={{ margin: "0 0 8px" }}>
                      📱 {mobile}
                    </h3>

                    {request.name && (
                      <p style={{ margin: "4px 0" }}>
                        👤 <strong>{request.name}</strong>
                      </p>
                    )}

                    {request.createdAt && (
                      <p
                        style={{
                          margin: "4px 0",
                          color: "#64748b",
                        }}
                      >
                        🕐{" "}
                        {new Date(
                          request.createdAt
                        ).toLocaleString("hi-IN")}
                      </p>
                    )}

                    {request.otp && (
                      <p
                        style={{
                          margin: "10px 0",
                          fontSize: "20px",
                          fontWeight: "bold",
                          letterSpacing: "4px",
                        }}
                      >
                        🔢 OTP: {request.otp}
                      </p>
                    )}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <button
                      onClick={() =>
                        generateOtp({
                          ...request,
                          id: requestId,
                        })
                      }
                      disabled={isGenerating}
                      style={{
                        padding: "10px 14px",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                      }}
                    >
                      {isGenerating
                        ? "⏳ Generating..."
                        : "🔢 Generate OTP"}
                    </button>

                    {request.otp && (
                      <button
                        onClick={() =>
                          sendOtpWhatsApp({
                            ...request,
                            id: requestId,
                          })
                        }
                        disabled={isSending}
                        style={{
                          padding: "10px 14px",
                          border: "none",
                          borderRadius: "8px",
                          cursor: "pointer",
                        }}
                      >
                        {isSending
                          ? "⏳ Sending..."
                          : "📲 WhatsApp भेजें"}
                      </button>
                    )}

                    <button
                      onClick={() =>
                        clearRequest({
                          ...request,
                          id: requestId,
                        })
                      }
                      style={{
                        padding: "10px 14px",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                      }}
                    >
                      🗑️ Clear
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div
        style={{
          marginTop: "25px",
          padding: "15px",
          background: "#eff6ff",
          borderRadius: "10px",
          color: "#1e3a8a",
        }}
      >
        <strong>ℹ️ जरूरी:</strong>

        <p style={{ marginBottom: 0 }}>
          यह Admin Panel `/api/password-reset` API पर निर्भर करता है।
          अगर Vercel पर यह API मौजूद नहीं है, तो
          <b> Unexpected token '&lt;' </b>
          वाला error आएगा।
        </p>
      </div>
    </div>
  );
}
