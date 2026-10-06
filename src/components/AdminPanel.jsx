import React, { useEffect, useState } from "react";
import "./AdminPanel.css";

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
  update,
} from "firebase/database";

import {
  getAuth,
  onAuthStateChanged,
} from "firebase/auth";

import firebaseConfig from "../firebase-config.json";

/* =========================================================
   FIREBASE
========================================================= */

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

/* =========================================================
   ADMIN EMAIL
========================================================= */

const ADMIN_EMAIL = "cciashish@gmail.com";

/* =========================================================
   EXAMS
========================================================= */

const exams = [
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

/* =========================================================
   EMPTY QUESTION
========================================================= */

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

/* =========================================================
   NORMALIZE ANSWER
========================================================= */

function normalizeAnswer(q) {
  // हमेशा 0-3 index: A=0, B=1, C=2, D=3

  // Explicit zero-based index को सबसे पहले प्राथमिकता दें
  const explicitIndex = q?.answerIndex ?? q?.correctIndex;
  if (explicitIndex !== undefined && explicitIndex !== null && explicitIndex !== "") {
    const n = Number(explicitIndex);
    if (Number.isInteger(n) && n >= 0 && n <= 3) return n;
  }

  let answer = q?.answer ?? q?.correctAnswer ?? q?.correct;
  if (answer === undefined || answer === null || answer === "") return 0;

  // Numeric answer
  if (typeof answer === "number") {
    if (Number.isInteger(answer) && answer >= 0 && answer <= 3) return answer;
    if (answer === 4) return 3;
    return 0;
  }

  const value = String(answer).trim();
  const upper = value.toUpperCase();

  // A/B/C/D
  if (/^[ABCD]$/.test(upper)) {
    return upper.charCodeAt(0) - 65;
  }

  // A) / B. / C: / D-
  const letterMatch = upper.match(/^([ABCD])\s*[)\.\-:]/);
  if (letterMatch) {
    return letterMatch[1].charCodeAt(0) - 65;
  }

  // 1/2/3/4 => A/B/C/D
  if (/^[1-4]$/.test(upper)) {
    return Number(upper) - 1;
  }

  // पूरा correct option text हो तो options से match करें
  const options = Array.isArray(q?.options)
    ? q.options
    : [
        q?.optionA ?? q?.A ?? "",
        q?.optionB ?? q?.B ?? "",
        q?.optionC ?? q?.C ?? "",
        q?.optionD ?? q?.D ?? "",
      ];

  const normalizedAnswer = value
    .replace(/^[ABCD]\s*[)\.\-:]\s*/i, "")
    .trim()
    .toLowerCase();

  const matchedIndex = options.findIndex(
    (option) =>
      String(option ?? "").trim().toLowerCase() === normalizedAnswer
  );

  if (matchedIndex >= 0 && matchedIndex <= 3) return matchedIndex;

  console.warn("Answer match नहीं मिला:", answer, options);
  return 0;
}

/* =========================================================
   JSON NORMALIZER
========================================================= */

function normalizeImportedQuestions(data) {
  let source = [];

  if (Array.isArray(data)) {
    source = data;
  } else if (Array.isArray(data?.questions)) {
    source = data.questions;
  } else if (Array.isArray(data?.data)) {
    source = data.data;
  }

  return source.map((q, index) => {
    const options = Array.isArray(q?.options)
      ? q.options
      : [
          q?.optionA ?? q?.A ?? "",
          q?.optionB ?? q?.B ?? "",
          q?.optionC ?? q?.C ?? "",
          q?.optionD ?? q?.D ?? "",
        ];

    return {
      id: q?.id ?? index + 1,

      question:
        q?.question ??
        q?.questionText ??
        q?.text ??
        "",

      options: [
        options[0] ?? "",
        options[1] ?? "",
        options[2] ?? "",
        options[3] ?? "",
      ],

      answer: normalizeAnswer(q),

      explanation:
        q?.explanation ??
        q?.solution ??
        "",

      explanationImage:
        q?.explanationImage ??
        q?.image ??
        "",
    };
  });
}

/* =========================================================
   ADMIN PANEL
========================================================= */

