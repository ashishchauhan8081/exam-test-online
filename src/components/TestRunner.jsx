import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

/* ======================================================
   LOCAL QUESTION FOLDERS
====================================================== */

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

/* ======================================================
   LOCAL QUESTION MODULES
====================================================== */

const TEST_MODULES =
  import.meta.glob(
    "../data/questions/*/test*.js",
    {
      eager: true,
    }
  );

/* ======================================================
   ATTEMPT STORAGE
====================================================== */

const ATTEMPT_STORAGE_KEY =
  "study_with_power_test_attempts";

/* ======================================================
   SAVE TEST ATTEMPT
====================================================== */

function saveTestAttempt(
  test
) {
  try {
    const oldData =
      localStorage.getItem(
        ATTEMPT_STORAGE_KEY
      );

    let attempts = {};

    if (oldData) {
      try {
        attempts =
          JSON.parse(
            oldData
          ) || {};
      } catch {
        attempts = {};
      }
    }

    const testId =
      test?.id ||
      test?.testId ||
      `${test?.examId || test?.exam || test?.examName || "general"}_${test?.testNumber ?? test?.testNo ?? test?.number ?? 1}`;

    attempts[
      String(testId)
    ] = {
      completed: true,

      completedAt:
        new Date().toISOString(),

      exam:
        test?.exam ||
        test?.examName ||
        "",

      examId:
        test?.examId ||
        test?.exam ||
        "",

      testNumber:
        test?.testNumber ??
        test?.testNo ??
        test?.number ??
        1,

      title:
        test?.title ||
        test?.name ||
        "Test",
    };

    localStorage.setItem(
      ATTEMPT_STORAGE_KEY,
      JSON.stringify(
        attempts
      )
    );

    /* ==============================================
       SAME PAGE TEST SERIES UPDATE
    ============================================== */

    window.dispatchEvent(
      new Event(
        "testAttemptUpdated"
      )
    );

    console.log(
      "TEST ATTEMPT SAVED:",
      attempts[
        String(testId)
      ]
    );
  } catch (error) {
    console.error(
      "TEST ATTEMPT SAVE ERROR:",
      error
    );
  }
}

/* ======================================================
   LOCAL QUESTIONS
====================================================== */

function getLocalQuestions(
  examId,
  testNumber
) {
  const folder =
    EXAM_FOLDERS[examId] ||
    examId;

  const number =
    String(
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

/* ======================================================
   GET QUESTIONS
   Firebase → Local fallback
====================================================== */

function getQuestions(
  test
) {
  /* ==========================================
     FIREBASE ARRAY
  ========================================== */

  if (
    Array.isArray(
      test?.questions
    ) &&
    test.questions.length >
      0
  ) {
    return test.questions.slice(
      0,
      150
    );
  }

  /* ==========================================
     FIREBASE OBJECT
  ========================================== */

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
      firebaseQuestions.length >
      0
    ) {
      return firebaseQuestions.slice(
        0,
        150
      );
    }
  }

  /* ==========================================
     LOCAL FALLBACK
  ========================================== */

  return getLocalQuestions(
    test?.examId ||
      test?.exam ||
      test?.examName,
    test?.testNumber ??
      test?.testNo ??
      test?.number
  ).slice(0, 150);
}

/* ======================================================
   OPTIONS
====================================================== */

