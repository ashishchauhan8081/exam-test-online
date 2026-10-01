import React, { useEffect, useMemo, useState } from "react";

import { getApps, getApp, initializeApp } from "firebase/app";
import { getDatabase, ref, get } from "firebase/database";
import firebaseConfig from "../firebase-config.json";
import "../App.css";

const firebaseApp = getApps().length
  ? getApp()
  : initializeApp({
      ...firebaseConfig,
      databaseURL:
        firebaseConfig.databaseURL ||
        "https://study-with-power-f6914-default-rtdb.asia-southeast1.firebasedatabase.app",
    });

const db = getDatabase(firebaseApp);

function getQuestionsCount(test) {
  if (!test) return 0;
  if (Array.isArray(test.questions)) return test.questions.length;
  if (test.questions && typeof test.questions === "object") {
    return Object.keys(test.questions).length;
  }
  return Number(test.questionCount ?? test.questionsCount ?? 0);
}

function getDuration(test) {
  return test?.durationMinutes ?? test?.duration ?? test?.timeLimit ?? test?.time ?? 0;
}

function getPrice(test) {
  return test?.price ?? test?.amount ?? test?.testPrice ?? 0;
}

function isTestPublic(test) {
  if (!test) return false;
  const status = String(test.status ?? test.visibility ?? test.publishStatus ?? "").trim().toLowerCase();
  return ["public", "published", "active", "live"].includes(status) ||
    test.isPublic === true || test.public === true || test.published === true || test.active === true;
}

