import React, { useEffect, useMemo, useState } from "react";

// ======================================================
// LOCAL QUESTION FOLDERS — FALLBACK
// ======================================================

const EXAM_FOLDERS = {
  upsc: "upsc",
  uppcs: "uppcs",
  uppet: "uppet",
  upsssc: "upsssc",
  "ro-aro": "ro-aro",
  roaro: "ro-aro",
  bpsc: "bpsc",
  mppsc: "mppsc",
  ssc: "ssc",
  railway: "railway",
  police: "police",
  teaching: "teaching",
};

// ======================================================
// LOCAL TEST MODULES
// ======================================================

const TEST_MODULES = import.meta.glob(
  "../data/questions/*/test*.js",
  {
    eager: true,
  }
);

// ======================================================
// LOCAL QUESTIONS
// ======================================================

function getLocalQuestions(examId, testNumber) {
  const folder =
    EXAM_FOLDERS[examId] || examId;

  const number = String(
    testNumber ?? 1
  ).padStart(2, "0");

  const key =
    `../data/questions/${folder}/test${number}.js`;

  const mod = TEST_MODULES[key];

  return (
    mod?.default ||
    mod?.questions ||
    mod?.test?.questions ||
    []
  );
}

// ======================================================
// GET QUESTIONS
// Firebase → Local fallback
// ======================================================

function getQuestions(test) {
  // Firebase array
  if (
    Array.isArray(test?.questions) &&
    test.questions.length > 0
  ) {
    return test.questions.slice(0, 150);
  }

  // Firebase object
  if (
    test?.questions &&
    typeof test.questions === "object"
  ) {
    const firebaseQuestions =
      Object.values(test.questions);

    if (
      firebaseQuestions.length > 0
    ) {
      return firebaseQuestions.slice(
        0,
        150
      );
    }
  }

  // Local fallback
  return getLocalQuestions(
    test?.examId,
    test?.testNumber
  ).slice(0, 150);
}

// ======================================================
// OPTIONS
// ======================================================

function getOptions(q) {
  if (Array.isArray(q?.options)) {
    return q.options.map(
      (value, index) => ({
        key: String.fromCharCode(
          65 + index
        ),

        value:
          typeof value === "object"
            ? value?.value ??
              value?.text ??
              ""
            : value,
      })
    );
  }

  if (
    q?.options &&
    typeof q.options === "object"
  ) {
    return Object.entries(
      q.options
    ).map(
      ([key, value], index) => ({
        key:
          String(key).toUpperCase(),

        value:
          typeof value === "object"
            ? value?.value ??
              value?.text ??
              ""
            : value,

        index,
      })
    );
  }

  return [];
}

// ======================================================
// ANSWER NORMALIZATION
// ======================================================

function normalizeAnswer(value) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return "";
  }

  // Number
  if (typeof value === "number") {
    /*
      पहले 0,1,2,3 को A,B,C,D
    */
    if (
      value >= 0 &&
      value <= 3
    ) {
      return String.fromCharCode(
        65 + value
      );
    }

    /*
      1,2,3,4 को A,B,C,D
    */
    if (
      value >= 1 &&
      value <= 4
    ) {
      return String.fromCharCode(
        64 + value
      );
    }
  }

  const text =
    String(value).trim();

  if (!text) return "";

  // A / B / C / D
  const letter =
    text.match(
      /^([A-Da-d])(?:[).:\-\s]|$)/
    );

  if (letter) {
    return letter[1].toUpperCase();
  }

  // B) Answer
  const letterWithText =
    text.match(
      /^([A-Da-d])\s*[).:\-]\s*/
    );

  if (letterWithText) {
    return letterWithText[1].toUpperCase();
  }

  // Number string
  if (/^\d+$/.test(text)) {
    const n = Number(text);

    if (
      n >= 0 &&
      n <= 3
    ) {
      return String.fromCharCode(
        65 + n
      );
    }

    if (
      n >= 1 &&
      n <= 4
    ) {
      return String.fromCharCode(
        64 + n
      );
    }
  }

  return text
    .toLowerCase()
    .trim();
}