function getOptions(q) {
  if (
    Array.isArray(
      q?.options
    )
  ) {
    return q.options.map(
      (
        value,
        index
      ) => ({
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
      (
        [
          key,
          value,
        ],
        index
      ) => ({
        key:
          String(
            key
          ).toUpperCase(),

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

/* ======================================================
   NORMALIZE ANSWER
====================================================== */

function normalizeAnswer(
  value
) {
  if (
    value ===
      undefined ||
    value === null ||
    value === ""
  ) {
    return "";
  }

  if (
    typeof value ===
    "number"
  ) {
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

  if (!text) {
    return "";
  }

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

  if (
    letterWithText
  ) {
    return letterWithText[1].toUpperCase();
  }

  if (
    /^\d+$/.test(text)
  ) {
    const n =
      Number(text);

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

/* ======================================================
   GET ANSWER
====================================================== */

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

/* ======================================================
   CHECK ANSWER
====================================================== */

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

  if (
    correct ===
    userAnswer
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
        ) ===
        userAnswer
    );

  const correctOption =
    options.find(
      (option) =>
        normalizeAnswer(
          option.key
        ) ===
        correct
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

/* ======================================================
   TEST RUNNER
====================================================== */

export default function TestRunner({
  test,
  onBack,
}) {
  /* ====================================================
     QUESTIONS
  ==================================================== */

  const questions =
    useMemo(
      () =>
        getQuestions(test),
      [test]
    );

  /* ====================================================
     STATE
  ==================================================== */

  const [
    current,
    setCurrent,
  ] = useState(0);

  const [
    answers,
    setAnswers,
  ] = useState({});

  const [
    finished,
    setFinished,
  ] = useState(false);

  const durationMinutes =
    Number(
      test?.durationMinutes ??
        test?.duration ??
        30
    );

  const [
    timeLeft,
    setTimeLeft,
  ] = useState(
    durationMinutes * 60
  );

  /* ====================================================
     RESET
  ==================================================== */

  useEffect(() => {
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
  }, [
    test?.id,
    test?.examId,
    test?.exam,
    test?.testNumber,
    test?.testNo,
    durationMinutes,
  ]);

  /* ====================================================
     TIMER
  ==================================================== */

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
          (
            previous
          ) => {
            if (
              previous <= 1
            ) {
              clearInterval(
                timer
              );

              setFinished(
                true
              );

              return 0;
            }

            return (
              previous - 1
            );
          }
        );
      }, 1000);

    return () =>
      clearInterval(
        timer
      );
  }, [
    finished,
    questions.length,
  ]);

  /* ====================================================
     SAVE ATTEMPT WHEN TEST FINISHES
  ==================================================== */

  useEffect(() => {
    if (
      finished &&
      test
    ) {
      saveTestAttempt(
        test
      );
    }
  }, [
    finished,
    test,
  ]);

  /* ====================================================
     SCORE
  ==================================================== */

  const scoreData =
    useMemo(() => {
      let correct = 0;
      let wrong = 0;
      let unanswered = 0;

      questions.forEach(
        (
          q,
          index
        ) => {
          const selected =
            answers[index];

          if (
            selected ===
              undefined ||
            selected ===
              null ||
            selected ===
              ""
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
        wrong *
          negativeMarks;

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

  /* ====================================================
     SELECT ANSWER
  ==================================================== */

  const choose = (
    value
  ) => {
    if (finished) {
      return;
    }

    setAnswers(
      (
        previous
      ) => ({
        ...previous,
        [current]:
          value,
      })
    );
  };

  /* ====================================================
     SUBMIT
  ==================================================== */

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

  /* ====================================================
     RESTART
  ==================================================== */

  const restartTest =
    () => {
      setCurrent(0);
      setAnswers({});
      setFinished(false);

      setTimeLeft(
        durationMinutes *
          60
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    };

  /* ====================================================
     TIMER FORMAT
  ==================================================== */

  const formatTime =
    (seconds) => {
      const minutes =
        Math.floor(
          seconds / 60
        )
          .toString()
          .padStart(
            2,
            "0"
          );

      const secs =
        (
          seconds % 60
        )
          .toString()
          .padStart(
            2,
            "0"
          );

      return `${minutes}:${secs}`;
    };

  /* ====================================================
     NO QUESTIONS
  ==================================================== */

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
              test?.exam ||
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

  /* ====================================================
     RESULT PAGE
  ==================================================== */

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
                test?.exam ||
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
                borderRadius:
                  16,
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
                borderRadius:
                  14,
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
                borderRadius:
                  14,
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
                borderRadius:
                  14,
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

          {/* EXPLANATION */}

          <h2>
            📖 प्रश्नों की व्याख्या
          </h2>

          {questions.map(
            (
              q,
              i
            ) => {
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
                  (
                    option
                  ) =>
                    normalizeAnswer(
                      option.key
                    ) ===
                    selected
                );

              const correctOption =
                options.find(
                  (
                    option
                  ) =>
                    normalizeAnswer(
                      option.key
                    ) ===
                    correct
                );

              const explanation =
                q?.explanation ??
                q?.व्याख्या ??
                q?.explanationText ??
                q?.solution ??
                q?.details ??
                "इस प्रश्न की व्याख्या उपलब्ध नहीं है।";

              const importantFacts =
                Array.isArray(
                  q?.importantFacts
                )
                  ? q.importantFacts
                  : Array.isArray(
                      q?.महत्वपूर्णतथ्य
                    )
                  ? q.महत्वपूर्णतथ्य
                  : [];

              const examTrick =
                q?.examTrick ??
                q?.exam_trick ??
                q?.ExamTrick ??
                q?.परीक्षाट्रिक ??
                "";

              const correctAnswer =
                isCorrect(
                  q,
                  answers[i]
                );

              return (
                <div
                  key={
                    q?.id ??
                    i
                  }
                  style={{
                    marginTop: 18,
                    padding: 18,
                    borderRadius:
                      16,
                    border:
                      "1px solid #dce3ed",
                    background:
                      "#fff",
                  }}
                >
                  <h3
                    style={{
                      marginTop: 0,
                      lineHeight:
                        1.6,
                    }}
                  >
                    प्रश्न{" "}
                    {i + 1}.{" "}
                    {
                      q?.question
                    }
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
                      ? "✅ सही उत्तर"
                      : "❌ गलत उत्तर"}
                  </div>

                  {/* EXPLANATION */}

                  <div
                    style={{
                      marginTop: 12,
                      padding: 15,
                      borderRadius:
                        12,
                      background:
                        "#fff8e5",
                      border:
                        "1px solid #f1d58a",
                      lineHeight:
                        1.75,
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
                      {
                        explanation
                      }
                    </div>
                  </div>

                  {/* IMPORTANT FACTS */}

                  {importantFacts.length >
                    0 && (
                    <div
                      style={{
                        marginTop: 12,
                        padding: 15,
                        borderRadius:
                          12,
                        background:
                          "#f8fafc",
                        border:
                          "1px solid #cbd5e1",
                        lineHeight:
                          1.8,
                      }}
                    >
                      <div
                        style={{
                          fontWeight:
                            900,
                          marginBottom:
                            8,
                        }}
                      >
                        📌 महत्वपूर्ण तथ्य:
                      </div>

                      <ul
                        style={{
                          margin: 0,
                          paddingLeft:
                            24,
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
                              style={{
                                marginBottom:
                                  4,
                              }}
                            >
                              {
                                fact
                              }
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
                        borderRadius:
                          12,
                        background:
                          "#eef2ff",
                        border:
                          "1px solid #c7d2fe",
                        lineHeight:
                          1.8,
                        fontWeight:
                          700,
                      }}
                    >
                      <div
                        style={{
                          marginBottom:
                            6,
                        }}
                      >
                        🧠{" "}
                        <strong>
                          Exam Trick:
                        </strong>
                      </div>

                      <div>
                        {
                          examTrick
                        }
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
              🔄 Test दोबारा दें
            </button>

            <button
              type="button"
              className="ai-button"
              onClick={
                onBack
              }
            >
              ← Test List
            </button>

          </div>

        </div>
      </main>
    );
  }

  /* ====================================================
     CURRENT QUESTION
  ==================================================== */

  const question =
    questions[current];

  const options =
    getOptions(
      question
    );

  const selected =
    normalizeAnswer(
      answers[current]
    );

  /* ====================================================
     TEST PAGE
  ==================================================== */

  return (
    <main className="ai-container">

      <div className="ai-card">

        {/* BACK */}

        <button
          type="button"
          className="ai-button"
          onClick={onBack}
        >
          ← Test Series
        </button>

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
                marginBottom:
                  6,
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

          <div
            style={{
              fontSize: 28,
              fontWeight: 900,
              color:
                timeLeft <= 60
                  ? "#dc2626"
                  : timeLeft <= 300
                  ? "#ea580c"
                  : "#0f172a",
            }}
          >
            ⏱️{" "}
            {formatTime(
              timeLeft
            )}
          </div>

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
              lineHeight:
                1.6,
              overflowWrap:
                "anywhere",
            }}
          >
            {current + 1}.{" "}
            {
              question?.question
            }
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
              (
                option
              ) => {
                const active =
                  selected ===
                  normalizeAnswer(
                    option.key
                  );

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
                        active
                          ? "2px solid #2563eb"
                          : "1px solid #cbd5e1",
                      background:
                        active
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
                        minWidth:
                          28,
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
                    </span>

                  </button>
                );
              }
            )}

          </div>

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

          <button
            type="button"
            className="ai-button"
            disabled={
              current === 0
            }
            onClick={() =>
              setCurrent(
                (
                  v
                ) =>
                  Math.max(
                    0,
                    v - 1
                  )
              )
            }
          >
            ← पिछला
          </button>

          {current <
          questions.length -
            1 ? (

            <button
              type="button"
              className="ai-button"
              onClick={() =>
                setCurrent(
                  (
                    v
                  ) =>
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
