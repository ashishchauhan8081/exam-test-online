import React, { useEffect, useState } from "react";

import {
  getApps,
  getApp,
  initializeApp,
} from "firebase/app";

import {
  getDatabase,
  ref,
  get,
} from "firebase/database";

import firebaseConfig from "../firebase-config.json";

import "../App.css";

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

function getQuestionsCount(test) {
  if (!test) return 0;

  if (Array.isArray(test.questions)) {
    return test.questions.length;
  }

  if (
    test.questions &&
    typeof test.questions === "object"
  ) {
    return Object.keys(test.questions).length;
  }

  if (typeof test.questionCount === "number") {
    return test.questionCount;
  }

  if (typeof test.questionsCount === "number") {
    return test.questionsCount;
  }

  return 0;
}

/* ======================================================
   DURATION
====================================================== */

function getDuration(test) {
  return (
    test?.durationMinutes ??
    test?.duration ??
    test?.timeLimit ??
    test?.time ??
    0
  );
}

/* ======================================================
   PRICE
====================================================== */

function getPrice(test) {
  return (
    test?.price ??
    test?.amount ??
    test?.testPrice ??
    0
  );
}

/* ======================================================
   PUBLIC TEST
====================================================== */

function isTestPublic(test) {
  if (!test) return false;

  const status = String(
    test.status ??
      test.visibility ??
      test.publishStatus ??
      ""
  )
    .trim()
    .toLowerCase();

  if (
    status === "public" ||
    status === "published" ||
    status === "active" ||
    status === "live"
  ) {
    return true;
  }

  if (
    test.isPublic === true ||
    test.public === true ||
    test.published === true ||
    test.active === true
  ) {
    return true;
  }

  return false;
}

/* ======================================================
   ATTEMPT KEY
====================================================== */

function getAttemptKey(test) {
  return `test_attempted_${String(
    test?.id ??
      test?.testId ??
      `${test?.examId || test?.exam || "general"}_${test?.testNumber || test?.testNo || test?.number || 1}`
  )}`;
}

/* ======================================================
   TEST SERIES
====================================================== */

