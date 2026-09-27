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
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
} from "firebase/auth";

import {
  getDatabase,
  ref,
  onValue,
} from "firebase/database";

import firebaseConfig from "./firebase-config.json";

// ======================================================
// ADMIN PANEL
// ======================================================

import AdminPanel from "./components/AdminPanel";

// ======================================================
// AI MCQ GENERATOR
// ======================================================

import AIMCQGenerator from "./components/AIMCQGenerator";
import CurrentAffairs from "./pages/CurrentAffairs";
import ForgotPassword from "./pages/forgot-password";


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

const googleProvider =
  new GoogleAuthProvider();

const db = getDatabase(firebaseApp);

// ======================================================
// ADMIN
// ======================================================

const ADMIN_EMAIL =
  "cciashish@gmail.com";

// ======================================================
// EXAMS
// ======================================================

const exams = [
  {
    id: "upsc",
    name: "UPSC",
    icon: "🇮🇳",
    color: "#fee2e2",
    description:
      "UPSC Civil Services परीक्षा स्तर",
  },

  {
    id: "uppcs",
    name: "UPPCS",
    icon: "🏛️",
    color: "#fef3c7",
    description:
      "UPPCS परीक्षा स्तर",
  },

  {
    id: "uppet",
    name: "UP PET",
    icon: "🎯",
    color: "#dcfce7",
    description:
      "UP PET परीक्षा स्तर",
  },

  {
    id: "bpsc",
    name: "BPSC",
    icon: "🏛️",
    color: "#ede9fe",
    description:
      "BPSC परीक्षा स्तर",
  },

  {
    id: "mppsc",
    name: "MPPSC",
    icon: "📚",
    color: "#dbeafe",
    description:
      "MPPSC परीक्षा स्तर",
  },

  {
    id: "ssc",
    name: "SSC",
    icon: "📝",
    color: "#fce7f3",
    description:
      "SSC परीक्षा स्तर",
  },

  {
    id: "railway",
    name: "Railway",
    icon: "🚆",
    color: "#e0f2fe",
    description:
      "Railway / RRB परीक्षा स्तर",
  },

  {
    id: "banking",
    name: "Banking",
    icon: "🏦",
    color: "#dcfce7",
    description:
      "Banking परीक्षा स्तर",
  },

  {
    id: "upsssc",
    name: "UPSSSC",
    icon: "📖",
    color: "#f3e8ff",
    description:
      "UPSSSC परीक्षा स्तर",
  },

  {
    id: "roaro",
    name: "RO/ARO",
    icon: "📜",
    color: "#fef3c7",
    description:
      "RO / ARO परीक्षा स्तर",
  },

  {
    id: "police",
    name: "Police",
    icon: "👮",
    color: "#fee2e2",
    description:
      "Police परीक्षा स्तर",
  },

  {
    id: "teaching",
    name: "Teaching",
    icon: "👨‍🏫",
    color: "#dbeafe",
    description:
      "Teaching परीक्षा स्तर",
  },
];

// ======================================================
// DEFAULT RESOURCES
// ======================================================

const defaultResources = [
  {
    id: "1",
    icon: "📚",
    title: "NCERT Books",
    text:
      "कक्षा 6 से 12 तक की NCERT पुस्तकों का अध्ययन करें।",
    page: "resources",
    enabled: true,
  },

  {
    id: "2",
    icon: "📰",
    title: "Current Affairs",
    text:
      "प्रतिदिन के महत्वपूर्ण Current Affairs पढ़ें।",
    page: "current",
    enabled: true,
  },

  {
    id: "3",
    icon: "📝",
    title: "MCQ Practice",
    text:
      "विषयवार महत्वपूर्ण MCQ का अभ्यास करें।",
    page: "mcq",
    enabled: true,
  },

  {
    id: "4",
    icon: "📖",
    title: "Previous Year Questions",
    text:
      "पिछली परीक्षाओं के प्रश्नों का अभ्यास करें।",
    page: "resources",
    enabled: true,
  },

  {
    id: "5",
    icon: "🎯",
    title: "Test Series",
    text:
      "सभी प्रमुख प्रतियोगी परीक्षाओं की Test Series।",
    page: "tests",
    enabled: true,
  },

  {
    id: "6",
    icon: "🤖",
    title: "AI MCQ Generator",
    text:
      "AI की सहायता से नए MCQ तैयार करें।",
    page: "mcq",
    enabled: true,
  },
];

// ======================================================
// QUESTION NORMALIZER
// ======================================================

function normalizeQuestions(
  questions
) {
  if (!Array.isArray(questions)) {
    return [];
  }

  return questions.map(
    (q, index) => ({
      id:
        q?.id ??
        index + 1,

      question:
        q?.question ??
        q?.questionText ??
        q?.text ??
        "",

      options:
        Array.isArray(
          q?.options
        )
          ? [
              q.options[0] || "",
              q.options[1] || "",
              q.options[2] || "",
              q.options[3] || "",
            ]
          : [
              "",
              "",
              "",
              "",
            ],

      answer:
        q?.answer,

      explanation:
        q?.explanation ??
        "",
    })
  );
}

// ======================================================
// CORRECT ANSWER INDEX
// ======================================================