export default function AdminPanel({
  user,
  tests = {},
  resources = [],
  onClose,
}) {
  /* =======================================================
     AUTH
  ======================================================= */

  const [currentUser, setCurrentUser] =
    useState(user || null);

  const [authChecking, setAuthChecking] =
    useState(!user);

  /* =======================================================
     FIREBASE DATA
  ======================================================= */

  const [cloudTests, setCloudTests] =
    useState(tests || {});

  const [siteResources, setSiteResources] =
    useState(resources || []);

  /* =======================================================
     TEST SETTINGS
  ======================================================= */

  const [selectedExam, setSelectedExam] =
    useState("uppcs");

  /* =======================================================
     EXAM MANAGEMENT
  ======================================================= */

  const [examList, setExamList] = useState(exams);
  const [examName, setExamName] = useState("");
  const [examIcon, setExamIcon] = useState("📚");
  const [examFreeTests, setExamFreeTests] = useState(1);
  const [examPaidPrice, setExamPaidPrice] = useState(19);
  const [editingExamId, setEditingExamId] = useState(null);

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

  /* =======================================================
     QUESTIONS
  ======================================================= */

  const [questions, setQuestions] =
    useState([createQuestion(1)]);

  const [currentQuestion, setCurrentQuestion] =
    useState(0);

  /* =======================================================
     UI
  ======================================================= */

  const [activeSection, setActiveSection] =
    useState("tests");

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [importingQuestions, setImportingQuestions] =
    useState(false);

  const [importInputKey, setImportInputKey] =
    useState(Date.now());

  /* =======================================================
     STUDENT SUPPORT MESSAGES
  ======================================================= */

  const [supportMessages, setSupportMessages] =
    useState([]);

  const [supportLoading, setSupportLoading] =
    useState(true);

  const [supportReply, setSupportReply] =
    useState({});

  const [supportSaving, setSupportSaving] =
    useState({});

  /* =======================================================
     AUTH LISTENER
  ======================================================= */

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

  /* =======================================================
     LOAD TESTS
  ======================================================= */

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
          "Tests load error:",
          error
        );
      }
    );

    return () => unsubscribe();
  }, []);

  /* =======================================================
     LOAD EXAMS / EXAM PRICING SETTINGS
  ======================================================= */

  useEffect(() => {
    const examRef = ref(db, "examSettings");

    const unsubscribe = onValue(
      examRef,
      (snapshot) => {
        const value = snapshot.val();
        const stored = Array.isArray(value?.exams)
          ? value.exams
          : Array.isArray(value)
            ? value
            : null;

        if (stored && stored.length) {
          setExamList(stored);
        } else {
          setExamList(exams);
        }
      },
      (error) => {
        console.error("Exam settings load error:", error);
        setExamList(exams);
      }
    );

    return () => unsubscribe();
  }, []);

  /* =======================================================
     LOAD RESOURCES
  ======================================================= */

  useEffect(() => {
    const resourceRef = ref(
      db,
      "siteContent/resources"
    );

    const unsubscribe = onValue(
      resourceRef,
      (snapshot) => {
        const value = snapshot.val();

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

  /* =======================================================
     LOAD STUDENT SUPPORT MESSAGES
  ======================================================= */

  useEffect(() => {
    const supportRef = ref(db, "supportMessages");

    const unsubscribe = onValue(
      supportRef,
      (snapshot) => {
        const value = snapshot.val();

        if (!value) {
          setSupportMessages([]);
          setSupportLoading(false);
          return;
        }

        const list = Object.entries(value)
          .map(([id, item]) => ({
            id,
            ...(item || {}),
          }))
          .sort(
            (a, b) =>
              Number(b.createdAt || 0) -
              Number(a.createdAt || 0)
          );

        setSupportMessages(list);
        setSupportLoading(false);
      },
      (error) => {
        console.error(
          "Support messages load error:",
          error
        );
        setSupportLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  /* =======================================================
     AUTH LOADING
  ======================================================= */

  if (authChecking) {
    return (
      <div className="admin-page">
        <div className="admin-loading">
          ⏳ Admin Panel Loading...
        </div>
      </div>
    );
  }

  /* =======================================================
     ADMIN SECURITY
  ======================================================= */

  if (
    !currentUser ||
    currentUser.email?.toLowerCase() !==
      ADMIN_EMAIL.toLowerCase()
  ) {
    return (
      <div className="admin-page">
        <div className="admin-denied">
          <div className="denied-icon">
            🔐
          </div>

          <h2>
            Admin Access Denied
          </h2>

          <p>
            केवल authorized admin account से
            Admin Panel खोला जा सकता है।
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

  /* =======================================================
     SUPPORT HELPERS
  ======================================================= */

  const formatSupportTime = (timestamp) => {
    if (!timestamp) return "";

    try {
      return new Date(timestamp).toLocaleString(
        "hi-IN",
        {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }
      );
    } catch {
      return "";
    }
  };

  const saveSupportReply = async (item) => {
    const reply = (supportReply[item.id] || "").trim();

    if (!reply) {
      alert("पहले Reply लिखें।");
      return;
    }

    try {
      setSupportSaving((prev) => ({
        ...prev,
        [item.id]: true,
      }));

      await update(
        ref(db, `supportMessages/${item.id}`),
        {
          adminReply: reply,
          status: "replied",
          repliedBy:
            currentUser?.email || ADMIN_EMAIL,
          updatedAt: Date.now(),
        }
      );

      setSupportReply((prev) => ({
        ...prev,
        [item.id]: "",
      }));

      setMessage("✅ Student को Reply save हो गया।");
    } catch (error) {
      console.error(
        "Support reply error:",
        error
      );

      alert(
        `❌ Reply Save Error: ${
          error?.message || "Unknown error"
        }`
      );
    } finally {
      setSupportSaving((prev) => ({
        ...prev,
        [item.id]: false,
      }));
    }
  };

  const deleteSupportMessage = async (item) => {
    const ok = window.confirm(
      `क्या आप ${item.name || "Student"} का यह Support message delete करना चाहते हैं?`
    );

    if (!ok) return;

    try {
      await remove(
        ref(db, `supportMessages/${item.id}`)
      );

      setMessage("🗑️ Support message delete हो गया।");
    } catch (error) {
      console.error(
        "Support delete error:",
        error
      );

      alert(
        `❌ Delete Error: ${
          error?.message || "Unknown error"
        }`
      );
    }
  };

  const openStudentWhatsApp = (item) => {
    const mobile = String(item.mobile || "")
      .replace(/\D/g, "");

    if (!mobile) {
      alert("इस Student का mobile number उपलब्ध नहीं है।");
      return;
    }

    const number = mobile.length === 10
      ? `91${mobile}`
      : mobile;

    const text = encodeURIComponent(
      `नमस्ते ${item.name || "Student"},\n\nआपकी समस्या के संबंध में Study With Power Support से संपर्क किया जा रहा है।`
    );

    window.open(
      `https://wa.me/${number}?text=${text}`,
      "_blank"
    );
  };

  /* =======================================================
     HELPERS
  ======================================================= */

  const getExamName = (id) =>
    examList.find(
      (exam) => exam.id === id
    )?.name || id;

  const getExamIcon = (id) =>
    examList.find(
      (exam) => exam.id === id
    )?.icon || "📚";

  const getTestId = () =>
    `${selectedExam}_test_${Number(
      testNumber
    )}`;

  const getExamPricing = (examId = selectedExam, number = testNumber) => {
    const exam = examList.find((item) => item.id === examId);
    const freeTests = Number(exam?.freeTests ?? exam?.paidAfter ?? 1);
    const paidPrice = Number(exam?.paidPrice ?? 0);
    return {
      freeTests,
      paidPrice,
      price: Number(number) <= freeTests ? 0 : paidPrice,
    };
  };

  /* =======================================================
     EXAM MANAGEMENT HELPERS
  ======================================================= */

  const resetExamForm = () => {
    setEditingExamId(null);
    setExamName("");
    setExamIcon("📚");
    setExamFreeTests(1);
    setExamPaidPrice(19);
  };

  const saveExam = async () => {
    const name = examName.trim();
    if (!name) {
      alert("Exam Name डालें।");
      return;
    }

    const freeTests = Math.max(0, Number(examFreeTests) || 0);
    const paidPrice = Math.max(0, Number(examPaidPrice) || 0);

    const id = editingExamId || name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || `exam-${Date.now()}`;

    if (!editingExamId && examList.some((exam) => exam.id === id)) {
      alert("यह Exam पहले से मौजूद है। अलग Exam Name रखें।");
      return;
    }

    const examData = {
      id,
      name,
      icon: examIcon || "📚",
      freeTests,
      paidAfter: freeTests,
      paidPrice,
      updatedAt: Date.now(),
    };

    const next = editingExamId
      ? examList.map((exam) =>
          exam.id === editingExamId ? { ...exam, ...examData, id: editingExamId } : exam
        )
      : [...examList, examData];

    try {
      setSaving(true);
      await set(ref(db, "examSettings"), {
        exams: next,
        updatedAt: Date.now(),
        updatedBy: currentUser?.email || ADMIN_EMAIL,
      });

      setExamList(next);
      setSelectedExam(editingExamId || id);
      setMessage(`✅ ${name} Exam successfully save हो गया।`);
      resetExamForm();
    } catch (error) {
      console.error("Save exam error:", error);
      alert(`❌ Exam Save नहीं हुआ:\n${error?.message || "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  };

  const editExam = (exam) => {
    setEditingExamId(exam.id);
    setExamName(exam.name || "");
    setExamIcon(exam.icon || "📚");
    setExamFreeTests(Number(exam.freeTests ?? exam.paidAfter ?? 1));
    setExamPaidPrice(Number(exam.paidPrice ?? 19));
    setActiveSection("exams");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteExam = async (exam) => {
    const used = testEntries.some(([, test]) => test?.exam === exam.id);
    const warning = used
      ? `\n\n⚠️ इस Exam के ${testEntries.filter(([, test]) => test?.exam === exam.id).length} Test मौजूद हैं।`
      : "";

    if (!window.confirm(`\"${exam.name}\" Exam delete करना चाहते हैं?${warning}`)) return;

    const next = examList.filter((item) => item.id !== exam.id);
    if (!next.length) {
      alert("कम से कम 1 Exam रखना जरूरी है।");
      return;
    }

    try {
      setSaving(true);
      await set(ref(db, "examSettings"), {
        exams: next,
        updatedAt: Date.now(),
        updatedBy: currentUser?.email || ADMIN_EMAIL,
      });
      setExamList(next);
      if (selectedExam === exam.id) setSelectedExam(next[0].id);
      setMessage(`🗑️ ${exam.name} Exam delete हो गया।`);
    } catch (error) {
      alert(`❌ Exam Delete Error:\n${error?.message || "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  };

  const openNewExam = () => {
    resetExamForm();
    setActiveSection("exams");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* =======================================================
     RESET FORM
  ======================================================= */

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

  /* =======================================================
     LOAD EXISTING TEST
  ======================================================= */

  const loadTest = (id, test) => {
    if (!test) return;

    setActiveSection("tests");

    setSelectedExam(
      test.exam || "uppcs"
    );

    setTestNumber(
      Number(test.testNumber || 1)
    );

    setTestTitle(
      test.title || ""
    );

    setTestStatus(
      test.status || "draft"
    );

    setTestDuration(
      Number(test.duration || 30)
    );

    setTestPrice(
      Number(test.price || 0)
    );

    const loadedQuestions =
      Array.isArray(test.questions)
        ? test.questions
        : [];

    if (loadedQuestions.length > 0) {
      setQuestions(
        loadedQuestions.map(
          (q, index) => ({
            id:
              q?.id ??
              index + 1,

            question:
              q?.question ||
              q?.questionText ||
              "",

            options:
              Array.isArray(q?.options)
                ? [
                    q.options[0] || "",
                    q.options[1] || "",
                    q.options[2] || "",
                    q.options[3] || "",
                  ]
                : [
                    "",
                    "",
                    "",
                    "",
                  ],

            answer:
              normalizeAnswer(q),

            explanation:
              q?.explanation || "",

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

  /* =======================================================
     ADD QUESTION
  ======================================================= */

  const addQuestion = () => {
    if (questions.length >= 150) {
      alert(
        "❌ Maximum 150 Questions allowed हैं।"
      );
      return;
    }

    const newIndex =
      questions.length;

    setQuestions((prev) => [
      ...prev,
      createQuestion(
        newIndex + 1
      ),
    ]);

    setCurrentQuestion(
      newIndex
    );

    setMessage(
      `✅ Question ${
        newIndex + 1
      } added.`
    );
  };

  /* =======================================================
     DELETE QUESTION
  ======================================================= */

  const deleteQuestion = () => {
    if (questions.length <= 1) {
      alert(
        "कम से कम 1 Question होना जरूरी है।"
      );
      return;
    }

    const ok = window.confirm(
      `Question ${
        currentQuestion + 1
      } delete करें?`
    );

    if (!ok) return;

    const newQuestions =
      questions.filter(
        (_, index) =>
          index !== currentQuestion
      );

    const normalized =
      newQuestions.map(
        (q, index) => ({
          ...q,
          id: index + 1,
        })
      );

    setQuestions(normalized);

    setCurrentQuestion(
      Math.min(
        currentQuestion,
        normalized.length - 1
      )
    );

    setMessage(
      "🗑️ Question deleted."
    );
  };

  /* =======================================================
     UPDATE QUESTION
  ======================================================= */

  const updateQuestion = (
    field,
    value
  ) => {
    setQuestions((prev) =>
      prev.map(
        (question, index) =>
          index === currentQuestion
            ? {
                ...question,
                [field]: value,
              }
            : question
      )
    );
  };

  /* =======================================================
     UPDATE OPTION
  ======================================================= */

  const updateOption = (
    optionIndex,
    value
  ) => {
    setQuestions((prev) =>
      prev.map(
        (question, index) => {
          if (
            index !==
            currentQuestion
          ) {
            return question;
          }

          const options = [
            ...(question.options || [
              "",
              "",
              "",
              "",
            ]),
          ];

          options[optionIndex] =
            value;

          return {
            ...question,
            options,
          };
        }
      )
    );
  };

  /* =======================================================
     CHANGE ANSWER
  ======================================================= */

  const updateAnswer = (value) => {
    setQuestions((prev) =>
      prev.map(
        (question, index) =>
          index === currentQuestion
            ? {
                ...question,
                answer: Number(value),
              }
            : question
      )
    );
  };

  /* =======================================================
     IMPORT QUESTIONS JSON
  ======================================================= */

  const handleImportQuestionsJSON =
    async (event) => {
      const file =
        event.target.files?.[0];

      if (!file) return;

      try {
        setImportingQuestions(true);
        setMessage("");

        const fileText =
          await file.text();

        let data;

        try {
          data =
            JSON.parse(fileText);
        } catch (error) {
          alert(
            "❌ JSON file सही format में नहीं है।"
          );
          return;
        }

        const importedQuestions =
          normalizeImportedQuestions(
            data
          );

        if (
          !importedQuestions.length
        ) {
          alert(
            "❌ JSON में कोई Question नहीं मिला।"
          );
          return;
        }

        /* VALIDATION */

        const invalidIndex =
          importedQuestions.findIndex(
            (q) => {
              return (
                !String(
                  q.question || ""
                ).trim() ||
                !Array.isArray(
                  q.options
                ) ||
                q.options.length !==
                  4 ||
                q.options.some(
                  (option) =>
                    !String(
                      option || ""
                    ).trim()
                )
              );
            }
          );

        if (
          invalidIndex !== -1
        ) {
          alert(
            `❌ Question ${
              invalidIndex + 1
            } में Question और सभी 4 Options भरना जरूरी है।`
          );

          setCurrentQuestion(
            invalidIndex
          );

          return;
        }

        if (
          importedQuestions.length >
          150
        ) {
          alert(
            "❌ Maximum 150 Questions allowed हैं।"
          );
          return;
        }

        const replaceExisting =
          window.confirm(
            `JSON में ${importedQuestions.length} Questions मिले हैं।

OK = पुराने Questions हटाकर JSON Questions लगाएँ

Cancel = पुराने Questions के साथ JSON Questions जोड़ें`
          );

        const finalQuestions =
          replaceExisting
            ? importedQuestions
            : [
                ...questions,
                ...importedQuestions,
              ];

        if (
          finalQuestions.length >
          150
        ) {
          alert(
            `❌ कुल Questions ${finalQuestions.length} हो रहे हैं। Maximum 150 Questions रखें।`
          );
          return;
        }

        setQuestions(
          finalQuestions.map(
            (q, index) => ({
              ...q,
              id: index + 1,
            })
          )
        );

        setCurrentQuestion(0);

        setMessage(
          `✅ ${importedQuestions.length} Questions JSON से Import हो गए। अब Save Test दबाएँ।`
        );
      } catch (error) {
        console.error(
          "JSON Import Error:",
          error
        );

        alert(
          `❌ JSON Import Error: ${
            error?.message ||
            "Unknown error"
          }`
        );
      } finally {
        setImportingQuestions(false);

        setImportInputKey(
          Date.now()
        );
      }
    };

  /* =======================================================
     EXPORT QUESTIONS JSON
  ======================================================= */

  const exportQuestionsJSON =
    () => {
      if (!questions.length) {
        alert(
          "Export करने के लिए कोई Question नहीं है।"
        );
        return;
      }

      const data = {
        exam: selectedExam,

        testNumber:
          Number(testNumber) || 1,

        title:
          testTitle ||
          `${getExamName(
            selectedExam
          )} Test ${testNumber}`,

        questions:
          questions.map(
            (q, index) => ({
              id: index + 1,

              question:
                q.question || "",

              options: [
                q.options?.[0] ||
                  "",
                q.options?.[1] ||
                  "",
                q.options?.[2] ||
                  "",
                q.options?.[3] ||
                  "",
              ],

              /*
                answer 0=A
                answer 1=B
                answer 2=C
                answer 3=D
              */

              answer:
                Number.isInteger(
                  Number(q.answer)
                )
                  ? Number(q.answer)
                  : 0,

              explanation:
                q.explanation ||
                "",

              explanationImage:
                q.explanationImage ||
                "",
            })
          ),
      };

      const blob =
        new Blob(
          [
            JSON.stringify(
              data,
              null,
              2
            ),
          ],
          {
            type:
              "application/json;charset=utf-8",
          }
        );

      const url =
        URL.createObjectURL(
          blob
        );

      const link =
        document.createElement(
          "a"
        );

      link.href = url;

      link.download =
        `${selectedExam}-test-${testNumber}-questions.json`;

      document.body.appendChild(
        link
      );

      link.click();

      document.body.removeChild(
        link
      );

      URL.revokeObjectURL(url);

      setMessage(
        "✅ Questions JSON Export हो गया।"
      );
    };

  /* =======================================================
     VALIDATE TEST
  ======================================================= */

  const validateTest = () => {
    if (!selectedExam) {
      alert(
        "Exam select करें।"
      );
      return false;
    }

    if (
      !testNumber ||
      Number(testNumber) < 1
    ) {
      alert(
        "Valid Test Number डालें।"
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
      !testDuration ||
      Number(testDuration) < 1
    ) {
      alert(
        "Valid Test Duration डालें।"
      );
      return false;
    }

    if (
      Number(testPrice) < 0
    ) {
      alert(
        "Price 0 या उससे अधिक होना चाहिए।"
      );
      return false;
    }

    if (
      !questions.length
    ) {
      alert(
        "कम से कम 1 Question होना जरूरी है।"
      );
      return false;
    }

    if (
      questions.length >
      150
    ) {
      alert(
        "Maximum 150 Questions allowed हैं।"
      );
      return false;
    }

    const invalidQuestion =
      questions.findIndex(
        (q) =>
          !String(
            q.question || ""
          ).trim() ||
          !Array.isArray(
            q.options
          ) ||
          q.options.length !==
            4 ||
          q.options.some(
            (option) =>
              !String(
                option || ""
              ).trim()
          )
      );

    if (
      invalidQuestion !== -1
    ) {
      setCurrentQuestion(
        invalidQuestion
      );

      alert(
        `Question ${
          invalidQuestion + 1
        } में Question और सभी 4 Options भरना जरूरी है।`
      );

      return false;
    }

    const invalidAnswer =
      questions.findIndex(
        (q) =>
          !Number.isInteger(
            Number(q.answer)
          ) ||
          Number(q.answer) < 0 ||
          Number(q.answer) > 3
      );

    if (
      invalidAnswer !== -1
    ) {
      setCurrentQuestion(
        invalidAnswer
      );

      alert(
        `Question ${
          invalidAnswer + 1
        } का सही Answer select करें।`
      );

      return false;
    }

    return true;
  };

  /* =======================================================
     SAVE TEST
  ======================================================= */

  const saveTest = async () => {
    if (!validateTest()) {
      return;
    }

    const testId =
      getTestId();

    const finalTitle =
      testTitle.trim();

    const testData = {
      id: testId,

      exam: selectedExam,

      examName:
        getExamName(
          selectedExam
        ),

      examIcon:
        getExamIcon(
          selectedExam
        ),

      testNumber:
        Number(testNumber),

      title: finalTitle,

      status: testStatus,

      duration:
        Number(testDuration),

      price:
        getExamPricing(selectedExam, testNumber).price,

      pricing: {
        freeTests: getExamPricing(selectedExam, testNumber).freeTests,
        paidPrice: getExamPricing(selectedExam, testNumber).paidPrice,
      },

      questions:
        questions.map(
          (q, index) => ({
            id: index + 1,

            question:
              String(
                q.question || ""
              ).trim(),

            options: [
              String(
                q.options?.[0] || ""
              ).trim(),

              String(
                q.options?.[1] || ""
              ).trim(),

              String(
                q.options?.[2] || ""
              ).trim(),

              String(
                q.options?.[3] || ""
              ).trim(),
            ],

            answer:
              Number(q.answer),

            explanation:
              q.explanation || "",

            explanationImage:
              q.explanationImage ||
              "",
          })
        ),

      questionCount:
        questions.length,

      createdAt:
        cloudTests?.[testId]
          ?.createdAt ||
        Date.now(),

      updatedAt:
        Date.now(),

      createdBy:
        currentUser?.email ||
        ADMIN_EMAIL,
    };

    try {
      setSaving(true);
      setMessage("");

      await set(
        ref(
          db,
          `tests/${testId}`
        ),
        testData
      );

      setMessage(
        `✅ ${finalTitle} successfully Firebase में save हो गया।`
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (error) {
      console.error(
        "Save test error:",
        error
      );

      alert(
        `❌ Test Save नहीं हुआ:
${error?.message || "Unknown Firebase error"}`
      );

      setMessage(
        "❌ Test Save करने में समस्या हुई।"
      );
    } finally {
      setSaving(false);
    }
  };

  /* =======================================================
     DELETE TEST
  ======================================================= */

  const deleteTest = async (
    id,
    test
  ) => {
    const title =
      test?.title ||
      id;

    const ok =
      window.confirm(
        `क्या आप "${title}" delete करना चाहते हैं?

यह action वापस नहीं किया जा सकता।`
      );

    if (!ok) return;

    try {
      await remove(
        ref(
          db,
          `tests/${id}`
        )
      );

      setMessage(
        `🗑️ ${title} delete हो गया।`
      );
    } catch (error) {
      console.error(
        "Delete test error:",
        error
      );

      alert(
        `❌ Delete Error:
${error?.message || "Unknown error"}`
      );
    }
  };

  /* =======================================================
     RESOURCE UPDATE
  ======================================================= */

  const updateResource = (
    index,
    field,
    value
  ) => {
    setSiteResources(
      (prev) =>
        prev.map(
          (item, i) =>
            i === index
              ? {
                  ...item,
                  [field]: value,
                }
              : item
        )
    );
  };

  /* =======================================================
     ADD RESOURCE
  ======================================================= */

  const addResource = () => {
    setSiteResources(
      (prev) => [
        ...prev,
        {
          id:
            Date.now(),
          title: "",
          description: "",
          url: "",
          image: "",
        },
      ]
    );
  };

  /* =======================================================
     DELETE RESOURCE
  ======================================================= */

  const deleteResource = (
    index
  ) => {
    const ok =
      window.confirm(
        "इस Resource को delete करें?"
      );

    if (!ok) return;

    setSiteResources(
      (prev) =>
        prev.filter(
          (_, i) =>
            i !== index
        )
    );
  };

  /* =======================================================
     SAVE RESOURCES
  ======================================================= */

  const saveResources = async () => {
    try {
      setSaving(true);
      setMessage("");

      await set(
        ref(
          db,
          "siteContent/resources"
        ),
        siteResources
      );

      setMessage(
        "✅ Resources successfully save हो गए।"
      );
    } catch (error) {
      console.error(
        "Resource save error:",
        error
      );

      alert(
        `❌ Resources Save Error:
${error?.message || "Unknown error"}`
      );
    } finally {
      setSaving(false);
    }
  };

  /* =======================================================
     TEST LIST
  ======================================================= */

  const testEntries =
    Object.entries(
      cloudTests || {}
    ).sort(
      (a, b) =>
        Number(
          b[1]?.updatedAt || 0
        ) -
        Number(
          a[1]?.updatedAt || 0
        )
    );

  /* =======================================================
     CURRENT QUESTION
  ======================================================= */

  const activeQuestion =
    questions[
      currentQuestion
    ] ||
    createQuestion(
      currentQuestion + 1
    );

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="admin-page">

      {/* ===================================================
          HEADER
      =================================================== */}

      <header className="admin-header">

        <div className="admin-header-title">
          <h1>
            ⚙️ Admin Panel
          </h1>

          <p>
            Test Series • Questions • Resources
          </p>
        </div>

        <div className="admin-header-right">

          <div className="admin-email">
            👤{" "}
            {currentUser?.email ||
              ADMIN_EMAIL}
          </div>

          {onClose && (
            <button
              className="admin-btn secondary"
              onClick={onClose}
            >
              ← Back
            </button>
          )}

        </div>
      </header>

      {/* ===================================================
          MESSAGE
      =================================================== */}

      {message && (
        <div className="admin-message">
          {message}
        </div>
      )}

      {/* ===================================================
          TABS
      =================================================== */}

      <div className="admin-tabs">

        <button
          className={
            activeSection === "tests"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveSection(
              "tests"
            )
          }
        >
          📝 Test & Questions
        </button>

        <button
          className={
            activeSection === "list"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveSection(
              "list"
            )
          }
        >
          📚 Test List
        </button>

        <button
          className={
            activeSection === "exams"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveSection("exams")
          }
        >
          🏛️ Exams
        </button>

        <button
          className={
            activeSection === "resources"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveSection(
              "resources"
            )
          }
        >
          📂 Resources
        </button>

        <button
          className={
            activeSection === "support"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveSection("support")
          }
        >
          💬 Support
          {supportMessages.filter(
            (item) => item.status !== "replied"
          ).length > 0 && (
            <span
              style={{
                marginLeft: "6px",
                background: "#dc2626",
                color: "#fff",
                borderRadius: "999px",
                padding: "2px 7px",
                fontSize: "11px",
              }}
            >
              {supportMessages.filter(
                (item) => item.status !== "replied"
              ).length}
            </span>
          )}
        </button>

      </div>

      <main className="admin-content">

        {/* =================================================
            TEST EDITOR
        ================================================= */}

        {activeSection === "tests" && (
          <>

            <div className="admin-card">

              <div className="card-title">

                <div>
                  <h2>
                    📝 Create / Edit Test
                  </h2>

                  <p>
                    Exam select करें और Questions
                    add/import करके Test save करें।
                  </p>
                </div>

                <div className="question-top-actions">

                  <button
                    className="admin-btn secondary"
                    onClick={
                      resetTestForm
                    }
                  >
                    🔄 New Test
                  </button>

                  <button
                    className="admin-btn secondary"
                    onClick={
                      exportQuestionsJSON
                    }
                    disabled={
                      !questions.length
                    }
                  >
                    📤 Export JSON
                  </button>

                  <label
                    className="admin-btn secondary"
                    style={{
                      display:
                        "inline-flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                    }}
                  >
                    {importingQuestions
                      ? "⏳ Importing..."
                      : "📥 Import JSON"}

                    <input
                      key={
                        importInputKey
                      }
                      type="file"
                      accept=".json,application/json"
                      onChange={
                        handleImportQuestionsJSON
                      }
                      disabled={
                        importingQuestions
                      }
                      style={{
                        display:
                          "none",
                      }}
                    />
                  </label>

                  <button
                    type="button"
                    className="admin-btn primary"
                    onClick={openNewExam}
                  >
                    ➕ New Exam
                  </button>

                  <button
                    type="button"
                    className="admin-btn secondary"
                    onClick={() => setActiveSection("exams")}
                  >
                    ⚙️ Edit Exams
                  </button>

                </div>

              </div>

              {/* =========================================
                  TEST SETTINGS
              ========================================= */}

              <div className="form-grid">

                <div className="form-group">

                  <label>
                    Exam *
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
                    {examList.map(
                      (exam) => (
                        <option
                          key={
                            exam.id
                          }
                          value={
                            exam.id
                          }
                        >
                          {exam.icon}{" "}
                          {exam.name}
                        </option>
                      )
                    )}
                  </select>

                </div>

                <div className="form-group">

                  <label>
                    Test Number *
                  </label>

                  <input
                    type="number"
                    min="1"
                    value={
                      testNumber
                    }
                    onChange={(e) =>
                      setTestNumber(
                        Number(
                          e.target.value
                        )
                      )
                    }
                  />

                </div>

                <div className="form-group form-group-full">

                  <label>
                    Test Title *
                  </label>

                  <input
                    type="text"
                    placeholder="जैसे UPPCS Test Series 01"
                    value={
                      testTitle
                    }
                    onChange={(e) =>
                      setTestTitle(
                        e.target.value
                      )
                    }
                  />

                </div>

                <div className="form-group">

                  <label>
                    Status *
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

                    <option value="unlisted">
                      Unlisted
                    </option>

                    <option value="public">
                      Public
                    </option>

                    <option value="published">
                      Published
                    </option>
                  </select>

                </div>

                <div className="form-group">

                  <label>
                    Duration (Minutes) *
                  </label>

                  <input
                    type="number"
                    min="1"
                    value={
                      testDuration
                    }
                    onChange={(e) =>
                      setTestDuration(
                        Number(
                          e.target.value
                        )
                      )
                    }
                  />

                </div>

                <div className="form-group">

                  <label>
                    Price (₹) — Auto
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={
                      getExamPricing(selectedExam, testNumber).price
                    }
                    readOnly
                  />

                  <small>
                    {Number(testNumber) <= getExamPricing(selectedExam, testNumber).freeTests
                      ? `🆓 Test ${testNumber} Free है।`
                      : `💎 Test ${testNumber} Paid है — ₹${getExamPricing(selectedExam, testNumber).paidPrice}`}
                  </small>

                </div>

                <div className="form-group">

                  <label>
                    Test ID
                  </label>

                  <input
                    type="text"
                    value={
                      getTestId()
                    }
                    readOnly
                  />

                </div>

              </div>

            </div>

            {/* =========================================
                QUESTIONS CARD
            ========================================= */}

            <div className="admin-card">

              <div className="card-title">

                <div>
                  <h2>
                    ❓ Questions
                  </h2>

                  <p>
                    Total Questions:{" "}
                    <strong>
                      {questions.length}
                    </strong>{" "}
                    / 150
                  </p>
                </div>

                <div className="question-top-actions">

                  <button
                    className="admin-btn primary"
                    onClick={
                      addQuestion
                    }
                    disabled={
                      questions.length >=
                      150
                    }
                  >
                    ➕ Add Question
                  </button>

                  <button
                    className="admin-btn danger"
                    onClick={
                      deleteQuestion
                    }
                    disabled={
                      questions.length <=
                      1
                    }
                  >
                    🗑️ Delete Question
                  </button>

                </div>

              </div>

              {/* =======================================
                  QUESTION NUMBER TABS
              ======================================= */}

              <div className="question-tabs">

                {questions.map(
                  (q, index) => (
                    <button
                      key={
                        q.id ??
                        index
                      }
                      className={
                        currentQuestion ===
                        index
                          ? "active"
                          : ""
                      }
                      onClick={() =>
                        setCurrentQuestion(
                          index
                        )
                      }
                      title={`Question ${
                        index + 1
                      }`}
                    >
                      {index + 1}
                    </button>
                  )
                )}

              </div>

              {/* =======================================
                  QUESTION EDITOR
              ======================================= */}

              <div className="question-editor">

                <div className="question-number">
                  Question{" "}
                  {currentQuestion +
                    1}{" "}
                  /{" "}
                  {questions.length}
                </div>

                <div className="form-group">

                  <label>
                    Question *
                  </label>

                  <textarea
                    value={
                      activeQuestion.question ||
                      ""
                    }
                    onChange={(e) =>
                      updateQuestion(
                        "question",
                        e.target.value
                      )
                    }
                    placeholder="यहाँ Question लिखें..."
                    rows="4"
                  />

                </div>

                <h3 className="options-heading">
                  Options
                </h3>

                <div className="options-grid">

                  {[
                    "A",
                    "B",
                    "C",
                    "D",
                  ].map(
                    (
                      letter,
                      optionIndex
                    ) => (
                      <div
                        className="option-row"
                        key={
                          letter
                        }
                      >

                        <div className="option-label">
                          {letter}
                        </div>

                        <input
                          type="text"
                          value={
                            activeQuestion
                              .options?.[
                              optionIndex
                            ] || ""
                          }
                          onChange={(
                            e
                          ) =>
                            updateOption(
                              optionIndex,
                              e.target.value
                            )
                          }
                          placeholder={`Option ${letter}`}
                        />

                        <label className="correct-option">

                          <input
                            type="radio"
                            name={`answer-${currentQuestion}`}
                            checked={
                              Number(
                                activeQuestion.answer
                              ) ===
                              optionIndex
                            }
                            onChange={() =>
                              updateAnswer(
                                optionIndex
                              )
                            }
                          />

                          सही उत्तर
                        </label>

                      </div>
                    )
                  )}

                </div>

                {/* =====================================
                    EXPLANATION
                ===================================== */}

                <div
                  className="form-grid"
                  style={{
                    marginTop:
                      "25px",
                  }}
                >

                  <div className="form-group form-group-full">

                    <label>
                      Explanation / Solution
                    </label>

                    <textarea
                      value={
                        activeQuestion.explanation ||
                        ""
                      }
                      onChange={(e) =>
                        updateQuestion(
                          "explanation",
                          e.target.value
                        )
                      }
                      placeholder="Question का explanation लिखें..."
                      rows="5"
                    />

                  </div>

                  <div className="form-group form-group-full">

                    <label>
                      Explanation Image URL
                    </label>

                    <input
                      type="text"
                      value={
                        activeQuestion.explanationImage ||
                        ""
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

                </div>

                {/* =====================================
                    NAVIGATION
                ===================================== */}

                <div className="question-navigation">

                  <button
                    className="admin-btn secondary"
                    disabled={
                      currentQuestion ===
                      0
                    }
                    onClick={() =>
                      setCurrentQuestion(
                        (prev) =>
                          Math.max(
                            0,
                            prev - 1
                          )
                      )
                    }
                  >
                    ← Previous
                  </button>

                  <span>
                    Question{" "}
                    {currentQuestion +
                      1}{" "}
                    of{" "}
                    {questions.length}
                  </span>

                  <button
                    className="admin-btn primary"
                    disabled={
                      currentQuestion >=
                      questions.length -
                        1
                    }
                    onClick={() =>
                      setCurrentQuestion(
                        (prev) =>
                          Math.min(
                            questions.length -
                              1,
                            prev + 1
                          )
                      )
                    }
                  >
                    Next →
                  </button>

                </div>

              </div>

            </div>

            {/* =========================================
                SAVE TEST
            ========================================= */}

            <div className="admin-card">

              <div className="card-title">

                <div>
                  <h2>
                    💾 Save Test
                  </h2>

                  <p>
                    {getExamName(
                      selectedExam
                    )}{" "}
                    • Test{" "}
                    {testNumber}{" "}
                    •{" "}
                    {questions.length}{" "}
                    Questions
                  </p>
                </div>

              </div>

              <div className="save-test-area">

                <button
                  className="save-test-btn"
                  onClick={
                    saveTest
                  }
                  disabled={
                    saving
                  }
                >
                  {saving
                    ? "⏳ Saving..."
                    : "💾 Save Test to Firebase"}
                </button>

              </div>

            </div>

          </>
        )}

        {/* =================================================
            EXAM MANAGEMENT
        ================================================= */}

        {activeSection === "exams" && (
          <div className="admin-card">
            <div className="card-title">
              <div>
                <h2>🏛️ Exam Management</h2>
                <p>नया Exam जोड़ें और हर Exam की Free/Paid Test setting edit करें।</p>
              </div>

              <button
                type="button"
                className="admin-btn secondary"
                onClick={resetExamForm}
              >
                🔄 New Exam Form
              </button>
            </div>

            <div className="form-grid" style={{ marginBottom: 20 }}>
              <div className="form-group">
                <label>Exam Name *</label>
                <input
                  type="text"
                  value={examName}
                  onChange={(e) => setExamName(e.target.value)}
                  placeholder="जैसे UP Police"
                />
              </div>

              <div className="form-group">
                <label>Exam Icon</label>
                <input
                  type="text"
                  value={examIcon}
                  onChange={(e) => setExamIcon(e.target.value)}
                  placeholder="👮"
                />
              </div>

              <div className="form-group">
                <label>Free Tests *</label>
                <input
                  type="number"
                  min="0"
                  value={examFreeTests}
                  onChange={(e) => setExamFreeTests(Number(e.target.value))}
                />
                <small>इतने Test तक Student को Free access मिलेगा।</small>
              </div>

              <div className="form-group">
                <label>इसके बाद Paid Test Price (₹) *</label>
                <input
                  type="number"
                  min="0"
                  value={examPaidPrice}
                  onChange={(e) => setExamPaidPrice(Number(e.target.value))}
                />
                <small>Free Tests के बाद आने वाले Tests की default कीमत।</small>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 25 }}>
              <button
                type="button"
                className="admin-btn primary"
                onClick={saveExam}
                disabled={saving}
              >
                {saving ? "⏳ Saving..." : editingExamId ? "💾 Update Exam" : "➕ Add Exam"}
              </button>

              {editingExamId && (
                <button
                  type="button"
                  className="admin-btn secondary"
                  onClick={resetExamForm}
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <h3 style={{ marginBottom: 12 }}>📋 सभी Exams</h3>

            <div style={{ display: "grid", gap: 12 }}>
              {examList.map((exam) => {
                const examTests = testEntries.filter(([, test]) => test?.exam === exam.id);
                const freeTests = Number(exam.freeTests ?? exam.paidAfter ?? 1);
                const paidPrice = Number(exam.paidPrice ?? 0);

                return (
                  <div
                    key={exam.id}
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: 14,
                      padding: 15,
                      background: "#fff",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 15,
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: 17 }}>{exam.icon || "📚"} {exam.name}</strong>
                      <div style={{ marginTop: 5, color: "#475569" }}>
                        🆔 {exam.id} • 📚 {examTests.length} Tests
                      </div>
                      <div style={{ marginTop: 5, color: "#166534", fontWeight: 600 }}>
                        🆓 पहले {freeTests} Test Free • 💎 उसके बाद ₹{paidPrice}/Test
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="admin-btn edit"
                        onClick={() => editExam(exam)}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        type="button"
                        className="admin-btn danger"
                        onClick={() => deleteExam(exam)}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* =================================================
            TEST LIST
        ================================================= */}

        {activeSection === "list" && (
          <div className="admin-card">

            <div className="card-title">

              <div>
                <h2>
                  📚 Test List
                </h2>

                <p>
                  Firebase में saved सभी tests।
                </p>
              </div>

              <button
                className="admin-btn primary"
                onClick={() => {
                  resetTestForm();
                  setActiveSection(
                    "tests"
                  );
                }}
              >
                ➕ New Test
              </button>

            </div>

            {testEntries.length ===
            0 ? (
              <div className="empty-box">
                अभी कोई Test नहीं मिला।
              </div>
            ) : (
              <div className="test-list">

                {testEntries.map(
                  ([id, test]) => (
                    <div
                      className="test-list-item"
                      key={id}
                    >

                      <div className="test-list-info">

                        <strong>
                          {test?.examIcon ||
                            "📚"}{" "}
                          {test?.title ||
                            id}
                        </strong>

                        <span>
                          Exam:{" "}
                          {getExamName(
                            test?.exam ||
                              ""
                          )}
                        </span>

                        <span>
                          Test No:{" "}
                          {test?.testNumber ||
                            "-"}{" "}
                          • Questions:{" "}
                          {test?.questionCount ??
                            test?.questions
                              ?.length ??
                            0}{" "}
                          • Duration:{" "}
                          {test?.duration ||
                            0}{" "}
                          min
                        </span>

                        <span>
                          Price: ₹
                          {test?.price ??
                            0}
                        </span>

                        <span
                          className={`status-badge ${
                            test?.status ||
                            "draft"
                          }`}
                        >
                          {(
                            test?.status ||
                            "draft"
                          ).toUpperCase()}
                        </span>

                      </div>

                      <div className="test-list-actions">

                        <button
                          className="admin-btn edit"
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
                              test
                            )
                          }
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
        )}

        {/* =================================================
            STUDENT SUPPORT
        ================================================= */}

        {activeSection === "support" && (
          <div className="admin-card">

            <div className="card-title">
              <div>
                <h2>💬 Student Support Messages</h2>
                <p>
                  Students की भेजी हुई समस्याएँ यहाँ दिखाई देंगी।
                </p>
              </div>

              <div
                style={{
                  fontWeight: "700",
                  color: "#2563eb",
                }}
              >
                कुल: {supportMessages.length}
              </div>
            </div>

            {supportLoading ? (
              <div className="empty-box">
                ⏳ Messages load हो रहे हैं...
              </div>
            ) : supportMessages.length === 0 ? (
              <div className="empty-box">
                अभी कोई Student Support message नहीं आया है।
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gap: "14px",
                }}
              >
                {supportMessages.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: "14px",
                      padding: "15px",
                      background: "#fff",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "10px",
                        flexWrap: "wrap",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontWeight: "700",
                            fontSize: "16px",
                          }}
                        >
                          👤 {item.name || "Student"}
                        </div>

                        <div
                          style={{
                            marginTop: "4px",
                            color: "#475569",
                            fontSize: "13px",
                          }}
                        >
                          📱 {item.mobile || "Mobile नहीं मिला"}
                          {item.email ? ` • ✉️ ${item.email}` : ""}
                        </div>
                      </div>

                      <div
                        style={{
                          fontSize: "12px",
                          color: "#64748b",
                        }}
                      >
                        🕐 {formatSupportTime(item.createdAt)}
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: "12px",
                        padding: "12px",
                        background: "#f8fafc",
                        borderRadius: "10px",
                        lineHeight: 1.6,
                      }}
                    >
                      <strong>Student की समस्या:</strong>
                      <div style={{ marginTop: "5px" }}>
                        {item.message || "—"}
                      </div>
                    </div>

                    {item.adminReply && (
                      <div
                        style={{
                          marginTop: "10px",
                          padding: "12px",
                          background: "#eff6ff",
                          borderRadius: "10px",
                          lineHeight: 1.6,
                        }}
                      >
                        <strong>👨‍💼 आपका Reply:</strong>
                        <div style={{ marginTop: "5px" }}>
                          {item.adminReply}
                        </div>
                      </div>
                    )}

                    <div
                      style={{
                        marginTop: "12px",
                        display: "flex",
                        gap: "8px",
                        flexWrap: "wrap",
                      }}
                    >
                      <textarea
                        value={supportReply[item.id] || ""}
                        onChange={(e) =>
                          setSupportReply((prev) => ({
                            ...prev,
                            [item.id]: e.target.value,
                          }))
                        }
                        placeholder="Student को Reply लिखें..."
                        rows={2}
                        style={{
                          flex: "1 1 280px",
                          minWidth: "220px",
                          resize: "vertical",
                          border: "1px solid #cbd5e1",
                          borderRadius: "10px",
                          padding: "10px",
                          fontFamily: "inherit",
                          boxSizing: "border-box",
                        }}
                      />

                      <button
                        className="admin-btn primary"
                        onClick={() => saveSupportReply(item)}
                        disabled={supportSaving[item.id]}
                      >
                        {supportSaving[item.id]
                          ? "⏳ Saving..."
                          : "💾 Reply Save"}
                      </button>

                      <button
                        className="admin-btn secondary"
                        onClick={() => openStudentWhatsApp(item)}
                      >
                        📲 WhatsApp
                      </button>

                      <button
                        className="admin-btn danger"
                        onClick={() => deleteSupportMessage(item)}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* =================================================
            RESOURCES
        ================================================= */}

        {activeSection ===
          "resources" && (
          <div className="admin-card">

            <div className="card-title">

              <div>
                <h2>
                  📂 Site Resources
                </h2>

                <p>
                  Website के resources manage करें।
                </p>
              </div>

              <button
                className="admin-btn primary"
                onClick={
                  addResource
                }
              >
                ➕ Add Resource
              </button>

            </div>

            {siteResources.length ===
            0 ? (
              <div className="empty-box">
                कोई Resource नहीं है।
                <br />
                ऊपर Add Resource दबाएँ।
              </div>
            ) : (
              <div className="resources-list">

                {siteResources.map(
                  (
                    resource,
                    index
                  ) => (
                    <div
                      className="resource-editor"
                      key={
                        resource?.id ||
                        index
                      }
                    >

                      <div className="resource-number">
                        Resource{" "}
                        {index + 1}
                      </div>

                      <div className="form-group">

                        <label>
                          Title
                        </label>

                        <input
                          type="text"
                          value={
                            resource?.title ||
                            ""
                          }
                          onChange={(e) =>
                            updateResource(
                              index,
                              "title",
                              e.target
                                .value
                            )
                          }
                          placeholder="Resource title"
                        />

                      </div>

                      <div className="form-group">

                        <label>
                          URL
                        </label>

                        <input
                          type="text"
                          value={
                            resource?.url ||
                            ""
                          }
                          onChange={(e) =>
                            updateResource(
                              index,
                              "url",
                              e.target
                                .value
                            )
                          }
                          placeholder="https://..."
                        />

                      </div>

                      <div className="form-group form-group-full">

                        <label>
                          Description
                        </label>

                        <textarea
                          value={
                            resource?.description ||
                            ""
                          }
                          onChange={(e) =>
                            updateResource(
                              index,
                              "description",
                              e.target
                                .value
                            )
                          }
                          placeholder="Resource description"
                        />

                      </div>

                      <div className="form-group">

                        <label>
                          Image URL
                        </label>

                        <input
                          type="text"
                          value={
                            resource?.image ||
                            ""
                          }
                          onChange={(e) =>
                            updateResource(
                              index,
                              "image",
                              e.target
                                .value
                            )
                          }
                          placeholder="https://..."
                        />

                      </div>

                      <div
                        style={{
                          display:
                            "flex",
                          alignItems:
                            "flex-end",
                          gap: "10px",
                        }}
                      >

                        <button
                          className="admin-btn danger"
                          onClick={() =>
                            deleteResource(
                              index
                            )
                          }
                        >
                          🗑️ Delete
                        </button>

                      </div>

                    </div>
                  )
                )}

              </div>
            )}

            {siteResources.length >
              0 && (
              <div className="save-resource-area">

                <button
                  className="save-test-btn"
                  onClick={
                    saveResources
                  }
                  disabled={
                    saving
                  }
                >
                  {saving
                    ? "⏳ Saving..."
                    : "💾 Save Resources"}
                </button>

              </div>
            )}

          </div>
        )}

      </main>
    </div>
  );
}