// ======================================================
// GET CORRECT ANSWER
// ======================================================

function getAnswer(q) {
  return (
    q?.answer ??
    q?.correctAnswer ??
    q?.correct ??
    q?.correctOption ??
    q?.rightAnswer ??
    ""
  );
}

// ======================================================
// CHECK ANSWER
// ======================================================

function isCorrect(q, selected) {
  const correct =
    normalizeAnswer(
      getAnswer(q)
    );

  const userAnswer =
    normalizeAnswer(selected);

  if (
    !correct ||
    !userAnswer
  ) {
    return false;
  }

  // Direct A/B/C/D
  if (
    correct === userAnswer
  ) {
    return true;
  }

  const options =
    getOptions(q);

  const selectedOption =
    options.find(
      (option) =>
        normalizeAnswer(
          option.key
        ) === userAnswer
    );

  const correctOption =
    options.find(
      (option) =>
        normalizeAnswer(
          option.key
        ) === correct
    );

  if (
    selectedOption &&
    correctOption
  ) {
    return (
      String(
        selectedOption.value
      )
        .trim()
        .toLowerCase() ===
      String(
        correctOption.value
      )
        .trim()
        .toLowerCase()
    );
  }

  return false;
}

// ======================================================
// GET EXPLANATION
// ======================================================

function getExplanation(q) {
  return (
    q?.explanation ??
    q?.व्याख्या ??
    q?.explanationText ??
    q?.solution ??
    q?.details ??
    "इस प्रश्न की व्याख्या उपलब्ध नहीं है।"
  );
}

// ======================================================
// GET IMPORTANT FACTS
// ======================================================

function getImportantFacts(q) {
  if (
    Array.isArray(
      q?.importantFacts
    )
  ) {
    return q.importantFacts;
  }

  if (
    Array.isArray(
      q?.महत्वपूर्णतथ्य
    )
  ) {
    return q.महत्वपूर्णतथ्य;
  }

  return [];
}

// ======================================================
// GET EXAM TRICK
// ======================================================

function getExamTrick(q) {
  return (
    q?.examTrick ??
    q?.exam_trick ??
    q?.ExamTrick ??
    q?.परीक्षाट्रिक ??
    ""
  );
}

// ======================================================
// TEST RUNNER
// ======================================================

