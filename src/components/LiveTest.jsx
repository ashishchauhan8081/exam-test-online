import React, { useEffect, useState } from "react";
import "./LiveTest.css";
import { ref, onValue, get } from "firebase/database";
import { db } from "../firebase";

const normalizeQuestions = (value) => {
  let list = value;
  if (!Array.isArray(list) && list && typeof list === "object") list = Object.values(list);
  if (!Array.isArray(list)) return [];

  return list.slice(0, 150).map((q, i) => {
    const options = Array.isArray(q?.options)
      ? q.options
      : [q?.options?.A, q?.options?.B, q?.options?.C, q?.options?.D];
    let answer = q?.answerIndex ?? q?.answer ?? 0;
    if (typeof answer === "string") {
      const s = answer.trim().toUpperCase();
      answer = ["A", "B", "C", "D"].indexOf(s);
      if (answer < 0 && !Number.isNaN(Number(s))) answer = Number(s);
    }
    answer = Number(answer);
    if (!Number.isInteger(answer) || answer < 0 || answer > 3) answer = 0;
    return {
      id: q?.id || `q-${i + 1}`,
      question: String(q?.question || q?.questionText || ""),
      options: [0, 1, 2, 3].map((n) => String(options?.[n] || "")),
      answer,
      explanation: Array.isArray(q?.explanation) ? q.explanation.join("\n") : String(q?.explanation || q?.solution || ""),
      explanationPoints: q?.explanationPoints,
    };
  });
};

const getStatus = (test) => {
  const now = Date.now();
  const start = test.startTime ? new Date(test.startTime).getTime() : 0;
  const end = test.endTime ? new Date(test.endTime).getTime() : 0;
  if (test.live === true && (!end || now <= end)) return "LIVE";
  if (start && now < start) return "UPCOMING";
  if (end && now > end) return "ENDED";
  return test.live ? "LIVE" : "UPCOMING";
};

const formatDate = (value) => {
  if (!value) return "";
  try { return new Date(value).toLocaleString("hi-IN", { dateStyle: "medium", timeStyle: "short" }); }
  catch { return String(value); }
};

export default function LiveTest({ onJoinTest, onBack }) {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    return onValue(
      ref(db, "liveTests"),
      (snapshot) => {
        const data = snapshot.val() || {};
        const list = Object.entries(data)
          .map(([id, value]) => ({ id, ...(value || {}) }))
          .filter((test) => test.published === true)
          .sort((a, b) => new Date(a.startTime || 0) - new Date(b.startTime || 0));
        setTests(list);
        setLoading(false);
      },
      (error) => {
        console.error("Live Test Load Error:", error);
        setTests([]);
        setLoading(false);
      }
    );
  }, []);

  const handleJoin = async (test) => {
    const status = getStatus(test);
    if (status !== "LIVE") {
      alert(status === "UPCOMING" ? "यह Live Test अभी शुरू नहीं हुआ है।" : "यह Live Test समाप्त हो चुका है।");
      return;
    }

    try {
      setJoining(true);
      let questions = normalizeQuestions(test.questions);

      // Questions Zone / Existing Test से questions लें।
      if (questions.length === 0 && test.testId) {
        const snap = await get(ref(db, `tests/${String(test.testId).trim()}`));
        if (snap.exists()) questions = normalizeQuestions(snap.val()?.questions);
      }

      const finalTest = {
        ...test,
        id: test.id,
        testName: test.testName || "Live Test",
        examName: test.examName || "Competitive Exam",
        duration: Number(test.duration) || 30,
        totalQuestions: Number(test.totalQuestions) || 25,
        questions,
      };

      if (typeof onJoinTest === "function") {
        await onJoinTest(finalTest);
      }
    } catch (error) {
      console.error(error);
      alert(`❌ Live Test open नहीं हो पाया:\n${error.message}`);
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return <div className="live-test-container"><div className="live-loading">🔄 Live Tests load हो रहे हैं...</div></div>;
  }

  return (
    <div className="live-test-container" style={{ padding: 16 }}>
      <div className="live-test-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <div className="live-badge">🔴 LIVE TEST</div>
          <h1>Live Tests</h1>
          <p>अभी चल रहे और आने वाले Live Tests</p>
        </div>
        {onBack && <button type="button" className="live-back-btn" onClick={onBack}>← Home</button>}
      </div>

      {tests.length === 0 ? (
        <div className="live-empty">अभी कोई Published Live Test उपलब्ध नहीं है।</div>
      ) : (
        <div className="live-test-list">
          {tests.map((test) => {
            const status = getStatus(test);
            const canJoin = status === "LIVE";
            return (
              <div className="live-test-card" key={test.id}>
                <div className="live-test-icon">{test.examIcon || "📝"}</div>
                <div className="live-test-info">
                  <h2>{test.testName}</h2>
                  <p>📚 {test.examName || "Competitive Exam"}</p>
                  <p>📝 {test.totalQuestions || 25} Questions · ⏱️ {test.duration || 30} Minutes</p>
                  <p>🟢 Start: {formatDate(test.startTime)}</p>
                  <p>🔴 End: {formatDate(test.endTime)}</p>
                  <p>📖 Source: {test.questionSource === "ncert" ? "NCERT + Gemini" : test.questionSource === "gemini" ? "Gemini AI" : test.questionSource === "json" ? "Questions JSON" : "Questions Zone"}</p>
                </div>
                <div className={`live-test-status ${status.toLowerCase()}`}>
                  {status === "LIVE" ? "🔴 LIVE" : status === "UPCOMING" ? "⏰ UPCOMING" : "⚫ ENDED"}
                </div>
                <button type="button" className="join-live-btn" disabled={!canJoin || joining} onClick={() => handleJoin(test)}>
                  {joining ? "Opening..." : canJoin ? "🚀 Join Live Test" : status === "UPCOMING" ? "⏳ Waiting" : "Ended"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
