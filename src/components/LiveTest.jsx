import React, { useEffect, useState } from "react";
import "./LiveTest.css";

import { ref, onValue } from "firebase/database";
import { db } from "../firebase";

const LiveTest = ({ onJoinTest }) => {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const liveTestsRef = ref(db, "liveTests");

    const unsubscribe = onValue(liveTestsRef, (snapshot) => {
      const data = snapshot.val();

      if (!data) {
        setTests([]);
        setLoading(false);
        return;
      }

      const list = Object.entries(data).map(([id, value]) => ({
        id,
        ...value,
      }));

      // केवल Published tests
      const publishedTests = list.filter(
        (test) => test.published === true
      );

      // नवीनतम पहले
      publishedTests.sort((a, b) => {
        const aTime = new Date(a.startTime || 0).getTime();
        const bTime = new Date(b.startTime || 0).getTime();

        return aTime - bTime;
      });

      setTests(publishedTests);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getTestStatus = (test) => {
    const now = new Date().getTime();

    const start = test.startTime
      ? new Date(test.startTime).getTime()
      : 0;

    const end = test.endTime
      ? new Date(test.endTime).getTime()
      : 0;

    if (test.live === true && (!end || now <= end)) {
      return "LIVE";
    }

    if (start && now < start) {
      return "UPCOMING";
    }

    if (end && now > end) {
      return "ENDED";
    }

    return test.live ? "LIVE" : "UPCOMING";
  };

  const formatDate = (date) => {
    if (!date) return "";

    try {
      return new Date(date).toLocaleString("hi-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return date;
    }
  };

  const handleJoin = (test) => {
    const status = getTestStatus(test);

    if (status !== "LIVE") {
      alert(
        status === "UPCOMING"
          ? "यह Live Test अभी शुरू नहीं हुआ है।"
          : "यह Live Test समाप्त हो चुका है।"
      );
      return;
    }

    if (typeof onJoinTest === "function") {
      onJoinTest(test);
      return;
    }

    // यदि parent से function नहीं आया तो TestRunner route/localStorage
    localStorage.setItem("activeLiveTest", JSON.stringify(test));

    window.location.href = `/test/${test.testId || test.id}`;
  };

  if (loading) {
    return (
      <section className="live-test-section">
        <div className="live-test-heading">
          <span>🔴</span>
          <div>
            <h2>Live Test</h2>
            <p>Live Exam / Mock Test</p>
          </div>
        </div>

        <div className="live-test-loading">
          Live Test लोड हो रहा है...
        </div>
      </section>
    );
  }

  return (
    <section className="live-test-section">

      <div className="live-test-heading">
        <div className="live-test-title-icon">
          🔴
        </div>

        <div>
          <h2>Live Test</h2>
          <p>अभी चल रहे और आने वाले टेस्ट</p>
        </div>
      </div>

      {tests.length === 0 ? (
        <div className="no-live-test">
          <div className="no-live-icon">🎯</div>

          <h3>अभी कोई Live Test नहीं है</h3>

          <p>
            नया Live Test शुरू होने पर यहाँ दिखाई देगा।
          </p>
        </div>
      ) : (
        <div className="live-test-list">

          {tests.map((test) => {
            const status = getTestStatus(test);

            return (
              <div
                className={`live-test-card ${status.toLowerCase()}`}
                key={test.id}
              >

                <div className="live-test-card-top">

                  <div className="live-test-exam">
                    {test.examIcon || "📝"}
                  </div>

                  <div className={`live-status ${status.toLowerCase()}`}>
                    {status === "LIVE" && (
                      <span className="live-dot"></span>
                    )}

                    {status === "LIVE"
                      ? "LIVE NOW"
                      : status === "UPCOMING"
                      ? "UPCOMING"
                      : "ENDED"}
                  </div>

                </div>

                <h3>
                  {test.testName || "Live Mock Test"}
                </h3>

                <p className="live-test-exam-name">
                  📚 {test.examName || "Competitive Exam"}
                </p>

                <div className="live-test-info">

                  {test.totalQuestions && (
                    <span>
                      📝 {test.totalQuestions} Questions
                    </span>
                  )}

                  {test.duration && (
                    <span>
                      ⏱️ {test.duration} Min
                    </span>
                  )}

                  {test.participants !== undefined && (
                    <span>
                      👥 {test.participants}
                    </span>
                  )}

                </div>

                {status === "UPCOMING" && test.startTime && (
                  <div className="live-time">
                    ⏰ शुरू होगा:{" "}
                    <strong>
                      {formatDate(test.startTime)}
                    </strong>
                  </div>
                )}

                {status === "LIVE" && test.endTime && (
                  <div className="live-time live-end">
                    ⏳ समाप्त होगा:{" "}
                    <strong>
                      {formatDate(test.endTime)}
                    </strong>
                  </div>
                )}

                <button
                  className={`join-live-btn ${
                    status !== "LIVE" ? "disabled" : ""
                  }`}
                  onClick={() => handleJoin(test)}
                  disabled={status !== "LIVE"}
                >
                  {status === "LIVE"
                    ? "▶ Join Live Test"
                    : status === "UPCOMING"
                    ? "⏰ Coming Soon"
                    : "Test Ended"}
                </button>

              </div>
            );
          })}

        </div>
      )}

    </section>
  );
};

export default LiveTest;
