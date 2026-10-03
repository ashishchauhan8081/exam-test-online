import React, { useEffect, useState } from "react";
import "./LiveTest.css";

import { ref, onValue, get } from "firebase/database";
import { db } from "../firebase";

import TestRunner from "./TestRunner";

const LiveTest = ({ onJoinTest }) => {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);

  // जिस Live Test को अभी खोला गया है
  const [activeTest, setActiveTest] = useState(null);

  // Questions loading
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    const liveTestsRef = ref(db, "liveTests");

    const unsubscribe = onValue(
      liveTestsRef,
      (snapshot) => {
        const data = snapshot.val();

        if (!data) {
          setTests([]);
          setLoading(false);
          return;
        }

        const list = Object.entries(data).map(
          ([id, value]) => ({
            id,
            ...(value || {}),
          })
        );

        // केवल Published tests
        const publishedTests = list.filter(
          (test) => test.published === true
        );

        // Start Time के अनुसार
        publishedTests.sort((a, b) => {
          const aTime = new Date(
            a.startTime || 0
          ).getTime();

          const bTime = new Date(
            b.startTime || 0
          ).getTime();

          return aTime - bTime;
        });

        setTests(publishedTests);
        setLoading(false);
      },
      (error) => {
        console.error(
          "Live Test Load Error:",
          error
        );

        setTests([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // =====================================================
  // STATUS
  // =====================================================

  const getTestStatus = (test) => {
    const now = Date.now();

    const start = test.startTime
      ? new Date(test.startTime).getTime()
      : 0;

    const end = test.endTime
      ? new Date(test.endTime).getTime()
      : 0;

    if (
      test.live === true &&
      (!end || now <= end)
    ) {
      return "LIVE";
    }

    if (
      start &&
      now < start
    ) {
      return "UPCOMING";
    }

    if (
      end &&
      now > end
    ) {
      return "ENDED";
    }

    return test.live
      ? "LIVE"
      : "UPCOMING";
  };

  // =====================================================
  // DATE
  // =====================================================

  const formatDate = (date) => {
    if (!date) return "";

    try {
      return new Date(date).toLocaleString(
        "hi-IN",
        {
          dateStyle: "medium",
          timeStyle: "short",
        }
      );
    } catch {
      return date;
    }
  };

  // =====================================================
  // JOIN LIVE TEST
  // =====================================================

  const handleJoin = async (test) => {
    const status =
      getTestStatus(test);

    if (status !== "LIVE") {
      alert(
        status === "UPCOMING"
          ? "यह Live Test अभी शुरू नहीं हुआ है।"
          : "यह Live Test समाप्त हो चुका है।"
      );

      return;
    }

    try {
      setJoining(true);

      /*
        ==================================================
        सबसे महत्वपूर्ण हिस्सा

        AdminLiveTest में Existing Test ID save होती है।

        उदाहरण:

        liveTests
          abc123
            testId: "xyz789"

        फिर हम:

        tests/xyz789

        से पूरा पुराना Test पढ़ेंगे।
        ==================================================
      */

      const linkedTestId =
        String(
          test?.testId ||
          ""
        ).trim();

      if (!linkedTestId) {
        alert(
          "❌ इस Live Test में Existing Test ID नहीं है।\n\nAdmin Panel में इस Test को Edit करके Existing Test ID डालें।"
        );

        setJoining(false);
        return;
      }

      console.log(
        "LIVE TEST ID:",
        test.id
      );

      console.log(
        "LINKED TEST ID:",
        linkedTestId
      );

      // =================================================
      // Firebase से Existing Test पढ़ें
      // =================================================

      const testRef = ref(
        db,
        `tests/${linkedTestId}`
      );

      const snapshot =
        await get(testRef);

      if (!snapshot.exists()) {
        alert(
          "❌ Linked Test नहीं मिला।\n\nExisting Test ID गलत है।"
        );

        setJoining(false);
        return;
      }

      const existingTest =
        snapshot.val();

      console.log(
        "EXISTING TEST:",
        existingTest
      );

      // =================================================
      // QUESTIONS
      // =================================================

      let questions =
        existingTest?.questions;

      if (
        !questions ||
        (
          !Array.isArray(questions) &&
          typeof questions !==
            "object"
        )
      ) {
        questions = [];
      }

      // Firebase object → array
      if (
        !Array.isArray(questions) &&
        typeof questions ===
          "object"
      ) {
        questions =
          Object.values(
            questions
          );
      }

      if (!Array.isArray(questions)) {
        questions = [];
      }

      // Maximum 150 questions
      questions =
        questions.slice(
          0,
          150
        );

      console.log(
        "LIVE TEST QUESTIONS:",
        questions.length
      );

      if (
        questions.length === 0
      ) {
        alert(
          "❌ इस Linked Test में कोई Question नहीं मिला।\n\nFirebase में tests/" +
            linkedTestId +
            " के अंदर questions check करें।"
        );

        setJoining(false);
        return;
      }

      // =================================================
      // TestRunner के लिए Final Test Object
      // =================================================

      const finalTest = {
        // Existing Test की सारी information
        ...existingTest,

        // Existing Firebase ID
        id: linkedTestId,

        // Live Test की information
        liveTestId:
          test.id,

        liveTestName:
          test.testName,

        liveExamName:
          test.examName,

        // Display title
        title:
          existingTest.title ||
          existingTest.name ||
          test.testName ||
          "Live Test",

        examName:
          existingTest.examName ||
          existingTest.examTitle ||
          test.examName ||
          "Competitive Exam",

        examTitle:
          existingTest.examTitle ||
          existingTest.examName ||
          test.examName ||
          "Competitive Exam",

        // Exam ID
        examId:
          existingTest.examId ||
          existingTest.exam ||
          test.examId ||
          test.examName ||
          "",

        // Test number
        testNumber:
          existingTest.testNumber ??
          existingTest.testNo ??
          test.testNumber ??
          1,

        // Live Test duration
        duration:
          Number(
            test.duration ||
            existingTest.duration ||
            30
          ),

        durationMinutes:
          Number(
            test.duration ||
            existingTest.durationMinutes ||
            existingTest.duration ||
            30
          ),

        // IMPORTANT
        // Questions यहीं attach हो रहे हैं
        questions,

        // Marks
        marksPerQuestion:
          existingTest.marksPerQuestion ??
          existingTest.marks ??
          1,

        negativeMarking:
          existingTest.negativeMarking ??
          false,

        negativeMarks:
          existingTest.negativeMarks ??
          0,
      };

      console.log(
        "FINAL LIVE TEST:",
        finalTest
      );

      // =================================================
      // अगर Parent ने onJoinTest दिया है
      // =================================================

      if (
        typeof onJoinTest ===
        "function"
      ) {
        onJoinTest(
          finalTest
        );

        setJoining(false);
        return;
      }

      // =================================================
      // अगर Parent ने onJoinTest नहीं दिया
      // तो इसी component में TestRunner खोलें
      // =================================================

      setActiveTest(
        finalTest
      );

    } catch (error) {
      console.error(
        "JOIN LIVE TEST ERROR:",
        error
      );

      alert(
        "❌ Live Test खोलने में समस्या हुई:\n\n" +
          error.message
      );
    } finally {
      setJoining(false);
    }
  };

  // =====================================================
  // BACK FROM TEST
  // =====================================================

  const handleBack = () => {
    setActiveTest(null);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // =====================================================
  // ACTIVE TEST
  // =====================================================

  if (activeTest) {
    return (
      <TestRunner
        test={activeTest}
        onBack={handleBack}
      />
    );
  }

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <section className="live-test-section">
        <div className="live-test-heading">
          <div className="live-test-title-icon">
            🔴
          </div>

          <div>
            <h2>Live Test</h2>

            <p>
              Live Test लोड हो रहा है...
            </p>
          </div>
        </div>

        <div className="live-test-loading">
          कृपया प्रतीक्षा करें...
        </div>
      </section>
    );
  }

  // =====================================================
  // LIST
  // =====================================================

  return (
    <section className="live-test-section">

      {/* HEADER */}

      <div className="live-test-heading">

        <div className="live-test-title-icon">
          🔴
        </div>

        <div>
          <h2>
            Live Test
          </h2>

          <p>
            अभी चल रहे और आने वाले टेस्ट
          </p>
        </div>

      </div>

      {/* EMPTY */}

      {tests.length === 0 ? (

        <div className="no-live-test">

          <div className="no-live-icon">
            🎯
          </div>

          <h3>
            अभी कोई Live Test नहीं है
          </h3>

          <p>
            नया Live Test शुरू होने पर
            यहाँ दिखाई देगा।
          </p>

        </div>

      ) : (

        <div className="live-test-list">

          {tests.map(
            (test) => {

              const status =
                getTestStatus(
                  test
                );

              return (
                <div
                  className={`live-test-card ${status.toLowerCase()}`}
                  key={test.id}
                >

                  {/* TOP */}

                  <div className="live-test-card-top">

                    <div className="live-test-exam">
                      {test.examIcon ||
                        "📝"}
                    </div>

                    <div
                      className={`live-status ${status.toLowerCase()}`}
                    >

                      {status ===
                        "LIVE" && (
                        <span className="live-dot" />
                      )}

                      {status ===
                      "LIVE"
                        ? "LIVE NOW"
                        : status ===
                          "UPCOMING"
                        ? "UPCOMING"
                        : "ENDED"}

                    </div>

                  </div>

                  {/* TITLE */}

                  <h3>
                    {test.testName ||
                      "Live Mock Test"}
                  </h3>

                  {/* EXAM */}

                  <p className="live-test-exam-name">
                    📚{" "}
                    {test.examName ||
                      "Competitive Exam"}
                  </p>

                  {/* INFO */}

                  <div className="live-test-info">

                    {test.totalQuestions && (
                      <span>
                        📝{" "}
                        {
                          test.totalQuestions
                        }{" "}
                        Questions
                      </span>
                    )}

                    {test.duration && (
                      <span>
                        ⏱️{" "}
                        {test.duration}{" "}
                        Min
                      </span>
                    )}

                    {test.participants !==
                      undefined && (
                      <span>
                        👥{" "}
                        {
                          test.participants
                        }
                      </span>
                    )}

                  </div>

                  {/* UPCOMING */}

                  {status ===
                    "UPCOMING" &&
                    test.startTime && (
                      <div className="live-time">
                        ⏰ शुरू होगा:{" "}
                        <strong>
                          {formatDate(
                            test.startTime
                          )}
                        </strong>
                      </div>
                    )}

                  {/* END */}

                  {status ===
                    "LIVE" &&
                    test.endTime && (
                      <div className="live-time live-end">
                        ⏳ समाप्त होगा:{" "}
                        <strong>
                          {formatDate(
                            test.endTime
                          )}
                        </strong>
                      </div>
                    )}

                  {/* JOIN */}

                  <button
                    className={`join-live-btn ${
                      status !== "LIVE"
                        ? "disabled"
                        : ""
                    }`}
                    onClick={() =>
                      handleJoin(
                        test
                      )
                    }
                    disabled={
                      status !==
                        "LIVE" ||
                      joining
                    }
                  >

                    {joining
                      ? "⏳ Questions लोड हो रहे हैं..."
                      : status ===
                        "LIVE"
                      ? "▶ Join Live Test"
                      : status ===
                        "UPCOMING"
                      ? "⏰ Coming Soon"
                      : "Test Ended"}

                  </button>

                </div>
              );
            }
          )}

        </div>

      )}

    </section>
  );
};

export default LiveTest;