function getCorrectIndex(
  question
) {
  const options =
    Array.isArray(
      question?.options
    )
      ? question.options
      : [];

  const answer =
    question?.answer;

  if (
    !options.length ||
    answer === undefined ||
    answer === null
  ) {
    return -1;
  }

  if (
    typeof answer ===
      "number" &&
    Number.isInteger(answer)
  ) {
    if (
      answer >= 0 &&
      answer < options.length
    ) {
      return answer;
    }

    if (
      answer >= 1 &&
      answer <= options.length
    ) {
      return answer - 1;
    }
  }

  const raw =
    String(answer).trim();

  if (!raw) {
    return -1;
  }

  if (/^\d+$/.test(raw)) {
    const n =
      Number(raw);

    if (
      n >= 0 &&
      n < options.length
    ) {
      return n;
    }

    if (
      n >= 1 &&
      n <= options.length
    ) {
      return n - 1;
    }
  }

  const letterMatch =
    raw.match(
      /^([ABCD])(?:\s*[.\):-]|\s*$)/i
    );

  if (letterMatch) {
    const idx =
      "ABCD".indexOf(
        letterMatch[1].toUpperCase()
      );

    if (
      idx >= 0 &&
      idx < options.length
    ) {
      return idx;
    }
  }

  const cleaned =
    raw
      .replace(
        /^[ABCD]\s*[.\):-]\s*/i,
        ""
      )
      .trim();

  const exact =
    options.findIndex(
      (option) =>
        String(option ?? "").trim() ===
          raw ||
        String(option ?? "").trim() ===
          cleaned
    );

  if (exact >= 0) {
    return exact;
  }

  const compact = (
    value
  ) =>
    String(value ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

  const loose =
    options.findIndex(
      (option) =>
        compact(option) ===
        compact(cleaned)
    );

  return loose >= 0
    ? loose
    : -1;
}

// ======================================================
// ADMIN LOGIN
// ======================================================

function AdminLogin({
  onSuccess,
  onClose,
}) {
  const [email, setEmail] =
    useState(ADMIN_EMAIL);

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const handleLogin =
    async (e) => {
      e.preventDefault();

      if (
        !email.trim() ||
        !password
      ) {
        alert(
          "Email और Password भरें।"
        );
        return;
      }

      try {
        setLoading(true);

        const result =
          await signInWithEmailAndPassword(
            auth,
            email.trim().toLowerCase(),
            password
          );

        const loggedUser =
          result.user;

        if (
          loggedUser.email?.toLowerCase() !==
          ADMIN_EMAIL.toLowerCase()
        ) {
          await signOut(auth);

          alert(
            "❌ यह Admin Account नहीं है।"
          );

          return;
        }

        alert(
          "✅ Admin Login सफल हुआ।"
        );

        if (onSuccess) {
          onSuccess(
            loggedUser
          );
        }
      } catch (error) {
        console.error(
          "Admin Login Error:",
          error
        );

        if (
          error.code ===
          "auth/invalid-credential"
        ) {
          alert(
            "❌ Email या Password गलत है।"
          );
        } else if (
          error.code ===
          "auth/user-not-found"
        ) {
          alert(
            "❌ Admin account Firebase में नहीं मिला।"
          );
        } else if (
          error.code ===
          "auth/wrong-password"
        ) {
          alert(
            "❌ Admin Password गलत है।"
          );
        } else {
          alert(
            "❌ Admin Login Error:\n" +
              error.message
          );
        }
      } finally {
        setLoading(false);
      }
    };

  return (
    <div
      style={{
        minHeight:
          "100vh",
        display: "flex",
        alignItems:
          "center",
        justifyContent:
          "center",
        padding: "20px",
        background:
          "linear-gradient(135deg,#eef6ff,#ffffff,#f3e8ff)",
        fontFamily:
          "Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "430px",
          background: "#fff",
          borderRadius: "20px",
          padding: "30px",
          boxShadow:
            "0 15px 45px rgba(0,0,0,.15)",
        }}
      >
        <div
          style={{
            textAlign: "center",
            marginBottom: "25px",
          }}
        >
          <div
            style={{
              fontSize: "55px",
            }}
          >
            👑
          </div>

          <h1
            style={{
              margin:
                "10px 0",
              color:
                "#1d4ed8",
            }}
          >
            Admin Login
          </h1>

          <p
            style={{
              color:
                "#64748b",
            }}
          >
            Exam Test
            Admin Panel
          </p>
        </div>

        <form
          onSubmit={handleLogin}
        >
          <label
            style={{
              display:
                "block",
              fontWeight:
                "700",
              marginBottom:
                "7px",
            }}
          >
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
            placeholder="Admin Email"
            style={{
              width: "100%",
              padding:
                "13px",
              border:
                "1px solid #cbd5e1",
              borderRadius:
                "10px",
              fontSize:
                "16px",
              marginBottom:
                "18px",
              boxSizing:
                "border-box",
            }}
          />

          <label
            style={{
              display:
                "block",
              fontWeight:
                "700",
              marginBottom:
                "7px",
            }}
          >
            🔐 Admin Password
          </label>

          <input
            type="password"
            value={password}
            onChange={(e) =>
              setPassword(
                e.target.value
              )
            }
            placeholder="Admin Password"
            style={{
              width: "100%",
              padding:
                "13px",
              border:
                "1px solid #cbd5e1",
              borderRadius:
                "10px",
              fontSize:
                "16px",
              marginBottom:
                "20px",
              boxSizing:
                "border-box",
            }}
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding:
                "14px",
              border: "none",
              borderRadius:
                "10px",
              background:
                "#1d4ed8",
              color: "#fff",
              fontSize:
                "17px",
              fontWeight:
                "700",
              cursor:
                "pointer",
            }}
          >
            {loading
              ? "⏳ Login हो रहा है..."
              : "🔐 Admin Login"}
          </button>
        </form>

        <button
          type="button"
          onClick={onClose}
          style={{
            width: "100%",
            marginTop:
              "12px",
            padding:
              "12px",
            border: "none",
            borderRadius:
              "10px",
            background:
              "#e2e8f0",
            color:
              "#334155",
            fontSize:
              "16px",
            fontWeight:
              "700",
            cursor:
              "pointer",
          }}
        >
          ← Website पर वापस जाएँ
        </button>
      </div>
    </div>
  );
}

