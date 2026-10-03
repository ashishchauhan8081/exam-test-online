import React, { useEffect, useMemo, useState } from "react";
import { ref, update } from "firebase/database";
import { db } from "../firebase";
import "./LiveGeminiTest.css";

const LETTERS = ["A", "B", "C", "D"];

function ShareButton({
  title = "Exam Test",
  text = "Exam Test पर Live Test देखें",
  url,
}) {
  const share = async () => {
    const shareUrl = url || window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({
          title,
          text,
          url: shareUrl,
        });
        return;
      }

      await navigator.clipboard.writeText(shareUrl);
      alert(
        "🔗 Link copy हो गया। अब WhatsApp, Telegram या किसी भी जगह share कर सकते हैं।"
      );
    } catch (e) {
      if (e?.name !== "AbortError") {
        try {
          await navigator.clipboard.writeText(shareUrl);
          alert("🔗 Link copy हो गया।");
        } catch {
          window.prompt("इस link को copy करें:", shareUrl);
        }
      }
    }
  };

  return (
    <button type="button" className="share-live-btn" onClick={share}>
      📤 Share
    </button>
  );
}

/* =========================================================
   EXPLANATION HELPERS
   Submit से पहले answer/explanation कभी नहीं दिखेगा।
   Submit के बाद explanation को points में दिखाया जाएगा।
========================================================= */

