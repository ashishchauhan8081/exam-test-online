import React, { useEffect, useState } from "react";
import "../App.css";
import "./AdminPanel.css";
import NCERTAdmin from "../components/NCERTAdmin";

import {
  getApps,
  getApp,
  initializeApp,
} from "firebase/app";

import {
  getDatabase,
  ref,
  onValue,
  set,
  remove,
} from "firebase/database";

import {
  getAuth,
  onAuthStateChanged,
} from "firebase/auth";

import firebaseConfig from "../firebase-config.json";

// ======================================================
// FIREBASE
// ======================================================

const firebaseApp = getApps().length
  ? getApp()
  : initializeApp({
      ...firebaseConfig,
      databaseURL:
        firebaseConfig.databaseURL ||
        "https://study-with-power-f6914-default-rtdb.asia-southeast1.firebasedatabase.app",
    });

const db = getDatabase(firebaseApp);
const auth = getAuth(firebaseApp);

// ======================================================
// ADMIN
// ======================================================

const ADMIN_EMAIL = "cciashish@gmail.com";

// ======================================================
// DEFAULT EXAMS
// ======================================================

const defaultExams = [
  { id: "upsc", name: "UPSC", icon: "🇮🇳" },
  { id: "uppcs", name: "UPPCS", icon: "🏛️" },
  { id: "uppet", name: "UP PET", icon: "🎯" },
  { id: "bpsc", name: "BPSC", icon: "🏛️" },
  { id: "mppsc", name: "MPPSC", icon: "📚" },
  { id: "ssc", name: "SSC", icon: "📝" },
  { id: "railway", name: "Railway", icon: "🚆" },
  { id: "banking", name: "Banking", icon: "🏦" },
  { id: "upsssc", name: "UPSSSC", icon: "📖" },
  { id: "roaro", name: "RO/ARO", icon: "📜" },
  { id: "police", name: "Police", icon: "👮" },
  { id: "teaching", name: "Teaching", icon: "👨‍🏫" },
];

// ======================================================
// QUESTION
// ======================================================

function createQuestion(id = 1) {
  return {
    id,
    question: "",
    options: ["", "", "", ""],
    answer: 0,
    explanation: "",
    explanationImage: "",
  };
}

// ======================================================
// ADMIN PANEL
// ======================================================