// ======================================================
// TEST RUNNER
// ======================================================

function TestRunner({
  test,
  onBack,
}) {
  const questions =
    normalizeQuestions(
      test?.questions || []
    ).slice(0, 150);

  const [current, setCurrent] =
    useState(0);

  const [answers, setAnswers] =
    useState({});

  const [submitted, setSubmitted] =
    useState(false);

  const [reviewMode, setReviewMode] =
    useState(false);

  const [
    showExplanation,
    setShowExplanation,
  ] = useState(false);

  const buttonBase = {
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontFamily:
      "inherit",
    boxSizing:
      "border-box",
  };

  const calculateResult =
    () => {
      let correct = 0;

      questions.forEach(
        (q, index) => {
          const correctIndex =
            getCorrectIndex(q);

          if (
            correctIndex >= 0 &&
            answers[index] ===
              correctIndex
          ) {
            correct++;
          }
        }
      );

      const wrong =
        questions.length -
        correct;

      const percentage =
        questions.length
          ? Math.round(
              (correct /
                questions.length) *
                100
            )
          : 0;

      return {
        correct,
        wrong,
        percentage,
      };
    };

  if (!questions.length) {
    return (
      <div
        style={{
          padding:
            "20px",
        }}
      >
        <button
          type="button"
          onClick={onBack}
          style={{
            ...buttonBase,
            padding:
              "12px 20px",
            background:
              "#e2e8f0",
            color:
              "#111827",
            fontSize:
              "17px",
            fontWeight:
              "700",
          }}
        >
          ← Test List
        </button>

        <div
          style={{
            marginTop:
              "20px",
            background:
              "#fff",
            padding:
              "40px",
            borderRadius:
              "18px",
            textAlign:
              "center",
          }}
        >
          <h2>
            इस Test में Questions
            नहीं हैं।
          </h2>
        </div>
      </div>
    );
  }

  // ====================================================
  // RESULT
  // ====================================================

  if (submitted) {
    const {
      correct,
      wrong,
      percentage,
    } =
      calculateResult();

    return (
      <div
        style={{
          padding:
            "20px",
        }}
      >
        <div
          style={{
            maxWidth:
              "760px",
            margin:
              "30px auto",
            background:
              "#fff",
            borderRadius:
              "18px",
            padding:
              "35px",
            textAlign:
              "center",
            boxShadow:
              "0 10px 35px rgba(0,0,0,.10)",
          }}
        >
          <div
            style={{
              fontSize:
                "52px",
            }}
          >
            🎉
          </div>

          <h1
            style={{
              color:
                "#1d4ed8",
            }}
          >
            Test Complete
          </h1>

          <h2>
            {test?.title ||
              "Test"}
          </h2>

          <div
            style={{
              fontSize:
                "42px",
              fontWeight:
                "800",
              color:
                "#1d4ed8",
              margin:
                "20px 0",
            }}
          >
            {correct} /{" "}
            {questions.length}
          </div>

          <p
            style={{
              fontSize:
                "20px",
            }}
          >
            प्रतिशत:{" "}
            <strong>
              {percentage}%
            </strong>
          </p>

          <div
            style={{
              display:
                "flex",
              justifyContent:
                "center",
              gap:
                "15px",
              flexWrap:
                "wrap",
              margin:
                "25px 0",
            }}
          >
            <div
              style={{
                padding:
                  "15px 25px",
                borderRadius:
                  "12px",
                background:
                  "#dcfce7",
                color:
                  "#166534",
                fontWeight:
                  "800",
              }}
            >
              ✓ सही: {correct}
            </div>

            <div
              style={{
                padding:
                  "15px 25px",
                borderRadius:
                  "12px",
                background:
                  "#fee2e2",
                color:
                  "#991b1b",
                fontWeight:
                  "800",
              }}
            >
              ✗ गलत: {wrong}
            </div>
          </div>

          <div
            style={{
              display:
                "flex",
              justifyContent:
                "center",
              gap:
                "12px",
              flexWrap:
                "wrap",
            }}
          >
            <button
              type="button"
              onClick={() => {
                setCurrent(0);
                setAnswers({});
                setSubmitted(
                  false
                );
                setReviewMode(
                  true
                );
                setShowExplanation(
                  false
                );
              }}
              style={{
                ...buttonBase,
                padding:
                  "13px 20px",
                background:
                  "#1264d8",
                color:
                  "#fff",
                fontSize:
                  "17px",
                fontWeight:
                  "700",
              }}
            >
              🔄 Questions Retest /
              व्याख्या देखें
            </button>

            <button
              type="button"
              onClick={onBack}
              style={{
                ...buttonBase,
                padding:
                  "13px 20px",
                background:
                  "#e2e8f0",
                color:
                  "#111827",
                fontSize:
                  "17px",
                fontWeight:
                  "700",
              }}
            >
              ← Test List
            </button>
          </div>
        </div>
      </div>
    );
  }

  const question =
    questions[current];

  const selected =
    answers[current];

  const hasSelected =
    selected !== undefined;

  const correctAnswer =
    getCorrectIndex(
      question
    );

  const goPrevious =
    () => {
      setCurrent(
        (value) =>
          Math.max(
            0,
            value - 1
          )
      );

      setShowExplanation(
        false
      );
    };

  const goNext = () => {
    if (
      current <
      questions.length - 1
    ) {
      setCurrent(
        (value) =>
          value + 1
      );

      setShowExplanation(
        false
      );
    } else {
      setSubmitted(true);
    }
  };

  const selectOption =
    (index) => {
      if (
        reviewMode &&
        hasSelected
      ) {
        return;
      }

      setAnswers(
        (prev) => ({
          ...prev,
          [current]:
            index,
        })
      );

      if (reviewMode) {
        setShowExplanation(
          true
        );
      } else {
        window.setTimeout(
          () => {
            if (
              current <
              questions.length -
                1
            ) {
              setCurrent(
                (value) =>
                  value + 1
              );
            } else {
              setSubmitted(
                true
              );
            }
          },
          180
        );
      }
    };

  return (
    <div
      style={{
        padding:
          "20px",
        maxWidth:
          "1200px",
        margin:
          "auto",
      }}
    >
      <button
        type="button"
        onClick={onBack}
        style={{
          ...buttonBase,
          padding:
            "12px 20px",
          background:
            "#e2e8f0",
          color:
            "#111827",
          fontSize:
            "17px",
          fontWeight:
            "700",
          marginBottom:
            "20px",
        }}
      >
        ← Test List
      </button>

      <div
        style={{
          background:
            "#fff",
          border:
            "1px solid #dbe3ee",
          borderRadius:
            "18px",
          padding:
            "30px",
        }}
      >
        <div
          style={{
            borderBottom:
              "1px solid #e2e8f0",
            paddingBottom:
              "18px",
            marginBottom:
              "28px",
          }}
        >
          <div
            style={{
              fontSize:
                "22px",
              fontWeight:
                "800",
            }}
          >
            {test?.exam ||
              "UPPCS"}
          </div>

          <div
            style={{
              fontSize:
                "20px",
              fontWeight:
                "700",
              marginTop:
                "5px",
            }}
          >
            {test?.title ||
              "Test"}{" "}
            /{" "}
            {questions.length}
          </div>

          <div
            style={{
              fontSize:
                "18px",
              fontWeight:
                "700",
              marginTop:
                "7px",
              color:
                "#334155",
            }}
          >
            प्रश्न{" "}
            {current + 1} /{" "}
            {questions.length}

            {reviewMode && (
              <span
                style={{
                  marginLeft:
                    "10px",
                  color:
                    "#7c3aed",
                }}
              >
                • Review Mode
              </span>
            )}
          </div>
        </div>

        <div
          style={{
            marginBottom:
              "28px",
          }}
        >
          <h2
            style={{
              fontSize:
                "clamp(20px,3vw,28px)",
              lineHeight:
                "1.6",
            }}
          >
            {current + 1}.{" "}
            {question.question}
          </h2>
        </div>

        <div
          style={{
            display:
              "flex",
            flexDirection:
              "column",
            gap:
              "14px",
          }}
        >
          {(question.options ||
            [])
            .slice(0, 4)
            .map(
              (
                option,
                index
              ) => {
                const isSelected =
                  selected ===
                  index;

                const isCorrect =
                  index ===
                  correctAnswer;

                const isWrong =
                  reviewMode &&
                  isSelected &&
                  !isCorrect;

                let background =
                  "#1264d8";

                if (
                  reviewMode &&
                  hasSelected
                ) {
                  if (
                    isCorrect
                  ) {
                    background =
                      "#16a34a";
                  } else if (
                    isWrong
                  ) {
                    background =
                      "#dc2626";
                  }
                } else if (
                  isSelected
                ) {
                  background =
                    "#2563eb";
                }

                return (
                  <button
                    key={
                      index
                    }
                    type="button"
                    disabled={
                      reviewMode &&
                      hasSelected
                    }
                    onClick={() =>
                      selectOption(
                        index
                      )
                    }
                    style={{
                      ...buttonBase,
                      width:
                        "100%",
                      minHeight:
                        "64px",
                      padding:
                        "16px 20px",
                      background,
                      color:
                        "#fff",
                      textAlign:
                        "left",
                      fontSize:
                        "20px",
                      fontWeight:
                        "700",
                      lineHeight:
                        "1.4",
                      display:
                        "flex",
                      alignItems:
                        "center",
                    }}
                  >
                    <span
                      style={{
                        width:
                          "45px",
                        flex:
                          "0 0 45px",
                      }}
                    >
                      {String.fromCharCode(
                        65 +
                          index
                      )}
                      .
                    </span>

                    <span>
                      {option}
                    </span>
                  </button>
                );
              }
            )}
        </div>

        {reviewMode &&
          showExplanation &&
          hasSelected && (
            <div
              style={{
                marginTop:
                  "20px",
                padding:
                  "18px",
                background:
                  "#eff6ff",
                border:
                  "1px solid #bfdbfe",
                borderRadius:
                  "12px",
              }}
            >
              <div
                style={{
                  fontSize:
                    "19px",
                  fontWeight:
                    "800",
                  marginBottom:
                    "8px",
                }}
              >
                {selected ===
                correctAnswer
                  ? "✓ सही उत्तर"
                  : correctAnswer >=
                    0
                  ? `✗ गलत उत्तर — सही उत्तर: ${String.fromCharCode(
                      65 +
                        correctAnswer
                    )}`
                  : "✗ सही उत्तर उपलब्ध नहीं है"}
              </div>

              <div
                style={{
                  fontSize:
                    "18px",
                  fontWeight:
                    "800",
                  marginBottom:
                    "6px",
                }}
              >
                💡 व्याख्या
              </div>

              <div
                style={{
                  fontSize:
                    "17px",
                  lineHeight:
                    "1.6",
                  whiteSpace:
                    "pre-wrap",
                }}
              >
                {question.explanation ||
                  "इस प्रश्न की व्याख्या Admin Panel में उपलब्ध नहीं है।"}
              </div>
            </div>
          )}

        <div
          style={{
            display:
              "flex",
            justifyContent:
              "space-between",
            alignItems:
              "center",
            gap:
              "12px",
            marginTop:
              "30px",
            flexWrap:
              "wrap",
          }}
        >
          <button
            type="button"
            disabled={
              current === 0
            }
            onClick={
              goPrevious
            }
            style={{
              ...buttonBase,
              padding:
                "13px 22px",
              background:
                current === 0
                  ? "#bfdbfe"
                  : "#1264d8",
              color:
                "#fff",
              fontSize:
                "17px",
              fontWeight:
                "700",
            }}
          >
            ← Previous
          </button>

          {reviewMode ? (
            <button
              type="button"
              disabled={
                !hasSelected
              }
              onClick={
                goNext
              }
              style={{
                ...buttonBase,
                padding:
                  "13px 22px",
                background:
                  hasSelected
                    ? "#1264d8"
                    : "#94a3b8",
                color:
                  "#fff",
                fontSize:
                  "17px",
                fontWeight:
                  "700",
              }}
            >
              {current ===
              questions.length -
                1
                ? "✓ Review Complete"
                : "Next →"}
            </button>
          ) : (
            <div
              style={{
                color:
                  "#64748b",
                fontWeight:
                  "600",
              }}
            >
              विकल्प चुनते ही अगला
              प्रश्न खुलेगा
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ======================================================
// MAIN APP
// ======================================================

export default function App() {
  const [page, setPage] =
    useState("home");

  const [selectedExam, setSelectedExam] =
    useState(null);

  const [selectedTest, setSelectedTest] =
    useState(null);

  const [user, setUser] =
    useState(null);

  const [authLoading, setAuthLoading] =
    useState(true);

  const [cloudTests, setCloudTests] =
    useState({});

  const [siteResources, setSiteResources] =
    useState(
      defaultResources
    );

  const [adminOpen, setAdminOpen] =
    useState(false);

  const [adminLoginOpen, setAdminLoginOpen] =
    useState(false);

  const [forgotPasswordOpen, setForgotPasswordOpen] =
    useState(false);

  // ====================================================
  // AUTH LISTENER
  // ====================================================

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        (currentUser) => {
          setUser(
            currentUser
          );

          setAuthLoading(
            false
          );
        }
      );

    return () =>
      unsubscribe();
  }, []);

  // ====================================================
  // LOAD TESTS
  // ====================================================

  useEffect(() => {
    const testsRef =
      ref(db, "tests");

    const unsubscribe =
      onValue(
        testsRef,
        (snapshot) => {
          setCloudTests(
            snapshot.val() || {}
          );
        },
        (error) => {
          console.error(
            "Firebase Tests Error:",
            error
          );
        }
      );

    return () =>
      unsubscribe();
  }, []);

  // ====================================================
  // LOAD RESOURCES
  // ====================================================

  useEffect(() => {
    const resourcesRef =
      ref(
        db,
        "siteContent/resources"
      );

    const unsubscribe =
      onValue(
        resourcesRef,
        (snapshot) => {
          const value =
            snapshot.val();

          if (
            Array.isArray(
              value
            ) &&
            value.length
          ) {
            setSiteResources(
              value
            );
          } else if (
            value &&
            typeof value ===
              "object"
          ) {
            setSiteResources(
              Object.values(
                value
              )
            );
          } else {
            setSiteResources(
              defaultResources
            );
          }
        },
        () => {
          setSiteResources(
            defaultResources
          );
        }
      );

    return () =>
      unsubscribe();
  }, []);

  // ====================================================
  // VISIBLE RESOURCES
  // ====================================================

  const visibleResources =
    useMemo(
      () =>
        siteResources.filter(
          (item) =>
            item?.enabled !==
            false
        ),
      [siteResources]
    );

  // ====================================================
  // PUBLIC TESTS
  // ====================================================

  const publicTests =
    useMemo(() => {
      const result = {};

      Object.entries(
        cloudTests
      ).forEach(
        ([id, test]) => {
          if (
            test &&
            test.status ===
              "public"
          ) {
            result[id] =
              test;
          }
        }
      );

      return result;
    }, [cloudTests]);

  // ====================================================
  // GOOGLE LOGIN
  // ====================================================

  const login =
    async () => {
      try {
        const result =
          await signInWithPopup(
            auth,
            googleProvider
          );

        return result.user;
      } catch (error) {
        console.error(
          "Google Login Error:",
          error
        );

        if (
          error.code ===
          "auth/requests-from-referer-are-blocked"
        ) {
          alert(
            "❌ Google Login blocked है। Firebase Console में इस website domain को Authorized Domains में add करें।"
          );
        } else {
          alert(
            "Login नहीं हुआ:\n" +
              error.message
          );
        }

        return null;
      }
    };

  // ====================================================
  // LOGOUT
  // ====================================================

  const logout =
    async () => {
      try {
        await signOut(auth);

        setAdminOpen(
          false
        );

        setAdminLoginOpen(
          false
        );

        setForgotPasswordOpen(
          false
        );

        setPage("home");
      } catch (error) {
        console.error(
          error
        );

        alert(
          "Logout error:\n" +
            error.message
        );
      }
    };

  // ====================================================
  // ADMIN OPEN
  // ====================================================

  const openAdmin =
    () => {
      if (
        user?.email?.toLowerCase() ===
        ADMIN_EMAIL.toLowerCase()
      ) {
        setAdminOpen(true);
        return;
      }

      setAdminLoginOpen(
        true
      );
    };

  // ====================================================
  // ADMIN LOGIN SUCCESS
  // ====================================================

  const handleAdminLoginSuccess =
    (loggedUser) => {
      setUser(
        loggedUser
      );

      setAdminLoginOpen(
        false
      );

      setAdminOpen(
        true
      );
    };

  // ====================================================
  // HOME
  // ====================================================

  const goHome =
    () => {
      setPage("home");

      setSelectedExam(
        null
      );

      setSelectedTest(
        null
      );

      setAdminOpen(
        false
      );

      setAdminLoginOpen(
        false
      );

      setForgotPasswordOpen(
        false
      );

      window.scrollTo({
        top: 0,
        behavior:
          "smooth",
      });
    };

  // ====================================================
  // OPEN EXAM
  // ====================================================

  const openExam =
    (exam) => {
      setSelectedExam(
        exam
      );

      setPage("tests");

      setSelectedTest(
        null
      );

      window.scrollTo({
        top: 0,
        behavior:
          "smooth",
      });
    };

  // ====================================================
  // OPEN TEST
  // ====================================================

  const openTest =
    async (test) => {
      // Test object must come from the public Firebase test list.
      if (!test) {
        alert("❌ Test उपलब्ध नहीं है।");
        return;
      }

      // Login is required by the existing TestRunner flow.
      if (!user) {
        const loggedInUser =
          await login();

        if (!loggedInUser) {
          return;
        }
      }

      // Open the exact Firebase test object in TestRunner.
      setSelectedTest(test);
      setPage("test");

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    };

  // ====================================================
  // AUTH LOADING
  // ====================================================

  if (authLoading) {
    return (
      <div
        style={{
          minHeight:
            "100vh",
          display:
            "flex",
          justifyContent:
            "center",
          alignItems:
            "center",
          background:
            "#eef5ff",
          fontSize:
            "22px",
          fontWeight:
            "700",
          color:
            "#1857c9",
        }}
      >
        📚 Exam Test Loading...
      </div>
    );
  }

  // ====================================================
  // ADMIN LOGIN
  // ====================================================

  if (
    adminLoginOpen
  ) {
    return (
      <AdminLogin
        onSuccess={
          handleAdminLoginSuccess
        }
        onClose={() =>
          setAdminLoginOpen(
            false
          )
        }
      />
    );
  }

  // ====================================================
  // FORGOT PASSWORD
  // ====================================================

  if (forgotPasswordOpen) {
    return (
      <ForgotPassword
        onBack={() => {
          setForgotPasswordOpen(false);
          setPage("home");
          window.scrollTo({
            top: 0,
            behavior: "smooth",
          });
        }}
        onLogin={() => {
          setForgotPasswordOpen(false);
          setPage("home");
          login();
        }}
      />
    );
  }

  // ====================================================
  // ADMIN PANEL
  // ====================================================

  if (adminOpen) {
    return (
      <div className="app">
        <AdminPanel
          user={user}
          tests={cloudTests}
          resources={
            siteResources
          }
          onClose={() => {
            setAdminOpen(
              false
            );
          }}
        />
      </div>
    );
  }

  // ====================================================
  // TEST PAGE
  // ====================================================

  if (
    page === "test" &&
    selectedTest
  ) {
    if (!user) {
      return (
        <div className="app">
          <div className="container">
            <div className="empty-box">
              <h2>
                🔐 Test शुरू करने
                के लिए Login जरूरी है
              </h2>

              <p>
                कृपया पहले Login करें।
              </p>

              <button
                className="open-btn"
                onClick={login}
              >
                🔐 Login करें
              </button>

              <button
                className="back"
                onClick={() =>
                  setPage(
                    "tests"
                  )
                }
              >
                ← वापस जाएँ
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="app">
        <main className="test-page-container">
          <TestRunner
            test={
              selectedTest
            }
            onBack={() =>
              setPage(
                "tests"
              )
            }
          />
        </main>
      </div>
    );
  }

  // ====================================================
  // MAIN WEBSITE
  // ====================================================

  return (
    <>
      <div className="app">

        {/* =================================================
            HEADER
        ================================================= */}

        <header className="header">
          <div className="header-inner">

            <div
              className="logo"
              onClick={
                goHome
              }
            >
              <div className="logo-icon">
                📚
              </div>

              <div className="logo-text">
                <h2>
                  Exam Test
                </h2>

                <span>
                  Learn Today |
                  Lead Tomorrow
                </span>
              </div>
            </div>

            <nav className="nav">

              <button
                onClick={
                  goHome
                }
              >
                🏠 Home
              </button>

              <button
                onClick={() =>
                  setPage(
                    "resources"
                  )
                }
              >
                📚 Books
              </button>

              <button
                onClick={() =>
                  setPage(
                    "current"
                  )
                }
              >
                📰 Current Affairs
              </button>

              <button
                onClick={() =>
                  setPage(
                    "mcq"
                  )
                }
              >
                📝 MCQ
              </button>

              {/* ADMIN */}

              <button
                className="admin-btn"
                onClick={
                  openAdmin
                }
              >
                👑 Admin Panel
              </button>

              {/* FORGOT PASSWORD */}

              <button
                className="login-btn"
                onClick={() => {
                  setForgotPasswordOpen(true);
                  window.scrollTo({
                    top: 0,
                    behavior: "smooth",
                  });
                }}
              >
                🔑 Forgot Password
              </button>

              {/* LOGIN */}

              {user ? (
                <button
                  className="login-btn"
                  onClick={
                    logout
                  }
                  title={
                    user.email
                  }
                >
                  👤 Logout
                </button>
              ) : (
                <button
                  className="login-btn"
                  onClick={
                    login
                  }
                >
                  🔐 Login
                </button>
              )}

            </nav>
          </div>
        </header>

        {/* =================================================
            MAIN
        ================================================= */}

        <main className="container">

          {/* =================================================
              HOME
          ================================================= */}

          {page ===
            "home" && (
            <>

              <section className="hero">

                <h1 className="exam-test-hero-title">
                  <span>
                    Exam{" "}
                  </span>

                  <span>
                    Test
                  </span>
                </h1>

                <p>
                  प्रतियोगी परीक्षाओं
                  की तैयारी के लिए
                  एक ही प्लेटफॉर्म
                </p>

                <div className="search">

                  <input
                    placeholder="आप क्या पढ़ना चाहते हैं?"
                  />

                  <button>
                    🔎 खोजें
                  </button>

                </div>
              </section>

              {/* EXAMS */}

              <div className="section-title">

                <h2>
                  🎯 All Exam Test
                  Series
                </h2>

                <p>
                  सभी प्रमुख
                  प्रतियोगी परीक्षाओं
                  के लिए Test Series
                </p>

              </div>

              <div className="exam-grid">

                {exams.map(
                  (exam) => (
                    <div
                      className="exam-card"
                      key={
                        exam.id
                      }
                      style={{
                        background:
                          exam.color,
                      }}
                    >

                      <div className="exam-icon">
                        {
                          exam.icon
                        }
                      </div>

                      <h3>
                        {
                          exam.name
                        }
                      </h3>

                      <p>
                        {
                          exam.description
                        }
                      </p>

                      <span className="paid">
                        Test Series
                      </span>

                      <button
                        className="open-btn"
                        onClick={() =>
                          openExam(
                            exam
                          )
                        }
                      >
                        Test Series →
                      </button>

                    </div>
                  )
                )}

              </div>

              {/* RESOURCES */}

              <div className="section-title">

                <h2>
                  📚 Study Resources
                </h2>

                <p>
                  परीक्षा की तैयारी
                  के लिए सभी आवश्यक
                  सामग्री
                </p>

              </div>

              <div className="resource-grid">

                {visibleResources.map(
                  (
                    item,
                    index
                  ) => (
                    <div
                      className="resource-card"
                      key={
                        item.id ||
                        index
                      }
                    >

                      <div className="icon">
                        {
                          item.icon
                        }
                      </div>

                      <h3>
                        {
                          item.title
                        }
                      </h3>

                      <p>
                        {
                          item.text
                        }
                      </p>

                      <button
                        className="open-btn"
                        onClick={() => {

                          if (
                            item.page ===
                            "tests"
                          ) {
                            openExam(
                              exams[0]
                            );
                          } else {
                            setPage(
                              item.page ||
                                "resources"
                            );
                          }

                        }}
                      >
                        Open →
                      </button>

                    </div>
                  )
                )}

              </div>

              {/* CURRENT AFFAIRS */}

              <div className="blue-box">

                <h2>
                  📰 Daily Current
                  Affairs Quiz
                </h2>

                <p>
                  आज के महत्वपूर्ण
                  Current Affairs पर
                  आधारित MCQ
                </p>

                <button
                  className="primary"
                  onClick={() =>
                    setPage(
                      "current"
                    )
                  }
                >
                  आज का Quiz शुरू करें
                </button>

              </div>

              {/* AI */}

              <div className="blue-box">

                <h2>
                  🤖 AI MCQ Generator
                </h2>

                <p>
                  परीक्षा और विषय
                  चुनकर नए MCQ तैयार
                  करें।
                </p>

                <button
                  className="primary"
                  onClick={() =>
                    setPage(
                      "mcq"
                    )
                  }
                >
                  MCQ Generator खोलें
                </button>

              </div>

            </>
          )}

          {/* =================================================
              TEST LIST
          ================================================= */}

          {page ===
            "tests" &&
            selectedExam && (
              <>

                <button
                  className="back"
                  onClick={
                    goHome
                  }
                >
                  ← Home पर वापस जाएँ
                </button>

                <div className="page-title">

                  <div className="big-icon">
                    {
                      selectedExam.icon
                    }
                  </div>

                  <h1>
                    {
                      selectedExam.name
                    }{" "}
                    Test Series
                  </h1>

                  <p>
                    {
                      selectedExam.description
                    }
                  </p>

                </div>

                <div className="test-grid">

                  {Object.entries(
                    publicTests
                  )
                    .filter(
                      ([, test]) =>
                        test.exam ===
                        selectedExam.id
                    )
                    .sort(
                      (a, b) =>
                        Number(
                          a[1]
                            .testNumber ||
                            0
                        ) -
                        Number(
                          b[1]
                            .testNumber ||
                            0
                        )
                    )
                    .map(
                      (
                        [id, test]
                      ) => (
                        <div
                          className="test-card"
                          key={
                            id
                          }
                        >

                          <h3>
                            {
                              test.title
                            }
                          </h3>

                          <p>
                            {
                              test
                                .questions
                                ?.length ||
                              0
                            }{" "}
                            MCQ Questions
                          </p>

                          <div className="price">
                            {Number(
                              test.price ||
                                0
                            ) === 0
                              ? "FREE"
                              : `₹${test.price}`}
                          </div>

                          <button
                            onClick={() =>
                              openTest(
                                test
                              )
                            }
                          >
                            Start Test
                          </button>

                        </div>
                      )
                    )}

                </div>

                {Object.entries(
                  publicTests
                ).filter(
                  ([, test]) =>
                    test.exam ===
                    selectedExam.id
                ).length ===
                  0 && (
                  <div className="empty-box">

                    <div>
                      📚
                    </div>

                    <h2>
                      अभी कोई Public
                      Test नहीं है
                    </h2>

                    <p>
                      इस परीक्षा के Test
                      जल्द ही उपलब्ध होंगे।
                    </p>

                  </div>
                )}

              </>
            )}

          {/* =================================================
              RESOURCES
          ================================================= */}

          {page ===
            "resources" && (
            <>

              <button
                className="back"
                onClick={
                  goHome
                }
              >
                ← Home
              </button>

              <div className="page-title">

                <div className="big-icon">
                  📚
                </div>

                <h1>
                  Study Resources
                </h1>

                <p>
                  NCERT, Books और
                  परीक्षा उपयोगी
                  अध्ययन सामग्री
                </p>

              </div>

              <div className="resource-grid">

                {visibleResources.map(
                  (
                    item,
                    index
                  ) => (
                    <div
                      className="resource-card"
                      key={
                        item.id ||
                        index
                      }
                    >

                      <div className="icon">
                        {
                          item.icon
                        }
                      </div>

                      <h3>
                        {
                          item.title
                        }
                      </h3>

                      <p>
                        {
                          item.text
                        }
                      </p>

                    </div>
                  )
                )}

              </div>

            </>
          )}

          {/* =================================================
              CURRENT AFFAIRS
          ================================================= */}

          {page === "current" && (
            <CurrentAffairs
              onBack={goHome}
            />
          )}

          {/* =================================================
              MCQ / AI MCQ GENERATOR
          ================================================= */}

          {page === "mcq" && (
            <>
              <button
                className="back"
                onClick={goHome}
              >
                ← Home
              </button>

              <AIMCQGenerator />
            </>
          )}

        </main>

        {/* =================================================
            FOOTER
        ================================================= */}

        <footer className="footer">

          <h2>
            📚 Exam Test
          </h2>

          <p>
            Learn Today |
            Lead Tomorrow
          </p>

          <p
            style={{
              marginTop:
                "15px",
            }}
          >
            © 2026 Exam Test.
            All Rights Reserved.
          </p>

        </footer>

      </div>
    </>
  );
}
