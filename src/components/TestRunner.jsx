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
  if (
    Array.isArray(test?.questions) &&
    test.questions.length > 0
  ) {
    return test.questions.slice(0, 150);
  }

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

  if (typeof value === "number") {
    if (
      value >= 0 &&
      value <= 3
    ) {
      return String.fromCharCode(
        65 + value
      );
    }

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

  const letter =
    text.match(
      /^([A-Da-d])(?:[).:\-\s]|$)/
    );

  if (letter) {
    return letter[1].toUpperCase();
  }

  const letterWithText =
    text.match(
      /^([A-Da-d])\s*[).:\-]\s*/
    );

  if (letterWithText) {
    return letterWithText[1].toUpperCase();
  }

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

function isCorrect(
  q,
  selected
) {
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

  // TRUE = RE-ATTEMPT
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
  // RE-ATTEMPT
  // ====================================================

  const restartTest = () => {
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

          {/* EXPLANATIONS */}

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
                      : getAnswer(q) ||
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
                    style={{
                      marginTop: 14,
                      padding: 15,
                      borderRadius: 12,
                      background:
                        "#f8fafc",
                      lineHeight: 1.7,
                    }}
                  >
                    <strong>
                      📖 व्याख्या:
                    </strong>

                    <div
                      style={{
                        marginTop: 6,
                        whiteSpace:
                          "pre-wrap",
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
                          "#eff6ff",
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
                              style={{
                                marginBottom: 5,
                              }}
                            >
                              {typeof fact ===
                              "object"
                                ? fact?.text ??
                                  fact?.value ??
                                  JSON.stringify(
                                    fact
                                  )
                                : fact}
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
                          "#fff7ed",
                      }}
                    >
                      <strong>
                        💡 Exam Trick:
                      </strong>

                      <div
                        style={{
                          marginTop: 6,
                          whiteSpace:
                            "pre-wrap",
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

          {/* RESULT BUTTONS */}

          <div
            style={{
              display:
                "flex",
              flexWrap:
                "wrap",
              gap: 12,
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
              🔄 Re-attempt Test
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

  const correct =
    normalizeAnswer(
      getAnswer(question)
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

  const hasSelected =
    answers[current] !==
      undefined &&
    answers[current] !==
      null &&
    answers[current] !== "";

  const currentIsCorrect =
    hasSelected &&
    isCorrect(
      question,
      answers[current]
    );

  // ====================================================
  // RENDER TEST
  // ====================================================

  return (
    <main className="ai-container">

      <div className="ai-card">

        {/* HEADER */}

        <div
          style={{
            display:
              "flex",
            justifyContent:
              "space-between",
            alignItems:
              "center",
            gap: 10,
            flexWrap:
              "wrap",
          }}
        >

          <div>
            <h2
              style={{
                margin:
                  "0 0 5px",
              }}
            >
              {test?.examTitle ||
                test?.examName ||
                "Exam Test"}
            </h2>

            <div
              style={{
                color:
                  "#64748b",
              }}
            >
              {test?.title ||
                "Test"}{" "}
              • प्रश्न{" "}
              {current + 1}
              /
              {questions.length}
            </div>
          </div>

          <div
            style={{
              padding:
                "10px 16px",
              borderRadius: 12,
              background:
                timeLeft <= 60
                  ? "#fee2e2"
                  : "#eff6ff",
              color:
                timeLeft <= 60
                  ? "#b91c1c"
                  : "#1d4ed8",
              fontWeight: 900,
              fontSize: 18,
            }}
          >
            ⏱️{" "}
            {formatTime(
              timeLeft
            )}
          </div>

        </div>

        {/* PROGRESS */}

        <div
          style={{
            marginTop: 18,
            height: 8,
            background:
              "#e5e7eb",
            borderRadius: 999,
            overflow:
              "hidden",
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
              height: "100%",
              background:
                "#2563eb",
              transition:
                "width .2s ease",
            }}
          />
        </div>

        {/* QUESTION */}

        <div
          style={{
            marginTop: 22,
          }}
        >

          <h2
            style={{
              lineHeight: 1.6,
              marginBottom: 20,
            }}
          >
            Q.{current + 1}{" "}
            {question?.question}
          </h2>

          {/* OPTIONS */}

          <div
            style={{
              display:
                "grid",
              gap: 12,
            }}
          >

            {options.map(
              (option) => {

                const optionKey =
                  normalizeAnswer(
                    option.key
                  );

                const isSelected =
                  selected ===
                  optionKey;

                /*
                  Re-attempt में
                  Answer तुरंत दिखेगा।
                */

                const showResult =
                  isReattempt &&
                  hasSelected;

                const isCorrectOption =
                  correct ===
                  optionKey;

                let background =
                  "#ffffff";

                let border =
                  "1px solid #dbe3ee";

                let textColor =
                  "#111827";

                if (
                  showResult &&
                  isCorrectOption
                ) {
                  background =
                    "#dcfce7";

                  border =
                    "2px solid #16a34a";

                  textColor =
                    "#166534";
                }

                if (
                  showResult &&
                  isSelected &&
                  !isCorrectOption
                ) {
                  background =
                    "#fee2e2";

                  border =
                    "2px solid #dc2626";

                  textColor =
                    "#991b1b";
                }

                if (
                  !showResult &&
                  isSelected
                ) {
                  background =
                    "#eff6ff";

                  border =
                    "2px solid #2563eb";

                  textColor =
                    "#1d4ed8";
                }

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
                      textAlign:
                        "left",
                      padding:
                        "15px 16px",
                      borderRadius:
                        12,
                      border,
                      background,
                      color:
                        textColor,
                      cursor:
                        "pointer",
                      fontSize:
                        16,
                      lineHeight:
                        1.5,
                      fontWeight:
                        isSelected ||
                        (
                          showResult &&
                          isCorrectOption
                        )
                          ? 700
                          : 500,
                    }}
                  >

                    <strong>
                      {option.key}.
                    </strong>{" "}

                    {option.value}

                    {showResult &&
                      isCorrectOption && (
                        <span
                          style={{
                            float:
                              "right",
                            fontWeight:
                              900,
                          }}
                        >
                          ✅ सही
                        </span>
                      )}

                    {showResult &&
                      isSelected &&
                      !isCorrectOption && (
                        <span
                          style={{
                            float:
                              "right",
                            fontWeight:
                              900,
                          }}
                        >
                          ❌ आपका उत्तर
                        </span>
                      )}

                  </button>
                );
              }
            )}

          </div>

          {/* RE-ATTEMPT INSTANT RESULT */}

          {isReattempt &&
            hasSelected && (
              <div
                style={{
                  marginTop: 18,
                  padding: 18,
                  borderRadius: 14,
                  background:
                    currentIsCorrect
                      ? "#ecfdf5"
                      : "#fef2f2",
                  border:
                    currentIsCorrect
                      ? "1px solid #86efac"
                      : "1px solid #fecaca",
                }}
              >

                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 900,
                    marginBottom: 10,
                  }}
                >
                  {currentIsCorrect
                    ? "✅ आपका उत्तर सही है"
                    : "❌ आपका उत्तर गलत है"}
                </div>

                <div
                  style={{
                    lineHeight: 1.7,
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
                    lineHeight: 1.7,
                  }}
                >
                  <strong>
                    सही उत्तर:
                  </strong>{" "}

                  {correctOption
                    ? `${correctOption.key}) ${correctOption.value}`
                    : getAnswer(
                        question
                      )}
                </div>

                {/* INSTANT EXPLANATION */}

                <div
                  style={{
                    marginTop: 14,
                    padding: 14,
                    borderRadius: 10,
                    background:
                      "#ffffff",
                    lineHeight: 1.7,
                  }}
                >
                  <strong>
                    📖 व्याख्या:
                  </strong>

                  <div
                    style={{
                      marginTop: 6,
                      whiteSpace:
                        "pre-wrap",
                    }}
                  >
                    {getExplanation(
                      question
                    )}
                  </div>
                </div>

                {/* IMPORTANT FACTS */}

                {getImportantFacts(
                  question
                ).length > 0 && (
                  <div
                    style={{
                      marginTop: 12,
                      padding: 14,
                      borderRadius: 10,
                      background:
                        "#eff6ff",
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
                      {getImportantFacts(
                        question
                      ).map(
                        (
                          fact,
                          index
                        ) => (
                          <li
                            key={
                              index
                            }
                          >
                            {typeof fact ===
                            "object"
                              ? fact?.text ??
                                fact?.value ??
                                JSON.stringify(
                                  fact
                                )
                              : fact}
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                )}

                {/* EXAM TRICK */}

                {getExamTrick(
                  question
                ) && (
                  <div
                    style={{
                      marginTop: 12,
                      padding: 14,
                      borderRadius: 10,
                      background:
                        "#fff7ed",
                    }}
                  >
                    <strong>
                      💡 Exam Trick:
                    </strong>

                    <div
                      style={{
                        marginTop: 6,
                        whiteSpace:
                          "pre-wrap",
                      }}
                    >
                      {getExamTrick(
                        question
                      )}
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
            marginTop: 25,
          }}
        >

          <button
            type="button"
            className="ai-button"
            disabled={
              current === 0
            }
            onClick={() => {
              setCurrent(
                (value) =>
                  Math.max(
                    0,
                    value - 1
                  )
              );

              window.scrollTo({
                top: 0,
                behavior:
                  "smooth",
              });
            }}
          >
            ← Previous
          </button>

          {current <
          questions.length - 1 ? (
            <button
              type="button"
              className="ai-button"
              onClick={() => {
                setCurrent(
                  (value) =>
                    Math.min(
                      questions.length -
                        1,
                      value + 1
                    )
                );

                window.scrollTo({
                  top: 0,
                  behavior:
                    "smooth",
                });
              }}
            >
              Next →
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

        {/* QUESTION PALETTE */}

        <div
          style={{
            marginTop: 28,
          }}
        >

          <h3>
            प्रश्न सूची
          </h3>

          <div
            style={{
              display:
                "flex",
              flexWrap:
                "wrap",
              gap: 8,
            }}
          >

            {questions.map(
              (_, index) => {

                const answered =
                  answers[index] !==
                    undefined &&
                  answers[index] !==
                    null &&
                  answers[index] !==
                    "";

                return (
                  <button
                    key={
                      index
                    }
                    type="button"
                    onClick={() => {
                      setCurrent(
                        index
                      );

                      window.scrollTo({
                        top: 0,
                        behavior:
                          "smooth",
                      });
                    }}
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius:
                        10,
                      border:
                        current ===
                        index
                          ? "2px solid #2563eb"
                          : "1px solid #d1d5db",
                      background:
                        answered
                          ? "#dcfce7"
                          : "#ffffff",
                      fontWeight:
                        800,
                      cursor:
                        "pointer",
                    }}
                  >
                    {index + 1}
                  </button>
                );
              }
            )}

          </div>

        </div>

      </div>

    </main>
  );
}
