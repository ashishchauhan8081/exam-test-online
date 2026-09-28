import React, { useEffect, useState } from "react";

import {
  getApps,
  getApp,
  initializeApp,
} from "firebase/app";

import {
  getDatabase,
  ref,
  onValue,
  set,
  update,
} from "firebase/database";

import firebaseConfig from "../firebase-config.json";

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

const db = getDatabase(firebaseApp);

/* ======================================================
   HELPERS
====================================================== */

function normalizeMobile(value) {
  return String(value || "")
    .replace(/\D/g, "")
    .slice(-10);
}

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function formatDate(value) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
}

/* ======================================================
   COMPONENT
====================================================== */

export default function PasswordResetAdmin() {
  const [requests, setRequests] = useState({});
  const [loading, setLoading] = useState(true);

  const [mobile, setMobile] = useState("");
  const [manualOtp, setManualOtp] = useState("");

  const [selectedRequest, setSelectedRequest] = useState(null);

  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);

  const [message, setMessage] = useState("");

  /* ====================================================
     LOAD RESET REQUESTS
  ==================================================== */

  useEffect(() => {
    const requestsRef = ref(db, "passwordResetRequests");

    const unsubscribe = onValue(
      requestsRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setRequests(snapshot.val() || {});
        } else {
          setRequests({});
        }

        setLoading(false);
      },
      (error) => {
        console.error("Password reset requests:", error);

        setMessage(
          "❌ Firebase से password reset requests पढ़ने में समस्या हुई।"
        );

        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  /* ====================================================
     REQUEST LIST
  ==================================================== */

  const requestList = Object.entries(requests)
    .map(([id, data]) => ({
      id,
      ...data,
    }))
    .sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();

      return timeB - timeA;
    });

  /* ====================================================
     GENERATE OTP
  ==================================================== */

  const generateForRequest = async (request) => {
    if (!request?.mobile) {
      alert("Mobile Number नहीं मिला।");
      return;
    }

    const cleanMobile = normalizeMobile(request.mobile);

    if (!/^\d{10}$/.test(cleanMobile)) {
      alert("Invalid Mobile Number।");
      return;
    }

    try {
      setGenerating(true);
      setMessage("");

      const otp = generateOTP();

      const requestRef = ref(
        db,
        `passwordResetRequests/${request.id}`
      );

      await update(requestRef, {
        mobile: cleanMobile,
        otp,
        otpGeneratedAt: new Date().toISOString(),
        otpStatus: "generated",
        status: "otp-generated",
      });

      setMobile(cleanMobile);
      setManualOtp(otp);
      setSelectedRequest({
        ...request,
        mobile: cleanMobile,
        otp,
      });

      setMessage(
        `✅ OTP generate हो गया: ${otp}`
      );

      alert(
        `✅ OTP Generate हो गया\n\nMobile: ${cleanMobile}\nOTP: ${otp}`
      );
    } catch (error) {
      console.error("Generate OTP:", error);

      alert(
        "❌ OTP Generate नहीं हुआ:\n" +
          error.message
      );
    } finally {
      setGenerating(false);
    }
  };

  /* ====================================================
     SEND OTP TO WHATSAPP
  ==================================================== */

  const sendOTPWhatsApp = async () => {
    const cleanMobile = normalizeMobile(mobile);

    if (!/^\d{10}$/.test(cleanMobile)) {
      alert("कृपया 10 अंकों का Mobile Number डालें।");
      return;
    }

    if (!/^\d{6}$/.test(manualOtp)) {
      alert("6 अंकों का OTP होना चाहिए।");
      return;
    }

    try {
      setSending(true);
      setMessage("");

      const response = await fetch(
        "/api/password-reset",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "sendOtp",
            mobile: cleanMobile,
            otp: manualOtp,
          }),
        }
      );

      const text = await response.text();

      let data = {};

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          "Password Reset API ने JSON response नहीं दिया। Vercel में api/password-reset.js check करें।"
        );
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
            data.error ||
            "OTP भेजने में समस्या हुई।"
        );
      }

      if (selectedRequest?.id) {
        await update(
          ref(
            db,
            `passwordResetRequests/${selectedRequest.id}`
          ),
          {
            otp: manualOtp,
            otpSentAt: new Date().toISOString(),
            otpStatus: "sent",
            status: "otp-sent",
          }
        );
      }

      setMessage(
        `✅ OTP ${cleanMobile} पर WhatsApp भेजने की request सफल हुई।`
      );

      alert(
        data.message ||
          "✅ OTP WhatsApp पर भेज दिया गया।"
      );
    } catch (error) {
      console.error("Send OTP:", error);

      alert(
        "❌ WhatsApp OTP Error:\n" +
          error.message
      );
    } finally {
      setSending(false);
    }
  };

  /* ====================================================
     MANUAL OTP SAVE
  ==================================================== */

  const saveManualOTP = async () => {
    const cleanMobile = normalizeMobile(mobile);

    if (!/^\d{10}$/.test(cleanMobile)) {
      alert("कृपया सही Mobile Number डालें।");
      return;
    }

    if (!/^\d{6}$/.test(manualOtp)) {
      alert("OTP 6 अंकों का होना चाहिए।");
      return;
    }

    try {
      setGenerating(true);

      let requestId = selectedRequest?.id;

      if (!requestId) {
        requestId = `${cleanMobile}_${Date.now()}`;
      }

      await set(
        ref(
          db,
          `passwordResetRequests/${requestId}`
        ),
        {
          mobile: cleanMobile,
          otp: manualOtp,
          otpGeneratedAt:
            new Date().toISOString(),
          otpStatus: "generated",
          status: "otp-generated",
        }
      );

      setSelectedRequest({
        id: requestId,
        mobile: cleanMobile,
        otp: manualOtp,
      });

      setMessage(
        "✅ OTP Firebase में save हो गया।"
      );

      alert("✅ OTP successfully save हो गया।");
    } catch (error) {
      console.error(error);

      alert(
        "❌ OTP save नहीं हुआ:\n" +
          error.message
      );
    } finally {
      setGenerating(false);
    }
  };

  /* ====================================================
     SELECT REQUEST
  ==================================================== */

  const selectRequest = (request) => {
    setSelectedRequest(request);

    setMobile(
      normalizeMobile(request.mobile)
    );

    setManualOtp(request.otp || "");

    setMessage("");
  };

  /* ====================================================
     CLEAR FORM
  ==================================================== */

  const clearForm = () => {
    setSelectedRequest(null);
    setMobile("");
    setManualOtp("");
    setMessage("");
  };

  /* ====================================================
     UI
  ==================================================== */

  return (
    <div
      style={{
        maxWidth: "1100px",
        margin: "0 auto",
        padding: "20px",
        fontFamily:
          "Arial, Helvetica, sans-serif",
      }}
    >
      {/* HEADER */}

      <div
        style={{
          background:
            "linear-gradient(135deg,#1d4ed8,#2563eb)",
          color: "#fff",
          borderRadius: "18px",
          padding: "24px",
          marginBottom: "20px",
          boxShadow:
            "0 8px 25px rgba(0,0,0,.15)",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: "28px",
          }}
        >
          🔑 Password Reset Admin
        </h1>

        <p
          style={{
            margin: "8px 0 0",
            opacity: 0.95,
          }}
        >
          Exam Test — Mobile OTP Password Reset
        </p>
      </div>

      {/* MESSAGE */}

      {message && (
        <div
          style={{
            background: "#ecfdf5",
            color: "#065f46",
            border:
              "1px solid #a7f3d0",
            borderRadius: "12px",
            padding: "12px 15px",
            marginBottom: "18px",
            fontWeight: "600",
          }}
        >
          {message}
        </div>
      )}

      {/* MANUAL OTP PANEL */}

      <div
        style={{
          background: "#fff",
          borderRadius: "16px",
          padding: "20px",
          marginBottom: "25px",
          boxShadow:
            "0 4px 15px rgba(0,0,0,.08)",
          border:
            "1px solid #e5e7eb",
        }}
      >
        <h2
          style={{
            marginTop: 0,
            color: "#111827",
          }}
        >
          📲 OTP Generate / Send
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit,minmax(220px,1fr))",
            gap: "15px",
          }}
        >
          {/* MOBILE */}

          <div>
            <label
              style={{
                display: "block",
                fontWeight: "700",
                marginBottom: "7px",
              }}
            >
              📱 Mobile Number
            </label>

            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={mobile}
              placeholder="10 digit mobile"
              onChange={(e) =>
                setMobile(
                  e.target.value
                    .replace(/\D/g, "")
                    .slice(0, 10)
                )
              }
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "13px",
                border:
                  "1px solid #d1d5db",
                borderRadius: "10px",
                fontSize: "16px",
              }}
            />
          </div>

          {/* OTP */}

          <div>
            <label
              style={{
                display: "block",
                fontWeight: "700",
                marginBottom: "7px",
              }}
            >
              🔢 OTP
            </label>

            <input
              type="tel"
              inputMode="numeric"
              maxLength={6}
              value={manualOtp}
              placeholder="6 digit OTP"
              onChange={(e) =>
                setManualOtp(
                  e.target.value
                    .replace(/\D/g, "")
                    .slice(0, 6)
                )
              }
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "13px",
                border:
                  "1px solid #d1d5db",
                borderRadius: "10px",
                fontSize: "18px",
                letterSpacing: "4px",
              }}
            />
          </div>
        </div>

        {/* BUTTONS */}

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "10px",
            marginTop: "18px",
          }}
        >
          <button
            onClick={() => {
              const cleanMobile =
                normalizeMobile(mobile);

              if (
                !/^\d{10}$/.test(
                  cleanMobile
                )
              ) {
                alert(
                  "कृपया 10 अंकों का Mobile Number डालें।"
                );
                return;
              }

              const otp =
                generateOTP();

              setManualOtp(otp);

              setMessage(
                `OTP Generate हुआ: ${otp}`
              );
            }}
            disabled={generating}
            style={buttonStyle(
              "#2563eb"
            )}
          >
            🎲 Generate OTP
          </button>

          <button
            onClick={saveManualOTP}
            disabled={generating}
            style={buttonStyle(
              "#059669"
            )}
          >
            💾 Save OTP
          </button>

          <button
            onClick={sendOTPWhatsApp}
            disabled={sending}
            style={buttonStyle(
              "#16a34a"
            )}
          >
            {sending
              ? "⏳ Sending..."
              : "📲 WhatsApp पर भेजें"}
          </button>

          <button
            onClick={clearForm}
            style={buttonStyle(
              "#6b7280"
            )}
          >
            ✖ Clear
          </button>
        </div>
      </div>

      {/* REQUEST LIST */}

      <div
        style={{
          background: "#fff",
          borderRadius: "16px",
          padding: "20px",
          boxShadow:
            "0 4px 15px rgba(0,0,0,.08)",
          border:
            "1px solid #e5e7eb",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap",
            marginBottom: "15px",
          }}
        >
          <h2
            style={{
              margin: 0,
            }}
          >
            📋 Password Reset Requests
          </h2>

          <span
            style={{
              background: "#eff6ff",
              color: "#1d4ed8",
              padding:
                "7px 12px",
              borderRadius: "20px",
              fontWeight: "700",
            }}
          >
            {requestList.length} Requests
          </span>
        </div>

        {loading ? (
          <div
            style={{
              padding: "30px",
              textAlign: "center",
            }}
          >
            ⏳ Requests loading...
          </div>
        ) : requestList.length === 0 ? (
          <div
            style={{
              padding: "35px 15px",
              textAlign: "center",
              color: "#6b7280",
            }}
          >
            <div
              style={{
                fontSize: "45px",
              }}
            >
              📭
            </div>

            <p>
              अभी कोई Password Reset
              Request नहीं है।
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: "12px",
            }}
          >
            {requestList.map(
              (request) => {
                const active =
                  selectedRequest?.id ===
                  request.id;

                return (
                  <div
                    key={request.id}
                    style={{
                      border:
                        active
                          ? "2px solid #2563eb"
                          : "1px solid #e5e7eb",
                      borderRadius:
                        "14px",
                      padding: "15px",
                      background:
                        active
                          ? "#eff6ff"
                          : "#fafafa",
                    }}
                  >
                    <div
                      style={{
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                        gap: "12px",
                        flexWrap:
                          "wrap",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize:
                              "18px",
                            fontWeight:
                              "700",
                          }}
                        >
                          📱{" "}
                          {normalizeMobile(
                            request.mobile
                          )}
                        </div>

                        <div
                          style={{
                            marginTop:
                              "6px",
                            color:
                              "#6b7280",
                            fontSize:
                              "14px",
                          }}
                        >
                          🕒{" "}
                          {formatDate(
                            request.createdAt
                          )}
                        </div>

                        {request.status && (
                          <div
                            style={{
                              marginTop:
                                "6px",
                              fontSize:
                                "14px",
                            }}
                          >
                            Status:{" "}
                            <strong>
                              {
                                request.status
                              }
                            </strong>
                          </div>
                        )}

                        {request.otp && (
                          <div
                            style={{
                              marginTop:
                                "8px",
                              fontWeight:
                                "700",
                              color:
                                "#7c3aed",
                            }}
                          >
                            🔢 OTP:{" "}
                            {
                              request.otp
                            }
                          </div>
                        )}
                      </div>

                      <div
                        style={{
                          display:
                            "flex",
                          gap: "8px",
                          flexWrap:
                            "wrap",
                          alignItems:
                            "center",
                        }}
                      >
                        <button
                          onClick={() =>
                            selectRequest(
                              request
                            )
                          }
                          style={buttonStyle(
                            "#4b5563"
                          )}
                        >
                          👁️ Open
                        </button>

                        <button
                          onClick={() =>
                            generateForRequest(
                              request
                            )
                          }
                          disabled={
                            generating
                          }
                          style={buttonStyle(
                            "#2563eb"
                          )}
                        >
                          🔢 Generate OTP
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

      {/* IMPORTANT INFO */}

      <div
        style={{
          marginTop: "20px",
          background: "#fff7ed",
          border:
            "1px solid #fed7aa",
          color: "#9a3412",
          borderRadius: "14px",
          padding: "15px",
          lineHeight: "1.6",
        }}
      >
        <strong>
          ⚠️ जरूरी:
        </strong>
        <br />
        WhatsApp OTP भेजने के लिए
        Vercel में{" "}
        <code>
          /api/password-reset
        </code>{" "}
        API का{" "}
        <code>sendOtp</code>{" "}
        action मौजूद होना चाहिए।
      </div>
    </div>
  );
}

/* ======================================================
   BUTTON STYLE
====================================================== */

function buttonStyle(background) {
  return {
    background,
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    padding: "11px 15px",
    fontSize: "15px",
    fontWeight: "700",
    cursor: "pointer",
  };
}
