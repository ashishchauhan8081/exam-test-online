import React, { useEffect, useState } from "react";
import "./TestSeries.css";

import {
  getApps,
  getApp,
  initializeApp,
} from "firebase/app";

import {
  getDatabase,
  ref,
  onValue,
} from "firebase/database";

import firebaseConfig from "../firebase-config.json";

// ======================================================
// FIREBASE INITIALIZE
// ======================================================

const firebaseApp = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

const db = getDatabase(firebaseApp);

// ======================================================
// TEST SERIES
// ======================================================

export default function TestSeries({ onBack, onStartTest }) {

  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ====================================================
  // LOAD TESTS FROM FIREBASE
  // ====================================================

  useEffect(() => {

    setLoading(true);
    setError("");

    // Admin panel में सामान्यतः tests इसी तरह save होते हैं
    const testsRef = ref(db, "tests");

    const unsubscribe = onValue(
      testsRef,
      (snapshot) => {

        const data = snapshot.val();

        console.log("TEST DATA FROM FIREBASE:", data);

        if (!data) {
          setTests([]);
          setLoading(false);
          return;
        }

        const list = [];

        Object.entries(data).forEach(([id, value]) => {

          if (!value || typeof value !== "object") {
            return;
          }

          // केवल PUBLIC tests दिखाएं
          const status = String(
            value.status ||
            value.visibility ||
            "PUBLIC"
          ).toUpperCase();

          if (
            status !== "PUBLIC" &&
            status !== "PUBLISHED" &&
            status !== "ACTIVE"
          ) {
            return;
          }

          list.push({
            id,

            title:
              value.title ||
              value.name ||
              value.testName ||
              "Test",

            exam:
              value.exam ||
              value.examName ||
              value.category ||
              "",

            testNo:
              value.testNo ??
              value.testNumber ??
              value.testSeriesNo ??
              value.seriesNo ??
              "",

            questions:
              value.questionsCount ??
              value.questionCount ??
              value.totalQuestions ??
              (
                Array.isArray(value.questions)
                  ? value.questions.length
                  : value.questions
                    ? Object.keys(value.questions).length
                    : 0
              ),

            duration:
              value.duration ??
              value.durationMinutes ??
              value.time ??
              0,

            price:
              value.price ??
              value.amount ??
              0,

            description:
              value.description || "",

            raw: value,
          });
        });

        // Test No. के हिसाब से sort
        list.sort((a, b) => {

          const noA = Number(a.testNo) || 0;
          const noB = Number(b.testNo) || 0;

          return noA - noB;
        });

        setTests(list);
        setLoading(false);
      },

      (err) => {

        console.error("Firebase Test Error:", err);

        setError(
          "Test Series लोड नहीं हो सकी। Firebase Permission Rules चेक करें।"
        );

        setLoading(false);
      }
    );

    return () => unsubscribe();

  }, []);

  // ====================================================
  // START TEST
  // ====================================================

  const handleStartTest = (test) => {

    console.log("Starting Test:", test);

    if (typeof onStartTest === "function") {
      onStartTest(test);
      return;
    }

    // अगर App.jsx में navigation नहीं दिया है
    // तो test को localStorage में रख दें
    try {
      localStorage.setItem(
        "selectedTest",
        JSON.stringify(test)
      );
    } catch (e) {
      console.error(e);
    }

    // Custom event
    window.dispatchEvent(
      new CustomEvent("startTest", {
        detail: test,
      })
    );
  };

  // ====================================================
  // BACK
  // ====================================================

  const handleBack = () => {

    if (typeof onBack === "function") {
      onBack();
      return;
    }

    window.history.back();
  };

  // ====================================================
  // UI
  // ====================================================

  return (
    <div className="test-series-page">

      {/* HEADER */}

      <div className="test-series-header">

        <button
          className="home-btn"
          onClick={handleBack}
        >
          ← Home
        </button>

        <h1>
          🎯 Test Series
        </h1>

        <p>
          अपनी Test Series यहाँ देखें और परीक्षा की तैयारी करें।
        </p>

      </div>

      {/* LOADING */}

      {loading && (
        <div className="test-loading">
          <div className="loading-spinner"></div>

          <p>
            Test Series लोड हो रही है...
          </p>
        </div>
      )}

      {/* ERROR */}

      {!loading && error && (
        <div className="test-error">
          <div className="error-icon">
            ⚠️
          </div>

          <h3>
            समस्या आ गई
          </h3>

          <p>
            {error}
          </p>
        </div>
      )}

      {/* NO TEST */}

      {!loading &&
        !error &&
        tests.length === 0 && (

          <div className="no-tests">

            <div className="no-test-icon">
              📚
            </div>

            <h2>
              अभी कोई Test Series उपलब्ध नहीं है
            </h2>

            <p>
              Admin Panel से PUBLIC Test बनाने के बाद
              वह यहाँ दिखाई देगा।
            </p>

          </div>
        )}

      {/* TEST LIST */}

      {!loading &&
        !error &&
        tests.length > 0 && (

          <div className="test-list">

            {tests.map((test) => (

              <div
                className="test-card"
                key={test.id}
              >

                {/* TITLE */}

                <div className="test-title-row">

                  <div className="test-icon">
                    🎯
                  </div>

                  <div>
                    <h2>
                      {test.title}
                    </h2>

                    {test.exam && (
                      <p className="exam-name">
                        Exam: {test.exam}
                      </p>
                    )}
                  </div>

                </div>

                {/* DETAILS */}

                <div className="test-details">

                  {test.testNo !== "" && (
                    <div className="detail-row">
                      <span>
                        📝 Test No.
                      </span>

                      <strong>
                        {test.testNo}
                      </strong>
                    </div>
                  )}

                  <div className="detail-row">
                    <span>
                      ❓ Questions
                    </span>

                    <strong>
                      {test.questions || 0}
                    </strong>
                  </div>

                  <div className="detail-row">
                    <span>
                      ⏱️ Duration
                    </span>

                    <strong>
                      {test.duration || 0} min
                    </strong>
                  </div>

                  <div className="detail-row">
                    <span>
                      💰 Price
                    </span>

                    <strong>
                      ₹{test.price || 0}
                    </strong>
                  </div>

                </div>

                {/* PUBLIC */}

                <div className="public-badge">
                  ✓ PUBLIC
                </div>

                {/* DESCRIPTION */}

                {test.description && (
                  <p className="test-description">
                    {test.description}
                  </p>
                )}

                {/* START */}

                <button
                  className="start-test-btn"
                  onClick={() => handleStartTest(test)}
                >
                  🚀 Start Test
                </button>

              </div>

            ))}

          </div>
        )}

    </div>
  );
}