const makeExplanationPoints = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || "").trim())
      .filter(Boolean);
  }

  const text = String(value || "").trim();

  if (!text) {
    return ["इस प्रश्न की व्याख्या उपलब्ध नहीं है।"];
  }

  // पहले bullets / नई lines को अलग करें।
  let parts = text
    .split(/\r?\n+/)
    .map((item) =>
      item
        .replace(/^\s*(?:[-•*]|\d+[\.\)])\s*/, "")
        .trim()
    )
    .filter(Boolean);

  // यदि नई लाइन में points नहीं हैं तो sentences अलग करें।
  if (parts.length <= 1) {
    parts = text
      .split(/(?<=[।!?])\s+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return parts.length ? parts : [text];
};

const normalizeQuestion = (q, i) => {
  const options = Array.isArray(q?.options)
    ? q.options
    : [q?.options?.A, q?.options?.B, q?.options?.C, q?.options?.D];

  let answer = q?.answerIndex ?? q?.answer ?? 0;

  if (typeof answer === "string") {
    const s = answer.trim().toUpperCase();

    answer = LETTERS.indexOf(s);

    if (answer < 0 && !Number.isNaN(Number(s))) {
      answer = Number(s);
    }
  }

  answer = Number(answer);

  if (!Number.isInteger(answer) || answer < 0 || answer > 3) {
    answer = 0;
  }

  const rawExplanation =
    q?.explanation ||
    q?.solution ||
    q?.explanationPoints ||
    "व्याख्या उपलब्ध नहीं है।";

  return {
    id: q?.id || `q-${i}`,
    question: String(q?.question || q?.questionText || ""),
    options: [0, 1, 2, 3].map((n) =>
      String(options?.[n] || "")
    ),
    answer,
    explanation: String(
      Array.isArray(rawExplanation)
        ? rawExplanation.join("\n")
        : rawExplanation
    ),
    explanationPoints: makeExplanationPoints(rawExplanation),
  };
};

export default function LiveGeminiTest({ test, onBack }) {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [current, setCurrent] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const [secondsLeft, setSecondsLeft] = useState(
    (Number(test?.duration) || 30) * 60
  );

  const testQuestions = useMemo(
    () => questions.slice(0, 25),
    [questions]
  );

  /* =========================================================
     LOAD 25 QUESTIONS
  ========================================================= */

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const saved = Array.isArray(test?.questions)
          ? test.questions
          : [];

        if (saved.length >= 25) {
          if (!cancelled) {
            setQuestions(
              saved
                .slice(0, 25)
                .map(normalizeQuestion)
            );
            setLoading(false);
          }

          return;
        }

        const response = await fetch("/api/mcq", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            topic:
              test?.topic ||
              test?.examName ||
              "General Competitive Exam",

            exam:
              test?.examName ||
              "Competitive Exam",

            count: 25,
            language: "Hindi",
            difficulty:
              test?.difficulty ||
              "Medium",

            currentAffairs: Boolean(
              test?.currentAffairs
            ),

            // Backend prompt के लिए instruction:
            // हर question की explanation कम से कम 5
            // स्पष्ट points में generate की जाए।
            explanationPoints: 5,
          }),
        });

        const data = await response.json();

        if (
          !response.ok ||
          !data.success ||
          !Array.isArray(data.questions)
        ) {
          throw new Error(
            data?.error ||
              "Gemini से 25 प्रश्न प्राप्त नहीं हुए।"
          );
        }

        const qs = data.questions
          .slice(0, 25)
          .map(normalizeQuestion);

        if (qs.length < 25) {
          throw new Error(
            "Gemini ने 25 पूरे प्रश्न नहीं दिए।"
          );
        }

        if (!cancelled) {
          setQuestions(qs);
          setLoading(false);

          // Generated set को Live Test में save करें।
          if (test?.id) {
            try {
              await update(
                ref(
                  db,
                  `liveTests/${test.id}`
                ),
                {
                  questions: qs,
                  questionsGeneratedAt:
                    new Date().toISOString(),
                }
              );
            } catch (saveError) {
              console.warn(
                "Could not cache generated questions:",
                saveError
              );
            }
          }
        }
      } catch (e) {
        if (!cancelled) {
          setError(
            e?.message ||
              "Live Test load नहीं हो पाया।"
          );
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [test]);

  /* =========================================================
     SCORE
  ========================================================= */

  const score = useMemo(() => {
    return testQuestions.reduce(
      (total, q, i) =>
        total +
        (Number(answers[i]) === q.answer
          ? 1
          : 0),
      0
    );
  }, [testQuestions, answers]);

  const answered = Object.keys(answers).length;

  const percentage =
    testQuestions.length > 0
      ? Math.round(
          (score / testQuestions.length) *
            100
        )
      : 0;

  /* =========================================================
     SUBMIT
     Submit के बाद ही Result + सही उत्तर + व्याख्या
  ========================================================= */

  const handleSubmit = async (auto = false) => {
    if (
      submitting ||
      showResult ||
      !testQuestions.length
    ) {
      return;
    }

    if (!auto) {
      const confirmed = window.confirm(
        `क्या आप Test Submit करना चाहते हैं?\n\nAttempt किए गए प्रश्न: ${answered}/25`
      );

      if (!confirmed) {
        return;
      }
    }

    setSubmitting(true);

    try {
      if (test?.id) {
        const next =
          Math.max(
            0,
            Number(test.participants || 0)
          ) + 1;

        await update(
          ref(db, `liveTests/${test.id}`),
          {
            participants: next,
          }
        );
      }
    } catch (e) {
      console.warn(
        "Participant count update failed:",
        e
      );
    }

    // Submit के तुरंत बाद result + explanation दिखेगा।
    setSubmitting(false);
    setShowResult(true);
    setCurrent(0);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  /* =========================================================
     TIMER
  ========================================================= */

  useEffect(() => {
    if (
      loading ||
      showResult ||
      submitting
    ) {
      return;
    }

    if (secondsLeft <= 0) {
      handleSubmit(true);
      return;
    }

    const timer = setInterval(() => {
      setSecondsLeft((s) =>
        Math.max(0, s - 1)
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [
    loading,
    showResult,
    submitting,
    secondsLeft,
  ]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(
      seconds / 60
    )
      .toString()
      .padStart(2, "0");

    const secs = (seconds % 60)
      .toString()
      .padStart(2, "0");

    return `${minutes}:${secs}`;
  };

  /* =========================================================
     RESTART
  ========================================================= */

  const restartTest = () => {
    setAnswers({});
    setCurrent(0);
    setShowResult(false);
    setSubmitting(false);
    setSecondsLeft(
      (Number(test?.duration) || 30) * 60
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <div className="live-runner-wrap">
        <div className="live-runner-card">
          <div className="live-loading">
            🤖 Gemini से 25 प्रश्न तैयार हो रहे हैं...
          </div>
        </div>
      </div>
    );
  }

  /* =========================================================
     ERROR
  ========================================================= */

  if (error) {
    return (
      <div className="live-runner-wrap">
        <div className="live-runner-card">
          <h2>❌ Live Test</h2>
          <p>{error}</p>

          <button
            className="live-back-btn"
            onClick={onBack}
          >
            ← वापस जाएँ
          </button>
        </div>
      </div>
    );
  }

  /* =========================================================
     RESULT PAGE
     Submit के बाद यही पूरा section दिखाई देगा।
  ========================================================= */

  if (showResult) {
    return (
      <div className="live-runner-wrap">
        <div className="live-runner-card">
          <div className="live-runner-header">
            <div>
              <div className="live-badge">
                🏆 TEST RESULT
              </div>

              <h1>
                {test?.testName ||
                  "Live Test"}
              </h1>

              <p>
                📚{" "}
                {test?.examName ||
                  "Competitive Exam"}{" "}
                · 📝 25 Questions
              </p>
            </div>

            <div className="live-header-actions">
              <ShareButton
                title={
                  test?.testName ||
                  "Exam Test"
                }
                text={`मैंने ${
                  test?.testName ||
                  "Live Test"
                } दिया।`}
              />
            </div>
          </div>

          {/* SCORE */}
          <div className="live-result">
            <div className="result-circle">
              {score}
              <small>/25</small>
            </div>

            <h2>
              🎉 Test Complete
            </h2>

            <p>
              आपका Score:{" "}
              <strong>
                {score}/25
              </strong>{" "}
              ({percentage}%)
            </p>

            <div className="result-summary">
              <div>
                ✅ सही{" "}
                <strong>
                  {score}
                </strong>
              </div>

              <div>
                ❌ गलत{" "}
                <strong>
                  {answered - score}
                </strong>
              </div>

              <div>
                ⭕ छोड़े{" "}
                <strong>
                  {25 - answered}
                </strong>
              </div>
            </div>

            <h2 style={{ marginTop: 30 }}>
              📖 सही उत्तर + विस्तृत व्याख्या
            </h2>

            {/* =================================================
                ALL 25 QUESTIONS
                सही answer केवल Submit के बाद।
            ================================================= */}

            {testQuestions.map((q, i) => {
              const userAnswer =
                answers[i];

              const isCorrect =
                Number(userAnswer) ===
                q.answer;

              const points =
                q.explanationPoints?.length
                  ? q.explanationPoints
                  : [
                      q.explanation ||
                        "व्याख्या उपलब्ध नहीं है।",
                    ];

              return (
                <div
                  className={`result-question ${
                    isCorrect
                      ? "correct"
                      : "wrong"
                  }`}
                  key={q.id}
                  style={{
                    marginTop: 20,
                    padding: 18,
                    borderRadius: 12,
                    border:
                      "1px solid #dbe3ef",
                    background:
                      "#ffffff",
                  }}
                >
                  <h3
                    style={{
                      marginTop: 0,
                    }}
                  >
                    Q{i + 1}.{" "}
                    {q.question}
                  </h3>

                  <p>
                    आपका उत्तर:{" "}
                    <strong>
                      {userAnswer ===
                      undefined
                        ? "नहीं दिया"
                        : `${LETTERS[
                            Number(
                              userAnswer
                            )
                          ]
                          }. ${
                            q.options[
                              Number(
                                userAnswer
                              )
                            ]
                          }`}
                    </strong>
                  </p>

                  <p>
                    सही उत्तर:{" "}
                    <strong>
                      {LETTERS[q.answer]}.{" "}
                      {q.options[q.answer]}
                    </strong>
                  </p>

                  <div
                    style={{
                      marginTop: 12,
                    }}
                  >
                    <strong>
                      📚 व्याख्या:
                    </strong>

                    <ol
                      style={{
                        marginTop: 8,
                        paddingLeft: 24,
                      }}
                    >
                      {points.map(
                        (point, pi) => (
                          <li
                            key={pi}
                            style={{
                              marginBottom: 7,
                              lineHeight: 1.55,
                            }}
                          >
                            {point}
                          </li>
                        )
                      )}
                    </ol>

                    {points.length < 5 && (
                      <p
                        style={{
                          color:
                            "#b45309",
                          fontSize: 13,
                        }}
                      >
                        ⚠️ इस प्रश्न की saved
                        explanation में अभी{" "}
                        {points.length} point
                        उपलब्ध हैं। नए Gemini
                        questions के लिए
                        backend में 5-point
                        explanation instruction
                        भी रखें।
                      </p>
                    )}
                  </div>
                </div>
              );
            })}

            <div className="result-actions">
              <ShareButton
                title={
                  test?.testName ||
                  "Exam Test"
                }
                text={`मैंने ${
                  test?.testName ||
                  "Live Test"
                } दिया।`}
              />

              <button
                className="primary"
                type="button"
                onClick={restartTest}
              >
                🔄 Test दोबारा दें
              </button>

              <button
                className="live-back-btn"
                type="button"
                onClick={onBack}
              >
                ← Live Tests पर जाएँ
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* =========================================================
     TEST PAGE
     केवल एक question एक समय पर।
     ========================================================= */

  const question =
    testQuestions[current];

  if (!question) {
    return null;
  }

  const selected =
    answers[current];

  const isLast =
    current ===
    testQuestions.length - 1;

  return (
    <div className="live-runner-wrap">
      <div className="live-runner-card">
        {/* HEADER */}
        <div className="live-runner-header">
          <div>
            <div className="live-badge">
              🔴 LIVE TEST
            </div>

            <h1>
              {test?.testName ||
                "Live Test"}
            </h1>

            <p>
              📚{" "}
              {test?.examName ||
                "Competitive Exam"}{" "}
              · 📝 25 Questions
            </p>
          </div>

          <div className="live-header-actions">
            <div
              className={`live-timer ${
                secondsLeft < 60
                  ? "danger"
                  : ""
              }`}
            >
              ⏱️{" "}
              {formatTime(
                secondsLeft
              )}
            </div>

            <ShareButton
              title={
                test?.testName ||
                "Exam Test"
              }
              text="यह Live Test देखें"
            />
          </div>
        </div>

        {/* PROGRESS */}
        <div
          className="question-progress"
          style={{
            marginBottom: 16,
          }}
        >
          प्रश्न{" "}
          <strong>
            {current + 1}/
            {testQuestions.length}
          </strong>

          <span
            style={{
              marginLeft: 15,
            }}
          >
            Attempted:{" "}
            <strong>
              {answered}/
              {testQuestions.length}
            </strong>
          </span>
        </div>

        {/* CURRENT QUESTION ONLY */}
        <div
          className="live-question"
          key={question.id}
        >
          <h2>
            Q{current + 1}.{" "}
            {question.question}
          </h2>

          <div className="live-options">
            {question.options.map(
              (opt, oi) => (
                <button
                  type="button"
                  key={oi}
                  className={
                    Number(
                      selected
                    ) === oi
                      ? "selected"
                      : ""
                  }
                  onClick={() =>
                    setAnswers(
                      (prev) => ({
                        ...prev,
                        [current]:
                          oi,
                      })
                    )
                  }
                >
                  <span>
                    {LETTERS[oi]}
                  </span>

                  {opt}
                </button>
              )
            )}
          </div>
        </div>

        {/* NAVIGATION */}
        <div
          className="test-navigation"
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            gap: 12,
            marginTop: 22,
          }}
        >
          <button
            type="button"
            className="live-back-btn"
            disabled={
              current === 0
            }
            onClick={() =>
              setCurrent(
                (value) =>
                  Math.max(
                    0,
                    value - 1
                  )
              )
            }
          >
            ← Previous
          </button>

          {!isLast ? (
            <button
              type="button"
              className="submit-live-btn"
              onClick={() =>
                setCurrent(
                  (value) =>
                    Math.min(
                      testQuestions.length -
                        1,
                      value + 1
                    )
                )
              }
            >
              Next →
            </button>
          ) : (
            <button
              type="button"
              className="submit-live-btn"
              onClick={() =>
                handleSubmit(false)
              }
              disabled={submitting}
            >
              {submitting
                ? "Submitting..."
                : "✅ Submit Test"}
            </button>
          )}
        </div>

        {/* QUESTION NUMBER NAVIGATION */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 7,
            marginTop: 22,
          }}
        >
          {testQuestions.map(
            (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() =>
                  setCurrent(i)
                }
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 8,
                  border:
                    current === i
                      ? "2px solid #2563eb"
                      : "1px solid #cbd5e1",
                  background:
                    current === i
                      ? "#dbeafe"
                      : answers[i] !==
                        undefined
                      ? "#dcfce7"
                      : "#fff",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                {i + 1}
              </button>
            )
          )}
        </div>

        {/* SUBMIT NOTE */}
        <div
          style={{
            marginTop: 18,
            padding: 12,
            borderRadius: 10,
            background: "#f8fafc",
            color: "#475569",
            fontSize: 14,
          }}
        >
          ℹ️ अभी केवल प्रश्न और options
          दिखाई देंगे। <strong>Submit Test</strong>{" "}
          करने के बाद ही सही उत्तर और
          व्याख्या दिखाई जाएगी।
        </div>
      </div>
    </div>
  );
}