// uppet, "UP PET", "up pet" और "UP-PET" को एक ही key बनाता है।
function examKey(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function getAttemptKey(test) {
  return `test_attempted_${String(test?.id ?? test?.testId ?? `${test?.examId || test?.exam || "general"}_${test?.testNumber || test?.testNo || test?.number || 1}`)}`;
}

export default function TestSeries({ onBack, onStartTest, selectedExam }) {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadTests = async () => {
      try {
        setLoading(true);
        setError("");
        const snapshot = await get(ref(db, "tests"));
        if (!mounted) return;

        if (!snapshot.exists()) {
          setTests([]);
          return;
        }

        const data = snapshot.val();
        let loadedTests = [];

        if (data && typeof data === "object" && !Array.isArray(data)) {
          loadedTests = Object.entries(data).map(([id, test]) => ({ id, ...test, raw: { id, ...test } }));
        } else if (Array.isArray(data)) {
          loadedTests = data.map((test, index) => test ? ({
            id: test.id || String(index),
            ...test,
            raw: { id: test.id || String(index), ...test },
          }) : null).filter(Boolean);
        }

        const publicTests = loadedTests.filter(isTestPublic);
        publicTests.sort((a, b) => Number(a.testNumber ?? a.testNo ?? a.number ?? 999999) - Number(b.testNumber ?? b.testNo ?? b.number ?? 999999));
        setTests(publicTests);
      } catch (err) {
        console.error("TEST SERIES LOAD ERROR:", err);
        if (mounted) setError(err?.message || "Test Series load नहीं हो सकी।");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadTests();
    return () => { mounted = false; };
  }, []);

  const filteredTests = useMemo(() => {
    if (!selectedExam) return [];
    const wanted = examKey(selectedExam.id || selectedExam.name);
    return tests.filter((test) => {
      const values = [
        test.examId, test.exam, test.examName, test.examTitle, test.testExam,
      ];
      return values.some((value) => examKey(value) === wanted);
    });
  }, [tests, selectedExam]);

  const hasAttempted = (test) => {
    try { return localStorage.getItem(getAttemptKey(test)) === "true"; }
    catch { return false; }
  };

  const handleStart = (test) => {
    if (!test) return;
    onStartTest?.({
      id: test.id,
      title: test.title || test.name || "Test",
      exam: test.exam || test.examName || "",
      examId: test.examId || test.exam || "",
      testNo: test.testNumber ?? test.testNo ?? test.number ?? 1,
      testNumber: test.testNumber ?? test.testNo ?? test.number ?? 1,
      duration: getDuration(test),
      questions: test.questions || [],
      marksPerQuestion: test.marksPerQuestion ?? test.marks ?? 1,
      negativeMarking: test.negativeMarking ?? false,
      negativeMarks: test.negativeMarks ?? 0,
      raw: test.raw || test,
    });
  };

  if (loading) {
    return <div className="page-container" style={{ padding: "30px 20px" }}><button type="button" className="back-btn" onClick={onBack}>← Home</button><h1>🎯 Test Series</h1><p>⏳ Test Series load हो रही है...</p></div>;
  }

  if (error) {
    return <div className="page-container" style={{ padding: "30px 20px" }}><button type="button" className="back-btn" onClick={onBack}>← Home</button><h1>🎯 Test Series</h1><div style={{ padding: 20, marginTop: 20, background: "#fee2e2", borderRadius: 12, color: "#991b1b" }}><strong>❌ Error</strong><p>{error}</p></div></div>;
  }

  if (!selectedExam) {
    return (
      <div className="page-container" style={{ padding: "25px 18px 40px" }}>
        <button type="button" className="back-btn" onClick={onBack}>← Home</button>
        <h1>🎯 Test Series</h1>
        <div style={{ marginTop: 25, padding: 25, background: "#fff", borderRadius: 16, textAlign: "center", border: "1px solid #e5e7eb" }}>
          <h2>पहले अपनी परीक्षा चुनें</h2>
          <p style={{ color: "#64748b" }}>सभी Exams के Tests एक साथ नहीं दिखाए जाएंगे। Home Page से परीक्षा चुनें।</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ padding: "25px 18px 40px" }}>
      <button type="button" className="back-btn" onClick={onBack} style={{ marginBottom: 20 }}>← Home</button>

      <div style={{ marginBottom: 25 }}>
        <h1 style={{ marginBottom: 8 }}>🎯 {selectedExam.name} Test Series</h1>
        <p style={{ color: "#64748b", margin: 0 }}>सिर्फ <strong>{selectedExam.name}</strong> के Tests दिखाई जा रहे हैं।</p>
      </div>

      <div style={{ marginBottom: 20, padding: "12px 16px", background: "#eff6ff", borderRadius: 10, color: "#1d4ed8", fontWeight: 700 }}>📚 {selectedExam.name} के कुल Public Tests: {filteredTests.length}</div>

      {filteredTests.length === 0 ? (
        <div style={{ padding: "30px 20px", textAlign: "center", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16 }}>
          <div style={{ fontSize: 50 }}>📚</div>
          <h2>अभी {selectedExam.name} का कोई Public Test उपलब्ध नहीं है</h2>
          <p style={{ color: "#64748b" }}>Admin Panel में इसी Exam के Test को Public/Published करें।</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 18 }}>
          {filteredTests.map((test, index) => {
            const attempted = hasAttempted(test);
            const title = test.title || test.name || `Test ${index + 1}`;
            const testNumber = test.testNumber ?? test.testNo ?? test.number ?? index + 1;
            return (
              <div key={test.id || index} style={{ background: "#fff", border: "1px solid #dbe4ee", borderRadius: 18, padding: 20, boxShadow: "0 4px 16px rgba(15,23,42,0.06)" }}>
                <h2 style={{ margin: "0 0 12px", color: "#0f2747", fontSize: 22 }}>📚 {title}</h2>
                <p style={{ margin: "8px 0", color: "#64748b", fontSize: 16 }}><strong>Exam:</strong> {test.exam || test.examName || selectedExam.name}</p>
                <p style={{ margin: "8px 0", color: "#64748b", fontSize: 16 }}><strong>Test No:</strong> {testNumber} • <strong>Questions:</strong> {getQuestionsCount(test)} • <strong>Duration:</strong> {getDuration(test)} min</p>
                <p style={{ margin: "8px 0 12px", color: "#64748b", fontSize: 16 }}><strong>Price:</strong> ₹{getPrice(test)}</p>
                <div style={{ display: "inline-block", padding: "6px 14px", background: attempted ? "#dbeafe" : "#dcfce7", color: attempted ? "#1d4ed8" : "#15803d", borderRadius: 999, fontWeight: 800, fontSize: 14, marginBottom: 15 }}>{attempted ? "✓ ATTEMPTED" : "PUBLIC"}</div>
                <button type="button" onClick={() => handleStart(test)} style={{ width: "100%", padding: "13px 18px", border: "none", borderRadius: 10, background: attempted ? "#2563eb" : "#087bea", color: "#fff", fontSize: 17, fontWeight: 800, cursor: "pointer" }}>{attempted ? "🔄 Re-attempt करें" : "▶️ Test Start करें"}</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