export default function AdminPanel({
  user,
  tests = {},
  resources = [],
  onClose,
}) {
  // ====================================================
  // USER
  // ====================================================

  const [currentUser, setCurrentUser] = useState(
    user || null
  );

  const [authChecking, setAuthChecking] = useState(
    !user
  );

  // ====================================================
  // FIREBASE DATA
  // ====================================================

  const [cloudTests, setCloudTests] = useState(
    tests || {}
  );

  const [siteResources, setSiteResources] =
    useState(resources || []);

  const [cloudExams, setCloudExams] = useState({});

  // ====================================================
  // ACTIVE SECTION
  // ====================================================

  const [activeSection, setActiveSection] =
    useState("tests");

  // ====================================================
  // EXAM SETTINGS
  // ====================================================

  const [selectedExam, setSelectedExam] =
    useState("uppcs");

  const [testNumber, setTestNumber] =
    useState(1);

  const [testTitle, setTestTitle] =
    useState("");

  const [testStatus, setTestStatus] =
    useState("draft");

  const [testDuration, setTestDuration] =
    useState(30);

  const [testPrice, setTestPrice] =
    useState(0);

  // ====================================================
  // NEW EXAM
  // ====================================================

  const [newExamName, setNewExamName] =
    useState("");

  const [newExamIcon, setNewExamIcon] =
    useState("📝");

  const [newExamTotalTests, setNewExamTotalTests] =
    useState(10);

  const [newExamFreeTests, setNewExamFreeTests] =
    useState(2);

  const [newExamPremiumPrice, setNewExamPremiumPrice] =
    useState(99);

  const [addingExam, setAddingExam] =
    useState(false);

  // ====================================================
  // QUESTIONS
  // ====================================================

  const [questions, setQuestions] =
    useState([createQuestion(1)]);

  const [currentQuestion, setCurrentQuestion] =
    useState(0);

  // ====================================================
  // UI
  // ====================================================

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  // ====================================================
  // AUTH
  // ====================================================

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        (loggedUser) => {
          setCurrentUser(loggedUser);
          setAuthChecking(false);
        }
      );

    return () => unsubscribe();
  }, []);

  // ====================================================
  // LOAD TESTS
  // ====================================================

  useEffect(() => {
    const testsRef = ref(db, "tests");

    const unsubscribe = onValue(
      testsRef,
      (snapshot) => {
        setCloudTests(
          snapshot.val() || {}
        );
      },
      (error) => {
        console.error(
          "Exam Test load error:",
          error
        );
      }
    );

    return () => unsubscribe();
  }, []);

  // ====================================================
  // LOAD EXAMS
  // ====================================================

  useEffect(() => {
    const examsRef = ref(db, "exams");

    const unsubscribe = onValue(
      examsRef,
      (snapshot) => {
        setCloudExams(
          snapshot.val() || {}
        );
      },
      (error) => {
        console.error(
          "Exam load error:",
          error
        );
      }
    );

    return () => unsubscribe();
  }, []);

  // ====================================================
  // LOAD RESOURCES
  // ====================================================

  useEffect(() => {
    const resourceRef = ref(
      db,
      "siteContent/resources"
    );

    const unsubscribe = onValue(
      resourceRef,
      (snapshot) => {
        const value =
          snapshot.val();

        if (Array.isArray(value)) {
          setSiteResources(value);
        } else if (
          value &&
          typeof value === "object"
        ) {
          setSiteResources(
            Object.values(value)
          );
        } else {
          setSiteResources([]);
        }
      },
      (error) => {
        console.error(
          "Resources load error:",
          error
        );
      }
    );

    return () => unsubscribe();
  }, []);

  // ====================================================
  // ALL EXAMS
  // ====================================================

  const allExams = [
    ...defaultExams,
    ...Object.values(cloudExams || {}),
  ].filter(
    (exam, index, array) =>
      array.findIndex(
        (x) => x.id === exam.id
      ) === index
  );

  // ====================================================
  // AUTH CHECK
  // ====================================================

  if (authChecking) {
    return (
      <div className="admin-page">
        <div className="admin-loading">
          ⏳ Exam Test Admin Panel Loading...
        </div>
      </div>
    );
  }

  if (
    !currentUser ||
    currentUser.email !== ADMIN_EMAIL
  ) {
    return (
      <div className="admin-page">
        <div className="admin-denied">
          <div className="denied-icon">
            🔐
          </div>

          <h2>
            Exam Test Admin Access Denied
          </h2>

          <p>
            केवल authorized admin account
            से Admin Panel खोला जा सकता है।
          </p>

          <button
            className="admin-btn primary"
            onClick={onClose}
          >
            ← वापस जाएँ
          </button>
        </div>
      </div>
    );
  }

  // ====================================================
  // HELPERS
  // ====================================================

  const getTestId = () => {
    return `${selectedExam}_test_${testNumber}`;
  };

  const getExamName = (id) => {
    return (
      allExams.find(
        (exam) => exam.id === id
      )?.name || id
    );
  };

  // ====================================================
  // NEW EXAM ID
  // ====================================================

  const makeExamId = (name) => {
    return name
      .toLowerCase()
      .trim()
      .replace(
        /[^a-z0-9\u0900-\u097F]+/gi,
        "_"
      )
      .replace(
        /^_+|_+$/g,
        ""
      );
  };

  // ====================================================
  // ADD NEW EXAM
  // ====================================================

  const addNewExam = async () => {
    const name =
      newExamName.trim();

    const total =
      Number(newExamTotalTests);

    const free =
      Number(newExamFreeTests);

    const price =
      Number(newExamPremiumPrice);

    if (!name) {
      alert(
        "Exam Name डालें।"
      );
      return;
    }

    if (!total || total < 1) {
      alert(
        "Total Tests सही डालें।"
      );
      return;
    }

    if (
      free < 0 ||
      free > total
    ) {
      alert(
        "Free Tests, Total Tests से अधिक नहीं हो सकते।"
      );
      return;
    }

    if (
      free < total &&
      price < 0
    ) {
      alert(
        "Premium Price सही डालें।"
      );
      return;
    }

    const id =
      makeExamId(name);

    if (!id) {
      alert(
        "Exam Name सही डालें।"
      );
      return;
    }

    const alreadyExists =
      allExams.some(
        (exam) =>
          exam.id === id
      );

    if (alreadyExists) {
      alert(
        "यह Exam पहले से मौजूद है।"
      );
      return;
    }

    try {
      setAddingExam(true);

      const examData = {
        id,
        name,
        icon:
          newExamIcon.trim() ||
          "📝",

        totalTests: total,

        freeTests: free,

        premiumTests:
          Math.max(
            0,
            total - free
          ),

        premiumPrice:
          price,

        createdAt:
          Date.now(),

        createdBy:
          currentUser?.email ||
          ADMIN_EMAIL,
      };

      await set(
        ref(
          db,
          `exams/${id}`
        ),
        examData
      );

      setCloudExams(
        (old) => ({
          ...old,
          [id]: examData,
        })
      );

      setSelectedExam(id);

      setNewExamName("");
      setNewExamIcon("📝");
      setNewExamTotalTests(10);
      setNewExamFreeTests(2);
      setNewExamPremiumPrice(99);

      setMessage(
        `✅ ${name} Exam successfully add हो गया।`
      );

      alert(
        `✅ ${name} Exam add हो गया।`
      );
    } catch (error) {
      console.error(
        "Add exam error:",
        error
      );

      alert(
        "❌ Exam add नहीं हुआ:\n" +
          error.message
      );
    } finally {
      setAddingExam(false);
    }
  };

  // ====================================================
  // DELETE CUSTOM EXAM
  // ====================================================

  const deleteExam = async (
    exam
  ) => {
    if (
      defaultExams.some(
        (x) =>
          x.id === exam.id
      )
    ) {
      alert(
        "Default Exam को इस panel से delete नहीं किया जा सकता।"
      );
      return;
    }

    const ok =
      window.confirm(
        `${exam.name} Exam delete करें?`
      );

    if (!ok) return;

    try {
      await remove(
        ref(
          db,
          `exams/${exam.id}`
        )
      );

      setCloudExams(
        (old) => {
          const copy = {
            ...old,
          };

          delete copy[
            exam.id
          ];

          return copy;
        }
      );

      if (
        selectedExam ===
        exam.id
      ) {
        setSelectedExam(
          "uppcs"
        );
      }

      alert(
        "✅ Exam delete हो गया।"
      );
    } catch (error) {
      alert(
        "❌ Exam delete error:\n" +
          error.message
      );
    }
  };

  // ====================================================
  // RESET TEST
  // ====================================================

  const resetTestForm = () => {
    setSelectedExam("uppcs");
    setTestNumber(1);
    setTestTitle("");
    setTestStatus("draft");
    setTestDuration(30);
    setTestPrice(0);

    setQuestions([
      createQuestion(1),
    ]);

    setCurrentQuestion(0);
    setMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // ====================================================
  // LOAD TEST
  // ====================================================

  const loadTest = (
    id,
    test
  ) => {
    if (!test) return;

    setActiveSection(
      "tests"
    );

    setSelectedExam(
      test.exam ||
        "uppcs"
    );

    setTestNumber(
      Number(
        test.testNumber ||
          1
      )
    );

    setTestTitle(
      test.title || ""
    );

    setTestStatus(
      test.status ||
        "draft"
    );

    setTestDuration(
      Number(
        test.duration ||
          30
      )
    );

    setTestPrice(
      Number(
        test.price ||
          0
      )
    );

    const loadedQuestions =
      Array.isArray(
        test.questions
      )
        ? test.questions
        : [];

    if (
      loadedQuestions.length
    ) {
      setQuestions(
        loadedQuestions.map(
          (
            q,
            index
          ) => ({
            id:
              q?.id ??
              index + 1,

            question:
              q?.question ||
              q?.questionText ||
              "",

            options:
              Array.isArray(
                q?.options
              )
                ? [
                    q.options[0] ||
                      "",
                    q.options[1] ||
                      "",
                    q.options[2] ||
                      "",
                    q.options[3] ||
                      "",
                  ]
                : [
                    "",
                    "",
                    "",
                    "",
                  ],

            answer:
              Number.isInteger(
                q?.answer
              )
                ? Math.max(
                    0,
                    Math.min(
                      3,
                      q.answer
                    )
                  )
                : 0,

            explanation:
              q?.explanation ||
              "",

            explanationImage:
              q?.explanationImage ||
              "",
          })
        )
      );
    } else {
      setQuestions([
        createQuestion(1),
      ]);
    }

    setCurrentQuestion(0);
    setMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // ====================================================
  // ADD QUESTION
  // ====================================================

  const addQuestion = () => {
    if (
      questions.length >=
      150
    ) {
      alert(
        "अधिकतम 150 Questions रख सकते हैं।"
      );
      return;
    }

    const newQuestion =
      createQuestion(
        questions.length +
          1
      );

    setQuestions(
      (old) => [
        ...old,
        newQuestion,
      ]
    );

    setCurrentQuestion(
      questions.length
    );
  };

  // ====================================================
  // UPDATE QUESTION
  // ====================================================

  const updateQuestion = (
    field,
    value
  ) => {
    setQuestions(
      (old) =>
        old.map(
          (
            q,
            index
          ) =>
            index ===
            currentQuestion
              ? {
                  ...q,
                  [field]:
                    value,
                }
              : q
        )
    );
  };

  // ====================================================
  // UPDATE OPTION
  // ====================================================

  const updateOption = (
    optionIndex,
    value
  ) => {
    setQuestions(
      (old) =>
        old.map(
          (
            q,
            index
          ) => {
            if (
              index !==
              currentQuestion
            ) {
              return q;
            }

            const newOptions =
              [
                ...q.options,
              ];

            newOptions[
              optionIndex
            ] = value;

            return {
              ...q,
              options:
                newOptions,
            };
          }
        )
    );
  };

  // ====================================================
  // DELETE QUESTION
  // ====================================================

  const deleteQuestion =
    () => {
      if (
        questions.length ===
        1
      ) {
        alert(
          "कम से कम 1 Question होना चाहिए।"
        );
        return;
      }

      const ok =
        window.confirm(
          `Question ${
            currentQuestion +
            1
          } delete करें?`
        );

      if (!ok) return;

      const newQuestions =
        questions
          .filter(
            (
              _,
              index
            ) =>
              index !==
              currentQuestion
          )
          .map(
            (
              q,
              index
            ) => ({
              ...q,
              id:
                index +
                1,
            })
          );

      setQuestions(
        newQuestions
      );

      setCurrentQuestion(
        (old) =>
          Math.max(
            0,
            Math.min(
              old,
              newQuestions.length -
                1
            )
          )
      );
    };

  // ====================================================
  // VALIDATE
  // ====================================================

  const validateTest =
    () => {
      if (!selectedExam) {
        alert(
          "Exam select करें।"
        );
        return false;
      }

      if (
        !Number(
          testNumber
        ) ||
        Number(
          testNumber
        ) < 1
      ) {
        alert(
          "Test Number सही डालें।"
        );
        return false;
      }

      if (
        !testTitle.trim()
      ) {
        alert(
          "Test Title डालें।"
        );
        return false;
      }

      if (
        !questions.length
      ) {
        alert(
          "कम से कम 1 Question डालें।"
        );
        return false;
      }

      for (
        let i = 0;
        i <
        questions.length;
        i++
      ) {
        const q =
          questions[i];

        if (
          !String(
            q.question ||
              ""
          ).trim()
        ) {
          alert(
            `Question ${
              i + 1
            } खाली है।`
          );

          setCurrentQuestion(
            i
          );

          return false;
        }

        if (
          !Array.isArray(
            q.options
          ) ||
          q.options.length !==
            4 ||
          q.options.some(
            (option) =>
              !String(
                option ||
                  ""
              ).trim()
          )
        ) {
          alert(
            `Question ${
              i + 1
            } के सभी 4 options भरें।`
          );

          setCurrentQuestion(
            i
          );

          return false;
        }

        if (
          !Number.isInteger(
            Number(
              q.answer
            )
          ) ||
          Number(
            q.answer
          ) < 0 ||
          Number(
            q.answer
          ) > 3
        ) {
          alert(
            `Question ${
              i + 1
            } का सही उत्तर select करें।`
          );

          setCurrentQuestion(
            i
          );

          return false;
        }
      }

      return true;
    };

  // ====================================================
  // SAVE TEST
  // ====================================================

  const saveTest =
    async () => {
      if (
        !validateTest()
      ) {
        return;
      }

      try {
        setSaving(true);
        setMessage("");

        const id =
          getTestId();

        const cleanQuestions =
          questions.map(
            (
              q,
              index
            ) => ({
              id:
                index +
                1,

              question:
                String(
                  q.question ||
                    ""
                ).trim(),

              options:
                q.options.map(
                  (
                    option
                  ) =>
                    String(
                      option ||
                        ""
                    ).trim()
                ),

              answer:
                Number(
                  q.answer
                ),

              explanation:
                String(
                  q.explanation ||
                    ""
                ).trim(),

              explanationImage:
                String(
                  q.explanationImage ||
                    ""
                ).trim(),
            })
          );

        const exam =
          allExams.find(
            (x) =>
              x.id ===
              selectedExam
          );

        const examTotal =
          Number(
            exam?.totalTests ||
              0
          );

        const examFree =
          Number(
            exam?.freeTests ||
              0
          );

        const automaticType =
          examTotal > 0
            ? Number(
                testNumber
              ) <=
              examFree
              ? "Free"
              : "Premium"
            : Number(
                testPrice
              ) > 0
              ? "Premium"
              : "Free";

        const automaticPrice =
          automaticType ===
          "Premium"
            ? Number(
                exam?.premiumPrice ||
                  testPrice ||
                  0
              )
            : 0;

        const testData = {
          id,

          exam:
            selectedExam,

          examName:
            getExamName(
              selectedExam
            ),

          testNumber:
            Number(
              testNumber
            ),

          title:
            testTitle.trim(),

          status:
            testStatus,

          duration:
            Number(
              testDuration
            ) || 30,

          type:
            automaticType,

          price:
            automaticPrice,

          questions:
            cleanQuestions,

          totalQuestions:
            cleanQuestions.length,

          updatedAt:
            Date.now(),

          updatedBy:
            currentUser?.email ||
            ADMIN_EMAIL,
        };

        await set(
          ref(
            db,
            `tests/${id}`
          ),
          testData
        );

        setCloudTests(
          (old) => ({
            ...old,
            [id]:
              testData,
          })
        );

        setMessage(
          `✅ ${testTitle.trim()} successfully save हो गया।`
        );

        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      } catch (
        error
      ) {
        console.error(
          "Save test error:",
          error
        );

        alert(
          "❌ Test save नहीं हुआ:\n" +
            error.message
        );
      } finally {
        setSaving(false);
      }
    };

  // ====================================================
  // DELETE TEST
  // ====================================================

  const deleteTest =
    async (
      id,
      title
    ) => {
      const ok =
        window.confirm(
          `"${title || id}" को delete करना चाहते हैं?`
        );

      if (!ok)
        return;

      try {
        await remove(
          ref(
            db,
            `tests/${id}`
          )
        );

        setCloudTests(
          (old) => {
            const copy = {
              ...old,
            };

            delete copy[
              id
            ];

            return copy;
          }
        );

        if (
          id ===
          getTestId()
        ) {
          resetTestForm();
        }

        alert(
          "✅ Test delete हो गया।"
        );
      } catch (
        error
      ) {
        alert(
          "❌ Delete error:\n" +
            error.message
        );
      }
    };

  // ====================================================
  // RESOURCES
  // ====================================================

  const updateResource =
    (
      index,
      field,
      value
    ) => {
      setSiteResources(
        (old) =>
          old.map(
            (
              item,
              i
            ) =>
              i === index
                ? {
                    ...item,
                    [field]:
                      value,
                  }
                : item
          )
      );
    };

  const saveResources =
    async () => {
      try {
        setSaving(true);

        await set(
          ref(
            db,
            "siteContent/resources"
          ),
          siteResources
        );

        alert(
          "✅ Resources save हो गए।"
        );
      } catch (
        error
      ) {
        alert(
          "❌ Resources save error:\n" +
            error.message
        );
      } finally {
        setSaving(false);
      }
    };

  // ====================================================
  // TEST LIST
  // ====================================================

  const testEntries =
    Object.entries(
      cloudTests || {}
    ).sort(
      (a, b) =>
        Number(
          a[1]?.testNumber ||
            0
        ) -
        Number(
          b[1]?.testNumber ||
            0
        )
    );

  const currentQuestionData =
    questions[
      currentQuestion
    ] ||
    createQuestion(1);

  const selectedExamData =
    allExams.find(
      (exam) =>
        exam.id ===
        selectedExam
    );

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <div className="admin-page">

      {/* ==================================================
          HEADER
      ================================================== */}

      <header className="admin-header">

        <div>
          <h1>
            📝 Exam Test Admin Panel
          </h1>

          <p>
            Exam Test Management
          </p>
        </div>

        <div className="admin-header-right">

          <span className="admin-email">
            👤{" "}
            {currentUser?.email}
          </span>

          <button
            className="admin-btn danger"
            onClick={onClose}
          >
            ✕ Close
          </button>

        </div>

      </header>

      {/* ==================================================
          MESSAGE
      ================================================== */}

      {message && (
        <div className="admin-message">
          {message}
        </div>
      )}

      {/* ==================================================
          TABS
      ================================================== */}

      <div className="admin-tabs">

        <button
          className={
            activeSection ===
            "tests"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveSection(
              "tests"
            )
          }
        >
          📝 Exam Test
        </button>

        <button
          className={
            activeSection ===
            "exams"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveSection(
              "exams"
            )
          }
        >
          🎯 Exams
        </button>

        <button
          className={
            activeSection ===
            "resources"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveSection(
              "resources"
            )
          }
        >
          📚 Resources
        </button>

        <button
          className={
            activeSection ===
            "ncert"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveSection(
              "ncert"
            )
          }
        >
          📖 NCERT Books
        </button>

      </div>

      {/* ==================================================
          EXAMS SECTION
      ================================================== */}

      {activeSection ===
        "exams" && (

        <div className="admin-content">

          {/* ADD NEW EXAM */}

          <div className="admin-card">

            <h2>
              ➕ New Exam Add करें
            </h2>

            <p>
              Exam बनाते समय ही Total,
              Free और Premium Test सेट करें।
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit,minmax(220px,1fr))",
                gap: "15px",
                marginTop: "20px",
              }}
            >

              <div>
                <label>
                  Exam Name
                </label>

                <input
                  value={
                    newExamName
                  }
                  onChange={(e) =>
                    setNewExamName(
                      e.target.value
                    )
                  }
                  placeholder="जैसे SSC CGL"
                />
              </div>

              <div>
                <label>
                  Exam Icon
                </label>

                <input
                  value={
                    newExamIcon
                  }
                  onChange={(e) =>
                    setNewExamIcon(
                      e.target.value
                    )
                  }
                  placeholder="📝"
                />
              </div>

              <div>
                <label>
                  Total Tests
                </label>

                <input
                  type="number"
                  min="1"
                  value={
                    newExamTotalTests
                  }
                  onChange={(e) =>
                    setNewExamTotalTests(
                      e.target.value
                    )
                  }
                />
              </div>

              <div>
                <label>
                  Free Tests
                </label>

                <input
                  type="number"
                  min="0"
                  value={
                    newExamFreeTests
                  }
                  onChange={(e) =>
                    setNewExamFreeTests(
                      e.target.value
                    )
                  }
                />
              </div>

              <div>
                <label>
                  Premium Price ₹
                </label>

                <input
                  type="number"
                  min="0"
                  value={
                    newExamPremiumPrice
                  }
                  onChange={(e) =>
                    setNewExamPremiumPrice(
                      e.target.value
                    )
                  }
                />
              </div>

            </div>

            <div
              style={{
                marginTop: "20px",
                padding: "15px",
                background:
                  "#f1f5f9",
                borderRadius: "12px",
              }}
            >

              <strong>
                Preview:
              </strong>

              <p>
                {newExamName ||
                  "New Exam"}{" "}
                → Total{" "}
                {Number(
                  newExamTotalTests
                ) || 0}{" "}
                Tests → Free{" "}
                {Number(
                  newExamFreeTests
                ) || 0}{" "}
                → Premium{" "}
                {Math.max(
                  0,
                  (Number(
                    newExamTotalTests
                  ) || 0) -
                    (Number(
                      newExamFreeTests
                    ) || 0)
                )}{" "}
                → ₹
                {Number(
                  newExamPremiumPrice
                ) || 0}
              </p>

            </div>

            <button
              className="admin-btn primary"
              onClick={
                addNewExam
              }
              disabled={
                addingExam
              }
              style={{
                marginTop: "20px",
              }}
            >
              {addingExam
                ? "⏳ Adding..."
                : "➕ Exam Add करें"}
            </button>

          </div>

          {/* EXISTING EXAMS */}

          <div className="admin-card">

            <h2>
              📋 Existing Exams
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit,minmax(250px,1fr))",
                gap: "15px",
                marginTop: "20px",
              }}
            >

              {allExams.map(
                (exam) => (
                  <div
                    key={
                      exam.id
                    }
                    style={{
                      border:
                        "1px solid #e2e8f0",
                      borderRadius:
                        "15px",
                      padding:
                        "18px",
                      background:
                        "#fff",
                    }}
                  >

                    <div
                      style={{
                        fontSize:
                          "35px",
                      }}
                    >
                      {
                        exam.icon
                      }
                    </div>

                    <h3>
                      {
                        exam.name
                      }
                    </h3>

                    {exam.totalTests ? (
                      <p>
                        Total Tests:{" "}
                        {
                          exam.totalTests
                        }
                        <br />
                        Free:{" "}
                        {
                          exam.freeTests
                        }
                        <br />
                        Premium:{" "}
                        {
                          exam.premiumTests
                        }
                        <br />
                        Price: ₹
                        {
                          exam.premiumPrice
                        }
                      </p>
                    ) : (
                      <p>
                        Default Exam
                      </p>
                    )}

                    <button
                      className="admin-btn primary"
                      onClick={() => {
                        setSelectedExam(
                          exam.id
                        );

                        setActiveSection(
                          "tests"
                        );
                      }}
                    >
                      📝 Tests Manage करें
                    </button>

                    {!defaultExams.some(
                      (x) =>
                        x.id ===
                        exam.id
                    ) && (
                      <button
                        className="admin-btn danger"
                        onClick={() =>
                          deleteExam(
                            exam
                          )
                        }
                        style={{
                          marginTop:
                            "8px",
                        }}
                      >
                        🗑️ Delete
                      </button>
                    )}

                  </div>
                )
              )}

            </div>

          </div>

        </div>
      )}

      {/* ==================================================
          TEST SECTION
      ================================================== */}

      {activeSection ===
        "tests" && (

        <div className="admin-content">

          {/* TEST SETTINGS */}

          <div className="admin-card">

            <h2>
              📝 Test Settings
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit,minmax(220px,1fr))",
                gap: "15px",
              }}
            >

              <div>
                <label>
                  Exam
                </label>

                <select
                  value={
                    selectedExam
                  }
                  onChange={(e) =>
                    setSelectedExam(
                      e.target.value
                    )
                  }
                >
                  {allExams.map(
                    (exam) => (
                      <option
                        key={
                          exam.id
                        }
                        value={
                          exam.id
                        }
                      >
                        {
                          exam.icon
                        }{" "}
                        {
                          exam.name
                        }
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label>
                  Test Number
                </label>

                <input
                  type="number"
                  min="1"
                  value={
                    testNumber
                  }
                  onChange={(e) =>
                    setTestNumber(
                      e.target.value
                    )
                  }
                />
              </div>

              <div>
                <label>
                  Test Title
                </label>

                <input
                  value={
                    testTitle
                  }
                  onChange={(e) =>
                    setTestTitle(
                      e.target.value
                    )
                  }
                  placeholder="UPPCS Test 01"
                />
              </div>

              <div>
                <label>
                  Duration (Minutes)
                </label>

                <input
                  type="number"
                  min="1"
                  value={
                    testDuration
                  }
                  onChange={(e) =>
                    setTestDuration(
                      e.target.value
                    )
                  }
                />
              </div>

              <div>
                <label>
                  Status
                </label>

                <select
                  value={
                    testStatus
                  }
                  onChange={(e) =>
                    setTestStatus(
                      e.target.value
                    )
                  }
                >
                  <option value="draft">
                    Draft
                  </option>

                  <option value="published">
                    Published
                  </option>
                </select>
              </div>

            </div>

            {/* AUTOMATIC PREMIUM INFO */}

            {selectedExamData &&
              selectedExamData.totalTests && (
                <div
                  style={{
                    marginTop:
                      "20px",
                    padding:
                      "15px",
                    borderRadius:
                      "12px",
                    background:
                      "#eff6ff",
                  }}
                >

                  <strong>
                    💡 इस Exam की Pricing:
                  </strong>

                  <p>
                    Total Tests:{" "}
                    {
                      selectedExamData.totalTests
                    }
                    <br />

                    Free Tests:{" "}
                    {
                      selectedExamData.freeTests
                    }
                    <br />

                    Premium Tests:{" "}
                    {
                      selectedExamData.premiumTests
                    }
                    <br />

                    Premium Price: ₹
                    {
                      selectedExamData.premiumPrice
                    }
                    <br />

                    Current Test:{" "}
                    {Number(
                      testNumber
                    ) <=
                    Number(
                      selectedExamData.freeTests
                    )
                      ? "🆓 FREE"
                      : "💎 PREMIUM"}
                  </p>

                </div>
              )}

          </div>

          {/* QUESTION EDITOR */}

          <div className="admin-card">

            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "center",
                gap: "10px",
                flexWrap:
                  "wrap",
              }}
            >

              <h2>
                ❓ Questions
              </h2>

              <div>
                <button
                  className="admin-btn primary"
                  onClick={
                    addQuestion
                  }
                >
                  ➕ Add Question
                </button>

                <button
                  className="admin-btn danger"
                  onClick={
                    deleteQuestion
                  }
                  style={{
                    marginLeft:
                      "8px",
                  }}
                >
                  🗑️ Delete
                </button>
              </div>

            </div>

            {/* QUESTION NUMBER */}

            <div
              style={{
                display: "flex",
                gap: "8px",
                flexWrap:
                  "wrap",
                margin:
                  "20px 0",
              }}
            >

              {questions.map(
                (
                  q,
                  index
                ) => (
                  <button
                    key={
                      q.id
                    }
                    onClick={() =>
                      setCurrentQuestion(
                        index
                      )
                    }
                    style={{
                      padding:
                        "8px 12px",
                      border:
                        "none",
                      borderRadius:
                        "8px",
                      cursor:
                        "pointer",
                      background:
                        currentQuestion ===
                        index
                          ? "#0868f5"
                          : "#e2e8f0",
                      color:
                        currentQuestion ===
                        index
                          ? "#fff"
                          : "#111",
                      fontWeight:
                        "700",
                    }}
                  >
                    Q
                    {index +
                      1}
                  </button>
                )
              )}

            </div>

            {/* QUESTION */}

            <div>

              <label>
                Question{" "}
                {currentQuestion +
                  1}
              </label>

              <textarea
                value={
                  currentQuestionData.question
                }
                onChange={(e) =>
                  updateQuestion(
                    "question",
                    e.target.value
                  )
                }
                rows="4"
                placeholder="Question यहाँ लिखें..."
              />

            </div>

            {/* OPTIONS */}

            <div
              style={{
                display: "grid",
                gap: "12px",
                marginTop:
                  "15px",
              }}
            >

              {currentQuestionData.options.map(
                (
                  option,
                  index
                ) => (
                  <div
                    key={
                      index
                    }
                  >

                    <label>
                      Option{" "}
                      {String.fromCharCode(
                        65 +
                          index
                      )}
                    </label>

                    <input
                      value={
                        option
                      }
                      onChange={(
                        e
                      ) =>
                        updateOption(
                          index,
                          e.target
                            .value
                        )
                      }
                      placeholder={`Option ${String.fromCharCode(
                        65 +
                          index
                      )}`}
                    />

                  </div>
                )
              )}

            </div>

            {/* ANSWER */}

            <div
              style={{
                marginTop:
                  "15px",
              }}
            >

              <label>
                Correct Answer
              </label>

              <select
                value={
                  currentQuestionData.answer
                }
                onChange={(e) =>
                  updateQuestion(
                    "answer",
                    Number(
                      e.target
                        .value
                    )
                  )
                }
              >

                <option value={0}>
                  A
                </option>

                <option value={1}>
                  B
                </option>

                <option value={2}>
                  C
                </option>

                <option value={3}>
                  D
                </option>

              </select>

            </div>

            {/* EXPLANATION */}

            <div
              style={{
                marginTop:
                  "15px",
              }}
            >

              <label>
                Explanation
              </label>

              <textarea
                value={
                  currentQuestionData.explanation
                }
                onChange={(e) =>
                  updateQuestion(
                    "explanation",
                    e.target.value
                  )
                }
                rows="4"
                placeholder="Answer की explanation..."
              />

            </div>

            {/* EXPLANATION IMAGE */}

            <div
              style={{
                marginTop:
                  "15px",
              }}
            >

              <label>
                Explanation Image URL
              </label>

              <input
                value={
                  currentQuestionData.explanationImage
                }
                onChange={(e) =>
                  updateQuestion(
                    "explanationImage",
                    e.target.value
                  )
                }
                placeholder="https://..."
              />

            </div>

            {/* SAVE */}

            <button
              className="admin-btn primary"
              onClick={
                saveTest
              }
              disabled={
                saving
              }
              style={{
                width:
                  "100%",
                marginTop:
                  "25px",
                padding:
                  "15px",
                fontSize:
                  "18px",
              }}
            >
              {saving
                ? "⏳ Saving..."
                : "💾 Save Test"}
            </button>

          </div>

          {/* SAVED TESTS */}

          <div className="admin-card">

            <h2>
              📋 Saved Tests
            </h2>

            {testEntries.length ===
            0 ? (
              <p>
                अभी कोई Test save नहीं है।
              </p>
            ) : (
              <div
                style={{
                  display:
                    "grid",
                  gap:
                    "12px",
                }}
              >

                {testEntries.map(
                  (
                    [
                      id,
                      test,
                    ]
                  ) => (
                    <div
                      key={
                        id
                      }
                      style={{
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                        alignItems:
                          "center",
                        gap:
                          "10px",
                        flexWrap:
                          "wrap",
                        padding:
                          "15px",
                        border:
                          "1px solid #e2e8f0",
                        borderRadius:
                          "12px",
                      }}
                    >

                      <div>

                        <strong>
                          {
                            test.title
                          }
                        </strong>

                        <p
                          style={{
                            margin:
                              "5px 0 0",
                          }}
                        >
                          {
                            test.examName
                          }{" "}
                          • Test{" "}
                          {
                            test.testNumber
                          }{" "}
                          •{" "}
                          {
                            test.totalQuestions
                          }{" "}
                          Questions •{" "}
                          {
                            test.type ||
                              "Free"
                          }
                        </p>

                      </div>

                      <div>

                        <button
                          className="admin-btn primary"
                          onClick={() =>
                            loadTest(
                              id,
                              test
                            )
                          }
                        >
                          ✏️ Edit
                        </button>

                        <button
                          className="admin-btn danger"
                          onClick={() =>
                            deleteTest(
                              id,
                              test.title
                            )
                          }
                          style={{
                            marginLeft:
                              "8px",
                          }}
                        >
                          🗑️ Delete
                        </button>

                      </div>

                    </div>
                  )
                )}

              </div>
            )}

          </div>

        </div>
      )}

      {/* ==================================================
          RESOURCES
      ================================================== */}

      {activeSection ===
        "resources" && (

        <div className="admin-content">

          <div className="admin-card">

            <h2>
              📚 Resources
            </h2>

            {siteResources.length ===
            0 ? (
              <p>
                अभी कोई Resource उपलब्ध नहीं है।
              </p>
            ) : (
              <>
                {siteResources.map(
                  (
                    item,
                    index
                  ) => (
                    <div
                      key={
                        index
                      }
                      style={{
                        marginBottom:
                          "15px",
                        padding:
                          "15px",
                        border:
                          "1px solid #e2e8f0",
                        borderRadius:
                          "12px",
                      }}
                    >

                      <input
                        value={
                          item.title ||
                          ""
                        }
                        onChange={(
                          e
                        ) =>
                          updateResource(
                            index,
                            "title",
                            e.target
                              .value
                          )
                        }
                        placeholder="Resource Title"
                      />

                      <input
                        value={
                          item.url ||
                          ""
                        }
                        onChange={(
                          e
                        ) =>
                          updateResource(
                            index,
                            "url",
                            e.target
                              .value
                          )
                        }
                        placeholder="Resource URL"
                        style={{
                          marginTop:
                            "10px",
                        }}
                      />

                    </div>
                  )
                )}

                <button
                  className="admin-btn primary"
                  onClick={
                    saveResources
                  }
                  disabled={
                    saving
                  }
                >
                  💾 Save Resources
                </button>
              </>
            )}

          </div>

        </div>
      )}

      {/* ==================================================
          NCERT SECTION
      ================================================== */}

      {activeSection === "ncert" && (
        <div className="admin-content">
          <NCERTAdmin
            onBack={() => setActiveSection("resources")}
          />
        </div>
      )}

    </div>
  );
}