export default function TestSeries({
  onBack,
  onStartTest,
}) {
  const [tests, setTests] = useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  /* ====================================================
     LOAD TESTS
  ==================================================== */

  useEffect(() => {
    let mounted = true;

    const loadTests = async () => {
      try {
        setLoading(true);
        setError("");

        console.log(
          "TEST SERIES: Firebase से tests load हो रहे हैं..."
        );

        const snapshot = await get(
          ref(db, "tests")
        );

        if (!mounted) return;

        if (!snapshot.exists()) {
          setTests([]);
          return;
        }

        const data = snapshot.val();

        console.log(
          "TEST SERIES: Firebase raw data:",
          data
        );

        let loadedTests = [];

        /* ==============================================
           OBJECT FORMAT
        ============================================== */

        if (
          data &&
          typeof data === "object" &&
          !Array.isArray(data)
        ) {
          loadedTests =
            Object.entries(data).map(
              ([id, test]) => ({
                id,

                ...test,

                raw: {
                  id,
                  ...test,
                },
              })
            );
        }

        /* ==============================================
           ARRAY FORMAT
        ============================================== */

        else if (Array.isArray(data)) {
          loadedTests =
            data
              .map((test, index) => {
                if (!test) return null;

                return {
                  id:
                    test.id ||
                    String(index),

                  ...test,

                  raw: {
                    id:
                      test.id ||
                      String(index),

                    ...test,
                  },
                };
              })
              .filter(Boolean);
        }

        console.log(
          "TEST SERIES: Total tests:",
          loadedTests.length
        );

        /* ==============================================
           PUBLIC FILTER
        ============================================== */

        const publicTests =
          loadedTests.filter(
            (test) =>
              isTestPublic(test)
          );

        /* ==============================================
           SORT
        ============================================== */

        publicTests.sort(
          (a, b) => {
            const aNo = Number(
              a.testNumber ??
                a.testNo ??
                a.number ??
                999999
            );

            const bNo = Number(
              b.testNumber ??
                b.testNo ??
                b.number ??
                999999
            );

            return aNo - bNo;
          }
        );

        setTests(
          publicTests
        );
      } catch (err) {
        console.error(
          "TEST SERIES LOAD ERROR:",
          err
        );

        if (mounted) {
          setError(
            err?.message ||
              "Test Series load नहीं हो सकी।"
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadTests();

    return () => {
      mounted = false;
    };
  }, []);

  /* ====================================================
     CHECK ATTEMPT
  ==================================================== */

  const hasAttempted = (test) => {
    try {
      return (
        localStorage.getItem(
          getAttemptKey(test)
        ) === "true"
      );
    } catch {
      return false;
    }
  };

  /* ====================================================
     START / RE-ATTEMPT
  ==================================================== */

  const handleStart = (test) => {
    console.log(
      "START / RE-ATTEMPT TEST:",
      test
    );

    if (!test) {
      alert(
        "❌ Test data नहीं मिला।"
      );

      return;
    }

    if (
      typeof onStartTest ===
      "function"
    ) {
      onStartTest({
        id: test.id,

        title:
          test.title ||
          test.name ||
          "Test",

        exam:
          test.exam ||
          test.examName ||
          "",

        examId:
          test.examId ||
          test.exam ||
          "",

        testNo:
          test.testNumber ??
          test.testNo ??
          test.number ??
          1,

        testNumber:
          test.testNumber ??
          test.testNo ??
          test.number ??
          1,

        duration:
          getDuration(test),

        questions:
          test.questions || [],

        marksPerQuestion:
          test.marksPerQuestion ??
          test.marks ??
          1,

        negativeMarking:
          test.negativeMarking ??
          false,

        negativeMarks:
          test.negativeMarks ??
          0,

        raw:
          test.raw || test,
      });
    } else {
      console.error(
        "onStartTest function नहीं मिली।"
      );
    }
  };

  /* ====================================================
     LOADING
  ==================================================== */

  if (loading) {
    return (
      <div
        className="page-container"
        style={{
          padding:
            "30px 20px",
        }}
      >
        <button
          type="button"
          className="back-btn"
          onClick={onBack}
        >
          ← Home
        </button>

        <h1>
          🎯 Test Series
        </h1>

        <p>
          ⏳ Test Series load हो रही है...
        </p>
      </div>
    );
  }

  /* ====================================================
     ERROR
  ==================================================== */

  if (error) {
    return (
      <div
        className="page-container"
        style={{
          padding:
            "30px 20px",
        }}
      >
        <button
          type="button"
          className="back-btn"
          onClick={onBack}
        >
          ← Home
        </button>

        <h1>
          🎯 Test Series
        </h1>

        <div
          style={{
            padding: "20px",
            marginTop: "20px",
            background: "#fee2e2",
            borderRadius: "12px",
            color: "#991b1b",
          }}
        >
          <strong>
            ❌ Error
          </strong>

          <p>
            {error}
          </p>
        </div>
      </div>
    );
  }

  /* ====================================================
     EMPTY
  ==================================================== */

  if (tests.length === 0) {
    return (
      <div
        className="page-container"
        style={{
          padding:
            "30px 20px",
        }}
      >
        <button
          type="button"
          className="back-btn"
          onClick={onBack}
        >
          ← Home
        </button>

        <h1>
          🎯 Test Series
        </h1>

        <p>
          आपकी Test Series यहाँ दिखाई जाएगी।
        </p>

        <div
          style={{
            marginTop:
              "30px",

            padding:
              "30px 20px",

            textAlign:
              "center",

            background:
              "#ffffff",

            border:
              "1px solid #e5e7eb",

            borderRadius:
              "16px",

            boxShadow:
              "0 4px 15px rgba(0,0,0,0.06)",
          }}
        >
          <div
            style={{
              fontSize:
                "50px",
              marginBottom:
                "10px",
            }}
          >
            📚
          </div>

          <h2>
            अभी कोई Public Test उपलब्ध नहीं है
          </h2>

          <p
            style={{
              color:
                "#64748b",
            }}
          >
            Admin Panel में Public Test
            होने पर यहाँ दिखाई देगा।
          </p>
        </div>
      </div>
    );
  }

  /* ====================================================
     TEST LIST
  ==================================================== */

  return (
    <div
      className="page-container"
      style={{
        padding:
          "25px 18px 40px",
      }}
    >
      {/* BACK */}

      <button
        type="button"
        className="back-btn"
        onClick={onBack}
        style={{
          marginBottom:
            "20px",
        }}
      >
        ← Home
      </button>

      {/* HEADER */}

      <div
        style={{
          marginBottom:
            "25px",
        }}
      >
        <h1
          style={{
            marginBottom:
              "8px",
          }}
        >
          🎯 Test Series
        </h1>

        <p
          style={{
            color:
              "#64748b",
            margin:
              "0",
          }}
        >
          आपकी Test Series यहाँ दिखाई जाएगी।
        </p>
      </div>

      {/* COUNT */}

      <div
        style={{
          marginBottom:
            "20px",

          padding:
            "12px 16px",

          background:
            "#eff6ff",

          borderRadius:
            "10px",

          color:
            "#1d4ed8",

          fontWeight:
            "700",
        }}
      >
        📚 कुल Public Tests:{" "}
        {tests.length}
      </div>

      {/* LIST */}

      <div
        style={{
          display:
            "grid",

          gap:
            "18px",
        }}
      >
        {tests.map(
          (test, index) => {
            const questionCount =
              getQuestionsCount(
                test
              );

            const duration =
              getDuration(test);

            const price =
              getPrice(test);

            const title =
              test.title ||
              test.name ||
              `Test ${index + 1}`;

            const exam =
              test.exam ||
              test.examName ||
              test.examTitle ||
              "General";

            const testNumber =
              test.testNumber ??
              test.testNo ??
              test.number ??
              index + 1;

            const attempted =
              hasAttempted(test);

            return (
              <div
                key={
                  test.id ||
                  index
                }
                style={{
                  background:
                    "#ffffff",

                  border:
                    "1px solid #dbe4ee",

                  borderRadius:
                    "18px",

                  padding:
                    "20px",

                  boxShadow:
                    "0 4px 16px rgba(15,23,42,0.06)",
                }}
              >
                {/* TITLE */}

                <h2
                  style={{
                    margin:
                      "0 0 12px",

                    color:
                      "#0f2747",

                    fontSize:
                      "22px",
                  }}
                >
                  📚 {title}
                </h2>

                {/* EXAM */}

                <p
                  style={{
                    margin:
                      "8px 0",

                    color:
                      "#64748b",

                    fontSize:
                      "16px",
                  }}
                >
                  <strong>
                    Exam:
                  </strong>{" "}
                  {exam}
                </p>

                {/* DETAILS */}

                <p
                  style={{
                    margin:
                      "8px 0",

                    color:
                      "#64748b",

                    fontSize:
                      "16px",
                  }}
                >
                  <strong>
                    Test No:
                  </strong>{" "}
                  {testNumber}
                  {" • "}
                  <strong>
                    Questions:
                  </strong>{" "}
                  {questionCount}
                  {" • "}
                  <strong>
                    Duration:
                  </strong>{" "}
                  {duration} min
                </p>

                {/* PRICE */}

                <p
                  style={{
                    margin:
                      "8px 0 12px",

                    color:
                      "#64748b",

                    fontSize:
                      "16px",
                  }}
                >
                  <strong>
                    Price:
                  </strong>{" "}
                  ₹{price}
                </p>

                {/* STATUS */}

                <div
                  style={{
                    display:
                      "inline-block",

                    padding:
                      "6px 14px",

                    background:
                      attempted
                        ? "#dbeafe"
                        : "#dcfce7",

                    color:
                      attempted
                        ? "#1d4ed8"
                        : "#15803d",

                    borderRadius:
                      "999px",

                    fontWeight:
                      "800",

                    fontSize:
                      "14px",

                    marginBottom:
                      "15px",
                  }}
                >
                  {attempted
                    ? "✓ ATTEMPTED"
                    : "PUBLIC"}
                </div>

                {/* START / RE-ATTEMPT */}

                <button
                  type="button"
                  onClick={() =>
                    handleStart(
                      test
                    )
                  }
                  style={{
                    width:
                      "100%",

                    padding:
                      "13px 18px",

                    border:
                      "none",

                    borderRadius:
                      "10px",

                    background:
                      attempted
                        ? "#2563eb"
                        : "#087bea",

                    color:
                      "#ffffff",

                    fontSize:
                      "17px",

                    fontWeight:
                      "800",

                    cursor:
                      "pointer",
                  }}
                >
                  {attempted
                    ? "🔄 Re-attempt करें"
                    : "▶️ Test Start करें"}
                </button>
              </div>
            );
          }
        )}
      </div>
    </div>
  );
}
