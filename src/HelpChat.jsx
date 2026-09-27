import React, { useEffect, useState } from "react";

import {
  getApps,
  getApp,
  initializeApp,
} from "firebase/app";

import {
  getDatabase,
  ref,
  push,
  onValue,
  query,
  orderByChild,
} from "firebase/database";

import firebaseConfig from "./firebase-config.json";

// ======================================================
// FIREBASE INITIALIZATION
// ======================================================

const firebaseApp = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

const db = getDatabase(firebaseApp);

// ======================================================
// HELP CHAT
// ======================================================

function HelpChat({
  student = null,
  user = null,
  onClose = null,
}) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);

  // ----------------------------------------------------
  // STUDENT INFORMATION
  // ----------------------------------------------------

  const studentData = student || user || {};

  const studentName =
    studentData?.name ||
    studentData?.displayName ||
    studentData?.username ||
    "Student";

  const studentMobile =
    studentData?.mobile ||
    studentData?.phone ||
    studentData?.phoneNumber ||
    "";

  const studentEmail =
    studentData?.email ||
    "";

  const uid =
    studentData?.uid ||
    studentData?.id ||
    "";

  // ----------------------------------------------------
  // LOAD OWN MESSAGES
  // ----------------------------------------------------

  useEffect(() => {
    if (!uid && !studentMobile) {
      setMessages([]);
      return;
    }

    const messagesRef = ref(db, "supportMessages");

    const messagesQuery = query(
      messagesRef,
      orderByChild("createdAt")
    );

    const unsubscribe = onValue(
      messagesQuery,
      (snapshot) => {
        const data = snapshot.val();

        if (!data) {
          setMessages([]);
          return;
        }

        const list = Object.entries(data)
          .map(([id, item]) => ({
            id,
            ...item,
          }))
          .filter((item) => {
            if (uid && item.uid === uid) {
              return true;
            }

            if (
              studentMobile &&
              item.mobile === studentMobile
            ) {
              return true;
            }

            return false;
          })
          .sort(
            (a, b) =>
              (a.createdAt || 0) -
              (b.createdAt || 0)
          );

        setMessages(list);
      },
      (error) => {
        console.error(
          "Support messages error:",
          error
        );
      }
    );

    return () => unsubscribe();
  }, [uid, studentMobile]);

  // ----------------------------------------------------
  // SEND MESSAGE
  // ----------------------------------------------------

  const sendMessage = async () => {
    const text = message.trim();

    if (!text) {
      return;
    }

    if (!uid && !studentMobile) {
      alert(
        "Student information नहीं मिली। कृपया पहले login करें।"
      );
      return;
    }

    try {
      setSending(true);

      const messagesRef = ref(db, "supportMessages");

      await push(messagesRef, {
        uid: uid || "",
        name: studentName,
        mobile: studentMobile,
        email: studentEmail,

        message: text,

        sender: "student",

        status: "new",

        adminReply: "",

        createdAt: Date.now(),

        updatedAt: Date.now(),
      });

      setMessage("");

    } catch (error) {
      console.error(
        "Message send error:",
        error
      );

      alert(
        "Message भेजने में समस्या हुई। कृपया दोबारा कोशिश करें।"
      );
    } finally {
      setSending(false);
    }
  };

  // ----------------------------------------------------
  // ENTER TO SEND
  // ----------------------------------------------------

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ----------------------------------------------------
  // FORMAT TIME
  // ----------------------------------------------------

  const formatTime = (timestamp) => {
    if (!timestamp) return "";

    try {
      return new Date(timestamp).toLocaleString(
        "hi-IN",
        {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }
      );
    } catch {
      return "";
    }
  };

  // ----------------------------------------------------
  // UI
  // ----------------------------------------------------

  return (
    <div
      style={{
        position: "fixed",
        right: "18px",
        bottom: "18px",
        width: "360px",
        maxWidth: "calc(100vw - 36px)",
        height: "520px",
        maxHeight: "calc(100vh - 36px)",
        background: "#ffffff",
        borderRadius: "18px",
        boxShadow:
          "0 10px 40px rgba(0,0,0,0.20)",
        overflow: "hidden",
        zIndex: 99999,
        display: "flex",
        flexDirection: "column",
        border: "1px solid #e5e7eb",
      }}
    >
      {/* ==================================================
          HEADER
      ================================================== */}

      <div
        style={{
          background:
            "linear-gradient(135deg, #2563eb, #1d4ed8)",
          color: "#ffffff",
          padding: "15px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "17px",
              fontWeight: "700",
            }}
          >
            💬 Help & Support
          </div>

          <div
            style={{
              fontSize: "12px",
              opacity: 0.9,
              marginTop: "3px",
            }}
          >
            अपनी समस्या हमें बताएं
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "rgba(255,255,255,0.18)",
              color: "#ffffff",
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              cursor: "pointer",
              fontSize: "18px",
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* ==================================================
          STUDENT INFO
      ================================================== */}

      <div
        style={{
          padding: "9px 14px",
          background: "#eff6ff",
          borderBottom: "1px solid #dbeafe",
          fontSize: "12px",
          color: "#1e3a8a",
        }}
      >
        👤 {studentName}

        {studentMobile && (
          <>
            {" • "}
            📱 {studentMobile}
          </>
        )}
      </div>

      {/* ==================================================
          MESSAGE AREA
      ================================================== */}

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "14px",
          background: "#f8fafc",
        }}
      >
        {messages.length === 0 ? (
          <div
            style={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              color: "#64748b",
              padding: "20px",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "38px",
                  marginBottom: "10px",
                }}
              >
                💬
              </div>

              <div
                style={{
                  fontWeight: "600",
                  marginBottom: "5px",
                }}
              >
                कोई संदेश नहीं है
              </div>

              <div
                style={{
                  fontSize: "12px",
                }}
              >
                अपनी समस्या नीचे लिखकर भेजें।
              </div>
            </div>
          </div>
        ) : (
          messages.map((item) => (
            <div key={item.id}>
              {/* STUDENT MESSAGE */}

              {item.message && (
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "flex-end",
                    marginBottom: "10px",
                  }}
                >
                  <div
                    style={{
                      maxWidth: "82%",
                      background: "#2563eb",
                      color: "#ffffff",
                      borderRadius:
                        "14px 14px 3px 14px",
                      padding:
                        "9px 11px",
                      fontSize: "14px",
                    }}
                  >
                    <div>
                      {item.message}
                    </div>

                    <div
                      style={{
                        fontSize: "10px",
                        opacity: 0.8,
                        marginTop: "5px",
                        textAlign: "right",
                      }}
                    >
                      {formatTime(
                        item.createdAt
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ADMIN REPLY */}

              {item.adminReply && (
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "flex-start",
                    marginBottom: "10px",
                  }}
                >
                  <div
                    style={{
                      maxWidth: "82%",
                      background: "#ffffff",
                      color: "#1e293b",
                      border:
                        "1px solid #e2e8f0",
                      borderRadius:
                        "14px 14px 14px 3px",
                      padding:
                        "9px 11px",
                      fontSize: "14px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#2563eb",
                        fontWeight: "700",
                        marginBottom: "3px",
                      }}
                    >
                      👨‍💼 Admin
                    </div>

                    <div>
                      {item.adminReply}
                    </div>

                    <div
                      style={{
                        fontSize: "10px",
                        color: "#94a3b8",
                        marginTop: "5px",
                      }}
                    >
                      {formatTime(
                        item.updatedAt ||
                          item.createdAt
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* ==================================================
          INPUT AREA
      ================================================== */}

      <div
        style={{
          padding: "10px",
          background: "#ffffff",
          borderTop: "1px solid #e5e7eb",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: "8px",
          }}
        >
          <textarea
            value={message}
            onChange={(e) =>
              setMessage(e.target.value)
            }
            onKeyDown={handleKeyDown}
            placeholder="अपनी समस्या यहाँ लिखें..."
            rows={2}
            disabled={sending}
            style={{
              flex: 1,
              resize: "none",
              border:
                "1px solid #cbd5e1",
              borderRadius: "12px",
              padding: "10px",
              outline: "none",
              fontSize: "14px",
              fontFamily:
                "inherit",
              boxSizing: "border-box",
            }}
          />

          <button
            onClick={sendMessage}
            disabled={
              sending ||
              !message.trim()
            }
            style={{
              width: "48px",
              height: "44px",
              border: "none",
              borderRadius: "12px",
              background:
                sending ||
                !message.trim()
                  ? "#94a3b8"
                  : "#2563eb",
              color: "#ffffff",
              cursor:
                sending ||
                !message.trim()
                  ? "not-allowed"
                  : "pointer",
              fontSize: "20px",
              flexShrink: 0,
            }}
          >
            {sending ? "…" : "➤"}
          </button>
        </div>

        <div
          style={{
            fontSize: "10px",
            color: "#94a3b8",
            marginTop: "5px",
            textAlign: "center",
          }}
        >
          Enter दबाकर भी message भेज सकते हैं
        </div>
      </div>
    </div>
  );
}

export default HelpChat;
