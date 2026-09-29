import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

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

function getLocalQuestions(
  examId,
  testNumber
) {
  const folder =
    EXAM_FOLDERS[examId] ||
    examId;

  const number = String(
    testNumber ?? 1
  ).padStart(2, "0");

  const key =
    `../data/questions/${folder}/test${number}.js`;

  const mod =
    TEST_MODULES[key];

  return (
    mod?.default ||
    mod?.questions ||
    mod?.test?.questions ||
    []
  );
}

// ======================================================
// GET QUESTIONS
// ======================================================

function getQuestions(test) {
  // Firebase Array
  if (
    Array.isArray(test?.questions) &&
    test.questions.length > 0
  ) {
    return test.questions.slice(
      0,
      150
    );
  }

  // Firebase Object
  if (
    test?.questions &&
    typeof test.questions ===
      "object"
  ) {
    const firebaseQuestions =
      Object.values(
        test.questions
      );

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
    test?.examId ||
      test?.exam ||
      test?.examName,
    test?.testNumber ??
      test?.testNo ??
      test?.number
  ).slice(0, 150);
}

// ======================================================
// OPTIONS
// ======================================================

function getOptions(q) {
  if (
    Array.isArray(q?.options)
  ) {
    return q.options.map(
      (value, index) => ({
        key: String.fromCharCode(
          65 + index
        ),
        value:
          typeof value ===
          "object"
            ? value?.value ??
              value?.text ??
              ""
            : value,
      })
    );
  }

  if (
    q?.options &&
    typeof q.options ===
      "object"
  ) {
    return Object.entries(
      q.options
    ).map(
      ([key, value], index) => ({
        key:
          String(key).toUpperCase(),
        value:
          typeof value ===
          "object"
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
// NORMALIZE ANSWER
// ======================================================

function normalizeAnswer(
  value
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return "";
  }

  // Number
  if (
    typeof value === "number"
  ) {
    if (
      value >= 1 &&
      value <= 4
    ) {
      return String.fromCharCode(
        64 + value
      );
    }

    if (
      value === 0
    ) {
      return "A";
    }
  }

  const text =
    String(value)
      .trim();

  if (!text) {
    return "";
  }

  // A / B / C / D
  const letter =
    text.match(
      /^([A-Da-d])(?:[).:\-\s]|$)/
    );

  if (letter) {
    return letter[1].toUpperCase();
  }

  // Number as string
  if (
    /^\d+$/.test(text)
  ) {
    const n =
      Number(text);

    if (
      n >= 1 &&
      n <= 4
    ) {
      return String.fromCharCode(
        64 + n
      );
    }

    if (
      n === 0
    ) {
      return "A";
    }
  }

  return text
    .toLowerCase()
    .trim();
}

// ======================================================
// GET ANSWER
// ======================================================

function getAnswer(q) {
  return (
    q?.answer ??
    q?.correctAnswer ??
    q?.correct ??
    q?.correctOption ??
    q?.rightAnswer ??
    q?.right ??
    ""
  );
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

  if (
    Array.isArray(
      q?.important_facts
    )
  ) {
    return q.important_facts;
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
// CORRECT CHECK
// ======================================================

function isCorrect(
  q,
  selected
) {
  const correct =
    normalizeAnswer(
      getAnswer(q)
    );

  const userAnswer =
    normalizeAnswer(
      selected
    );

  if (
    !correct ||
    !userAnswer
  ) {
    return false;
  }

  // Direct match
  if (
    correct === userAnswer
  ) {
    return true;
  }

  // Compare option text
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
// STORAGE KEY
// ======================================================

function getStorageKey(test) {
  const id =
    test?.id ||
    `${test?.examId || test?.exam || "exam"}_${
      test?.testNumber ??
      test?.testNo ??
      test?.number ??
      1
    }`;

  return `study_with_power_test_${id}`;
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

  const questions =
    useMemo(
      () =>
        getQuestions(test),
      [test]
    );

  // ====================================================
  // DURATION
  // ====================================================

  const durationMinutes =
    Number(
      test?.durationMinutes ??
        test?.duration ??
        test?.timeLimit ??
        test?.time ??
        30
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
    Re-attempt / Review Mode

    true =
    पिछली attempt के answers,
    सही answer और explanation दिखेंगे
  */

  const [reviewMode, setReviewMode] =
    useState(false);

  const [timeLeft, setTimeLeft] =
    useState(
      durationMinutes * 60
    );

  // ====================================================
  // LOAD PREVIOUS ATTEMPT
  // ====================================================

  useEffect(() => {
    if (!test) return;

    const key =
      getStorageKey(test);

    try {
      const saved =
        localStorage.getItem(key);

      if (!saved) {
        setAnswers({});
        setFinished(false);
        setReviewMode(false);
        setCurrent(0);
        setTimeLeft(
          durationMinutes * 60
        );
        return;
      }

      const data =
        JSON.parse(saved);

      if (
        data &&
        data.answers
      ) {
        setAnswers(
          data.answers
        );
      }

      /*
        Previous result मौजूद है,
        इसलिए Test List से खोलने पर
        नया test शुरू होगा।
      */

      setFinished(false);
      setReviewMode(false);
      setCurrent(0);
      setTimeLeft(
        durationMinutes * 60
      );
    } catch (error) {
      console.error(
        "Previous test load error:",
        error
      );
    }
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
      reviewMode ||
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
    reviewMode,
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
  // SAVE RESULT
  // ====================================================

  const saveAttempt =
    () => {
      try {
        const key =
          getStorageKey(test);

        localStorage.setItem(
          key,
          JSON.stringify({
            answers,
            scoreData,
            completedAt:
              new Date().toISOString(),
          })
        );
      } catch (error) {
        console.error(
          "Attempt save error:",
          error
        );
      }
    };

  // ====================================================
  // SELECT ANSWER
  // ====================================================

  const choose = (
    value
  ) => {
    if (finished) {
      return;
    }

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
    const ok =
      window.confirm(
        "क्या आप Test Submit करना चाहते हैं?"
      );

    if (!ok) {
      return;
    }

    saveAttempt();

    setFinished(true);

    setReviewMode(false);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // ====================================================
  // RE-ATTEMPT / REVIEW
  // ====================================================

  const restartTest = () => {
    /*
      IMPORTANT:

      Answers को delete नहीं किया जा रहा।

      इसलिए:
      - आपका पुराना answer रहेगा
      - सही answer दिखाई देगा
      - explanation दिखाई देगी
      - important facts दिखाई देंगे
      - exam trick दिखाई देगी
    */

    setFinished(false);

    setReviewMode(true);

    setCurrent(0);

    /*
      Review mode में timer नहीं चलेगा
    */

    setTimeLeft(
      durationMinutes * 60
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // ====================================================
  // FRESH ATTEMPT
  // ====================================================

  const startFreshAttempt =
    () => {
      const ok =
        window.confirm(
          "क्या आप बिना पुराने उत्तर के नया Attempt शुरू करना चाहते हैं?"
        );

      if (!ok) {
        return;
      }

      setAnswers({});

      setCurrent(0);

      setFinished(false);

      setReviewMode(false);

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
      <main
        className="ai-container"
      >
        <div
          className="ai-card"
        >
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
              color:
                "#64748b",
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
      <main
        className="ai-container"
      >
        <div
          className="ai-card"
        >

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

            <h1>
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
              <b>
                ✅ सही
              </b>

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
              <b>
                ❌ गलत
              </b>

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
              <b>
                ⚪ छोड़े
              </b>

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

          {/* ANSWER EXPLANATION */}

          <h2>
            📖 उत्तर एवं व्याख्या
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
                    ) ===
                    selected
                );

              const correctOption =
                options.find(
                  (option) =>
                    normalizeAnswer(
                      option.key
                    ) ===
                    correct
                );

              const explanation =
                getExplanation(q);

              const importantFacts =
                getImportantFacts(
                  q
                );

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

                  {/* USER ANSWER */}

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

                  {/* CORRECT ANSWER */}

                  <div
                    style={{
                      marginTop: 8,
                      padding:
                        "10px 12px",
                      borderRadius: 10,
                      background:
                        "#ecfdf5",
                      color:
                        "#15803d",
                    }}
                  >
                    <strong>
                      ✅ सही उत्तर:
                    </strong>{" "}

                    {correctOption
                      ? `${correctOption.key}) ${correctOption.value}`
                      : getAnswer(
                          q
                        ) ||
                        "उपलब्ध नहीं"}
                  </div>

                  {/* STATUS */}

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
                      ? "✅ आपका उत्तर सही है"
                      : "❌ आपका उत्तर गलत है"}
                  </div>

                  {/* EXPLANATION */}

                  <div
                    style={{
                      marginTop: 12,
                      padding: 15,
                      borderRadius: 12,
                      background:
                        "#fff8e5",
                      border:
                        "1px solid #f1d58a",
                      lineHeight: 1.75,
                    }}
                  >
                    <div>
                      💡{" "}
                      <strong>
                        व्याख्या:
                      </strong>
                    </div>

                    <div
                      style={{
                        marginTop: 6,
                      }}
                    >
                      {explanation}
                    </div>
                  </div>

                  {/* IMPORTANT FACTS */}

                  {importantFacts.length >
                    0 && (
                    <div
                      style={{
                        marginTop: 12,
                        padding: 15,
                        borderRadius: 12,
                        background:
                          "#f8fafc",
                        border:
                          "1px solid #cbd5e1",
                        lineHeight: 1.8,
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 900,
                          marginBottom: 8,
                        }}
                      >
                        📌 महत्वपूर्ण तथ्य:
                      </div>

                      <ul
                        style={{
                          margin: 0,
                          paddingLeft: 24,
                        }}
                      >
                        {importantFacts.map(
                          (
                            fact,
                            factIndex
                          ) => (
                            <li
                              key={
                                factIndex
                              }
                            >
                              {fact}
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  )}

                  {/* EXAM TRICK */}

                  {examTrick && (
                    <div
                      style={{
                        marginTop: 12,
                        padding: 15,
                        borderRadius: 12,
                        background:
                          "#eef2ff",
                        border:
                          "1px solid #c7d2fe",
                        lineHeight: 1.8,
                        fontWeight: 700,
                      }}
                    >
                      🧠{" "}
                      <strong>
                        Exam Trick:
                      </strong>

                      <div
                        style={{
                          marginTop: 6,
                        }}
                      >
                        {examTrick}
                      </div>
                    </div>
                  )}
                </div>
              );
            }
          )}

          {/* BUTTONS */}

          <div
            style={{
              display:
                "flex",
              justifyContent:
                "center",
              gap: 12,
              flexWrap:
                "wrap",
              marginTop: 25,
            }}
          >
            <button
              type="button"
              className="ai-button"
              onClick={
                restartTest
              }
            >
              🔄 Re-attempt करें
              / उत्तर देखें
            </button>

            <button
              type="button"
              className="ai-button"
              onClick={
                startFreshAttempt
              }
            >
              🆕 नया Attempt
            </button>

            <button
              type="button"
              className="ai-button"
              onClick={onBack}
            >
              ← Test List
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ====================================================
  // CURRENT QUESTION
  // ====================================================

  const question =
    questions[current];

  const options =
    getOptions(question);

  const selected =
    normalizeAnswer(
      answers[current]
    );

  const correctAnswer =
    normalizeAnswer(
      getAnswer(question)
    );

  const correctOption =
    options.find(
      (option) =>
        normalizeAnswer(
          option.key
        ) ===
        correctAnswer
    );

  const explanation =
    getExplanation(
      question
    );

  const importantFacts =
    getImportantFacts(
      question
    );

  const examTrick =
    getExamTrick(
      question
    );

  // ====================================================
  // TEST PAGE
  // ====================================================

  return (
    <main
      className="ai-container"
    >
      <div
        className="ai-card"
      >

        {/* BACK */}

        <button
          type="button"
          className="ai-button"
          onClick={onBack}
        >
          ← Test Series
        </button>

        {/* REVIEW MODE NOTICE */}

        {reviewMode && (
          <div
            style={{
              marginTop: 15,
              padding: 15,
              borderRadius: 12,
              background:
                "#fff7ed",
              border:
                "1px solid #fed7aa",
              color:
                "#9a3412",
              fontWeight: 800,
              lineHeight: 1.6,
            }}
          >
            📖{" "}
            <strong>
              Re-attempt / Review Mode
            </strong>

            <br />

            आपके पिछले उत्तर,
            सही उत्तर और
            व्याख्या नीचे दिखाई
            जाएगी।
          </div>
        )}

        {/* HEADER */}

        <div
          style={{
            display:
              "flex",
            justifyContent:
              "space-between",
            alignItems:
              "center",
            gap: 15,
            flexWrap:
              "wrap",
            marginTop: 18,
          }}
        >
          <div>
            <h1
              style={{
                marginBottom: 6,
              }}
            >
              🎯{" "}
              {test?.examTitle ||
                test?.examName ||
                test?.exam ||
                ""}
            </h1>

            <h2
              style={{
                marginTop: 0,
              }}
            >
              {test?.title ||
                "Test"}
            </h2>
          </div>

          {/* TIMER */}

          {!reviewMode && (
            <div
              style={{
                fontSize: 28,
                fontWeight: 900,
                color:
                  timeLeft <=
                  60
                    ? "#dc2626"
                    : timeLeft <=
                      300
                    ? "#ea580c"
                    : "#0f172a",
              }}
            >
              ⏱️{" "}
              {formatTime(
                timeLeft
              )}
            </div>
          )}
        </div>

        {/* QUESTION AREA */}

        <div
          style={{
            marginTop: 20,
            padding: 20,
            borderRadius: 16,
            background:
              "#f8fafc",
            border:
              "1px solid #dce3ed",
          }}
        >

          {/* QUESTION HEADER */}

          <div
            style={{
              display:
                "flex",
              justifyContent:
                "space-between",
              gap: 10,
              flexWrap:
                "wrap",
            }}
          >
            <strong>
              प्रश्न{" "}
              {current + 1} /{" "}
              {questions.length}
            </strong>

            <strong>
              Answered:{" "}
              {
                Object.keys(
                  answers
                ).length
              }
            </strong>
          </div>

          {/* PROGRESS */}

          <div
            style={{
              width:
                "100%",
              height: 8,
              background:
                "#e5e7eb",
              borderRadius:
                10,
              overflow:
                "hidden",
              marginTop: 14,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                width:
                  `${
                    ((current + 1) /
                      questions.length) *
                    100
                  }%`,
                height:
                  "100%",
                background:
                  "#2563eb",
                transition:
                  "width 0.2s ease",
              }}
            />
          </div>

          {/* QUESTION */}

          <h2
            style={{
              lineHeight: 1.6,
              overflowWrap:
                "anywhere",
            }}
          >
            {current + 1}.{" "}
            {question?.question}
          </h2>

          {/* OPTIONS */}

          <div
            style={{
              display:
                "grid",
              gap: 12,
              marginTop: 18,
            }}
          >
            {options.map(
              (option) => {
                const active =
                  selected ===
                  normalizeAnswer(
                    option.key
                  );

                const isRight =
                  reviewMode &&
                  normalizeAnswer(
                    option.key
                  ) ===
                    correctAnswer;

                return (
                  <button
                    key={
                      option.key
                    }
                    type="button"
                    onClick={() =>
                      choose(
                        option.key
                      )
                    }
                    style={{
                      width:
                        "100%",
                      display:
                        "flex",
                      alignItems:
                        "flex-start",
                      gap: 10,
                      textAlign:
                        "left",
                      padding: 16,
                      borderRadius:
                        12,

                      border:
                        isRight
                          ? "3px solid #16a34a"
                          : active
                          ? "2px solid #2563eb"
                          : "1px solid #cbd5e1",

                      background:
                        isRight
                          ? "#dcfce7"
                          : active
                          ? "#eff6ff"
                          : "#fff",

                      color:
                        "#111827",

                      cursor:
                        "pointer",

                      fontSize:
                        17,

                      lineHeight:
                        1.5,

                      boxSizing:
                        "border-box",

                      overflowWrap:
                        "anywhere",
                    }}
                  >
                    <strong
                      style={{
                        minWidth: 28,
                      }}
                    >
                      {
                        option.key
                      }
                      )
                    </strong>

                    <span
                      style={{
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      {
                        option.value
                      }

                      {isRight && (
                        <span
                          style={{
                            marginLeft: 8,
                            color:
                              "#15803d",
                            fontWeight:
                              900,
                          }}
                        >
                          ✅ सही उत्तर
                        </span>
                      )}
                    </span>
                  </button>
                );
              }
            )}
          </div>

          {/* ==================================================
              REVIEW MODE — ANSWER + EXPLANATION
          ================================================== */}

          {reviewMode && (
            <div
              style={{
                marginTop: 20,
              }}
            >

              {/* CORRECT ANSWER */}

              <div
                style={{
                  padding: 15,
                  borderRadius: 12,
                  background:
                    "#ecfdf5",
                  border:
                    "1px solid #86efac",
                  color:
                    "#166534",
                  lineHeight: 1.7,
                }}
              >
                <strong>
                  ✅ सही उत्तर:
                </strong>{" "}

                {correctOption
                  ? `${correctOption.key}) ${correctOption.value}`
                  : getAnswer(
                      question
                    ) ||
                    "उपलब्ध नहीं"}
              </div>

              {/* YOUR ANSWER */}

              <div
                style={{
                  marginTop: 10,
                  padding: 15,
                  borderRadius: 12,
                  background:
                    isCorrect(
                      question,
                      answers[current]
                    )
                      ? "#ecfdf5"
                      : "#fef2f2",
                  border:
                    isCorrect(
                      question,
                      answers[current]
                    )
                      ? "1px solid #86efac"
                      : "1px solid #fecaca",
                  lineHeight: 1.7,
                }}
              >
                <strong>
                  आपका उत्तर:
                </strong>{" "}

                {selected
                  ? options.find(
                      (option) =>
                        normalizeAnswer(
                          option.key
                        ) ===
                        selected
                    )?.value ||
                    selected
                  : "नहीं दिया"}

                <div
                  style={{
                    marginTop: 5,
                    fontWeight: 900,
                  }}
                >
                  {selected
                    ? isCorrect(
                        question,
                        answers[current]
                      )
                      ? "✅ आपका उत्तर सही है"
                      : "❌ आपका उत्तर गलत है"
                    : "⚪ आपने उत्तर नहीं दिया"}
                </div>
              </div>

              {/* EXPLANATION */}

              <div
                style={{
                  marginTop: 12,
                  padding: 16,
                  borderRadius: 12,
                  background:
                    "#fff8e5",
                  border:
                    "1px solid #f1d58a",
                  lineHeight: 1.8,
                }}
              >
                <div
                  style={{
                    fontWeight: 900,
                    marginBottom: 7,
                  }}
                >
                  💡 व्याख्या
                </div>

                <div>
                  {explanation}
                </div>
              </div>

              {/* IMPORTANT FACTS */}

              {importantFacts.length >
                0 && (
                <div
                  style={{
                    marginTop: 12,
                    padding: 16,
                    borderRadius: 12,
                    background:
                      "#f8fafc",
                    border:
                      "1px solid #cbd5e1",
                    lineHeight: 1.8,
                  }}
                >
                  <strong>
                    📌 महत्वपूर्ण तथ्य:
                  </strong>

                  <ul
                    style={{
                      marginTop: 8,
                    }}
                  >
                    {importantFacts.map(
                      (
                        fact,
                        index
                      ) => (
                        <li
                          key={
                            index
                          }
                        >
                          {fact}
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}

              {/* EXAM TRICK */}

              {examTrick && (
                <div
                  style={{
                    marginTop: 12,
                    padding: 16,
                    borderRadius: 12,
                    background:
                      "#eef2ff",
                    border:
                      "1px solid #c7d2fe",
                    lineHeight: 1.8,
                  }}
                >
                  🧠{" "}
                  <strong>
                    Exam Trick:
                  </strong>

                  <div
                    style={{
                      marginTop: 6,
                    }}
                  >
                    {examTrick}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* NAVIGATION */}

        <div
          style={{
            display:
              "flex",
            justifyContent:
              "space-between",
            gap: 10,
            flexWrap:
              "wrap",
            marginTop: 20,
          }}
        >
          {/* PREVIOUS */}

          <button
            type="button"
            className="ai-button"
            disabled={
              current === 0
            }
            onClick={() =>
              setCurrent(
                (v) =>
                  Math.max(
                    0,
                    v - 1
                  )
              )
            }
          >
            ← पिछला
          </button>

          {/* NEXT / SUBMIT */}

          {current <
          questions.length -
            1 ? (
            <button
              type="button"
              className="ai-button"
              onClick={() =>
                setCurrent(
                  (v) =>
                    Math.min(
                      questions.length -
                        1,
                      v + 1
                    )
                )
              }
            >
              अगला →
            </button>
          ) : reviewMode ? (
            <button
              type="button"
              className="ai-button"
              onClick={
                onBack
              }
            >
              ← Test List
            </button>
          ) : (
            <button
              type="button"
              className="ai-button"
              onClick={
                submitTest
              }
            >
              ✅ Test Submit करें
            </button>
          )}
        </div>

      </div>
    </main>
  );
}