export default function TestRunner({
  test,
  onBack,
}) {
  // ====================================================
  // QUESTIONS
  // ====================================================

  const questions = useMemo(
    () =>
      getQuestions(test),
    [test]
  );

  // ====================================================
  // STATE
  // ====================================================

  const [current, setCurrent] =
    useState(0);

  const [answers, setAnswers] =
    useState({});

  const [finished, setFinished] =
    useState(false);

  /*
    ⭐ नया state

    false = पहली बार Test

    true = Test दोबारा / Re-attempt
  */
  const [isReattempt, setIsReattempt] =
    useState(false);

  const durationMinutes =
    Number(
      test?.durationMinutes ??
        test?.duration ??
        30
    );

  const [timeLeft, setTimeLeft] =
    useState(
      durationMinutes * 60
    );

  // ====================================================
  // RESET WHEN NEW TEST OPENS
  // ====================================================

  useEffect(() => {
    setCurrent(0);
    setAnswers({});
    setFinished(false);

    /*
      नया Test खोलने पर
      Re-attempt mode बंद रहेगा
    */
    setIsReattempt(false);

    setTimeLeft(
      durationMinutes * 60
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, [
    test?.id,
    test?.examId,
    test?.testNumber,
    durationMinutes,
  ]);

  // ====================================================
  // TIMER
  // ====================================================

  useEffect(() => {
    if (
      finished ||
      !questions.length
    ) {
      return;
    }

    const timer =
      setInterval(() => {
        setTimeLeft(
          (previous) => {
            if (
              previous <= 1
            ) {
              clearInterval(
                timer
              );

              setFinished(true);

              return 0;
            }

            return previous - 1;
          }
        );
      }, 1000);

    return () =>
      clearInterval(timer);
  }, [
    finished,
    questions.length,
  ]);

  // ====================================================
  // SCORE
  // ====================================================

  const scoreData =
    useMemo(() => {
      let correct = 0;
      let wrong = 0;
      let unanswered = 0;

      questions.forEach(
        (q, index) => {
          const selected =
            answers[index];

          if (
            selected ===
              undefined ||
            selected === null ||
            selected === ""
          ) {
            unanswered++;
          } else if (
            isCorrect(
              q,
              selected
            )
          ) {
            correct++;
          } else {
            wrong++;
          }
        }
      );

      const marks =
        Number(
          test?.marksPerQuestion ??
            test?.marks ??
            1
        );

      const negativeMarks =
        test?.negativeMarking
          ? Number(
              test?.negativeMarks ??
                marks / 3
            )
          : 0;

      const score =
        correct * marks -
        wrong * negativeMarks;

      const percentage =
        questions.length
          ? (score /
              (questions.length *
                marks)) *
            100
          : 0;

      return {
        correct,
        wrong,
        unanswered,
        score,
        percentage,
      };
    }, [
      answers,
      questions,
      test,
    ]);

  // ====================================================
  // SELECT ANSWER
  // ====================================================

  const choose = (value) => {
    if (finished) return;

    setAnswers(
      (previous) => ({
        ...previous,
        [current]: value,
      })
    );
  };

  // ====================================================
  // SUBMIT
  // ====================================================

  const submitTest = () => {
    if (
      window.confirm(
        "क्या आप Test Submit करना चाहते हैं?"
      )
    ) {
      setFinished(true);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  };

  // ====================================================
  // RESTART / RE-ATTEMPT
  // ====================================================

  const restartTest = () => {
    /*
      ⭐ सबसे महत्वपूर्ण बदलाव

      अब Restart के बाद
      Re-attempt mode TRUE होगा।
    */

    setIsReattempt(true);

    setCurrent(0);

    setAnswers({});

    setFinished(false);

    setTimeLeft(
      durationMinutes * 60
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // ====================================================
  // TIMER FORMAT
  // ====================================================

  const formatTime = (
    seconds
  ) => {
    const minutes =
      Math.floor(
        seconds / 60
      )
        .toString()
        .padStart(2, "0");

    const secs =
      (seconds % 60)
        .toString()
        .padStart(2, "0");

    return `${minutes}:${secs}`;
  };

  // ====================================================
  // NO QUESTIONS
  // ====================================================

  if (
    !questions.length
  ) {
    return (
      <main className="ai-container">
        <div className="ai-card">

          <h2>
            📚{" "}
            {test?.examTitle ||
              test?.examName ||
              "Test"}
          </h2>

          <h3>
            {test?.title ||
              "Test"}
          </h3>

          <p>
            इस Test में अभी
            कोई Question उपलब्ध
            नहीं है।
          </p>

          <p
            style={{
              color: "#64748b",
            }}
          >
            कृपया Admin Panel में
            इस Test के Questions
            जोड़ें।
          </p>

          <button
            type="button"
            className="ai-button"
            onClick={onBack}
          >
            ← वापस जाएँ
          </button>

        </div>
      </main>
    );
  }

  // ====================================================
  // RESULT PAGE
  // ====================================================

  if (finished) {
    return (
      <main className="ai-container">

        <div className="ai-card">

          {/* RESULT HEADER */}

          <div
            style={{
              textAlign:
                "center",
              padding:
                "10px 5px 25px",
            }}
          >

            <div
              style={{
                fontSize: 55,
              }}
            >
              🏆
            </div>

            <h1
              style={{
                margin:
                  "8px 0",
              }}
            >
              Test Result
            </h1>

            <h2>
              {test?.examTitle ||
                test?.examName ||
                ""}{" "}
              —{" "}
              {test?.title ||
                "Test"}
            </h2>

            <div
              style={{
                display:
                  "inline-block",

                marginTop: 15,

                padding:
                  "18px 30px",

                borderRadius: 16,

                background:
                  "#eafaf0",

                color:
                  "#137333",

                fontSize: 30,

                fontWeight: 900,
              }}
            >
              {scoreData.score.toFixed(
                2
              )}
            </div>

            <p
              style={{
                fontSize: 18,
              }}
            >
              Score:{" "}
              <strong>
                {scoreData.score.toFixed(
                  2
                )}
              </strong>
            </p>

            <p>
              Percentage:{" "}
              <strong>
                {scoreData.percentage.toFixed(
                  2
                )}
                %
              </strong>
            </p>

          </div>

          {/* SUMMARY */}

          <div
            style={{
              display:
                "grid",

              gridTemplateColumns:
                "repeat(auto-fit, minmax(130px, 1fr))",

              gap: 12,

              margin:
                "20px 0",
            }}
          >

            <div
              style={{
                padding: 18,
                borderRadius: 14,
                background:
                  "#ecfdf5",
                textAlign:
                  "center",
              }}
            >
              <b>✅ सही</b>

              <div
                style={{
                  fontSize: 28,
                }}
              >
                {
                  scoreData.correct
                }
              </div>
            </div>

            <div
              style={{
                padding: 18,
                borderRadius: 14,
                background:
                  "#fef2f2",
                textAlign:
                  "center",
              }}
            >
              <b>❌ गलत</b>

              <div
                style={{
                  fontSize: 28,
                }}
              >
                {
                  scoreData.wrong
                }
              </div>
            </div>

            <div
              style={{
                padding: 18,
                borderRadius: 14,
                background:
                  "#f8fafc",
                textAlign:
                  "center",
              }}
            >
              <b>⚪ छोड़े</b>

              <div
                style={{
                  fontSize: 28,
                }}
              >
                {
                  scoreData.unanswered
                }
              </div>
            </div>

          </div>

          {/* EXPLANATION */}

          <h2>
            📖 प्रश्नों की व्याख्या
          </h2>

          {questions.map(
            (q, i) => {

              const options =
                getOptions(q);

              const selected =
                normalizeAnswer(
                  answers[i]
                );

              const correct =
                normalizeAnswer(
                  getAnswer(q)
                );

              const selectedOption =
                options.find(
                  (option) =>
                    normalizeAnswer(
                      option.key
                    ) === selected
                );

              const correctOption =
                options.find(
                  (option) =>
                    normalizeAnswer(
                      option.key
                    ) === correct
                );

              const explanation =
                getExplanation(q);

              const importantFacts =
                getImportantFacts(q);

              const examTrick =
                getExamTrick(q);

              const correctAnswer =
                isCorrect(
                  q,
                  answers[i]
                );

              return (
                <div
                  key={
                    q?.id ?? i
                  }
                  style={{
                    marginTop: 18,
                    padding: 18,
                    borderRadius: 16,
                    border:
                      "1px solid #dce3ed",
                    background:
                      "#fff",
                  }}
                >

                  <h3
                    style={{
                      marginTop: 0,
                      lineHeight: 1.6,
                    }}
                  >
                    प्रश्न{" "}
                    {i + 1}.{" "}
                    {q?.question}
                  </h3>

                  <div
                    style={{
                      marginTop: 8,
                    }}
                  >
                    <strong>
                      आपका उत्तर:
                    </strong>{" "}

                    {selectedOption
                      ? `${selectedOption.key}) ${selectedOption.value}`
                      : "नहीं दिया"}
                  </div>

                  <div
                    style={{
                      marginTop: 6,
                      color:
                        "#15803d",
                    }}
                  >
                    <strong>
                      सही उत्तर:
                    </strong>{" "}

                    {correctOption
                      ? `${correctOption.key}) ${correctOption.value}`
                      : getAnswer(
                          q
                        ) ||
                        "उपलब्ध नहीं"}
                  </div>

                  <div
                    style={{
                      marginTop: 8,
                      fontWeight: 800,
                    }}
                  >
                    {answers[i] ===
                    undefined
                      ? "⚪ अनुत्तरित"
                      : correctAnswer
                      ? "✅ सही उत्तर"
                      : "❌ गलत उत्तर"}
                  </div>

                  {/* EXPLANATION */}

                  <div
   
