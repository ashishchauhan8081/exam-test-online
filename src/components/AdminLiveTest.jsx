import React, { useEffect, useState } from "react";
import "./AdminLiveTest.css";
import { ref, push, set, update, remove, onValue, get } from "firebase/database";
import { db } from "../firebase";

const EMPTY_FORM = {
  testName: "",
  examName: "",
  testId: "",
  questionSource: "existing",
  questionsJson: "",
  geminiTopic: "",
  geminiDifficulty: "Medium",
  ncertClass: "",
  ncertSubject: "",
  ncertLessonNo: "",
  totalQuestions: 25,
  duration: 30,
  startTime: "",
  endTime: "",
  examIcon: "📝",
};

const normalizeQuestions = (value) => {
  let list = value;
  if (Array.isArray(value?.questions)) list = value.questions;
  if (Array.isArray(value?.data)) list = value.data;
  if (!Array.isArray(list) && list && typeof list === "object") list = Object.values(list);
  if (!Array.isArray(list)) return [];

  return list.slice(0, 150).map((q, i) => {
    const options = Array.isArray(q?.options)
      ? q.options
      : [q?.options?.A ?? q?.optionA ?? q?.A, q?.options?.B ?? q?.optionB ?? q?.B, q?.options?.C ?? q?.optionC ?? q?.C, q?.options?.D ?? q?.optionD ?? q?.D];

    let answer = q?.answerIndex ?? q?.answer ?? q?.correctAnswer ?? q?.correct ?? 0;
    if (typeof answer === "string") {
      const s = answer.trim().toUpperCase();
      const letterIndex = ["A", "B", "C", "D"].indexOf(s);
      answer = letterIndex >= 0 ? letterIndex : Number(s);
      if ([1, 2, 3, 4].includes(answer)) answer -= 1;
    }
    answer = Number(answer);
    if (!Number.isInteger(answer) || answer < 0 || answer > 3) answer = 0;

    return {
      id: q?.id || `q-${i + 1}`,
      question: String(q?.question || q?.questionText || q?.text || "").trim(),
      options: [0, 1, 2, 3].map((n) => String(options?.[n] ?? "")),
      answer,
      explanation: Array.isArray(q?.explanation)
        ? q.explanation.join("\n")
        : String(q?.explanation || q?.solution || ""),
      explanationPoints: Array.isArray(q?.explanationPoints)
  ? q.explanationPoints
  : [],
    };
  });
};

const questionCount = (value) => normalizeQuestions(value).length;

export default function AdminLiveTest() {
  const [tests, setTests] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [checkingTest, setCheckingTest] = useState(false);
  const [uploadingJson, setUploadingJson] = useState(false);
  const [reviewQuestions, setReviewQuestions] = useState([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [questionZoneTests, setQuestionZoneTests] = useState([]);

  useEffect(() => {
    return onValue(ref(db, "tests"), (snapshot) => {
      const data = snapshot.val() || {};
      const list = Object.entries(data).map(([id, value]) => ({
        id,
        ...(value || {}),
        questions: normalizeQuestions(value?.questions),
      }));
      setQuestionZoneTests(list);
    });
  }, []);

  useEffect(() => {
    return onValue(ref(db, "liveTests"), (snapshot) => {
      const data = snapshot.val() || {};
      const list = Object.entries(data).map(([id, value]) => ({ id, ...(value || {}) }));
      list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setTests(list);
    });
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleJsonFileUpload = async (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".json") && file.type !== "application/json") {
      return alert("❌ केवल JSON file upload करें।");
    }

    try {
      setUploadingJson(true);
      const text = await file.text();
      const parsed = JSON.parse(text);
      const questions = normalizeQuestions(parsed);

      if (!questions.length) {
        return alert("❌ JSON में valid Questions नहीं मिले।");
      }

      // Review/Edit के लिए normalized JSON वापस textarea में रखें।
      setForm((p) => ({
        ...p,
        questionsJson: JSON.stringify(questions, null, 2),
        totalQuestions: questions.length,
      }));
      setReviewQuestions(questions);
      setReviewOpen(true);

      alert(`✅ ${questions.length} Questions JSON से पढ़े गए। Review / Edit खुल गया है।`);
    } catch (error) {
      alert(`❌ JSON file पढ़ी नहीं जा सकी।\n${error.message}`);
    } finally {
      setUploadingJson(false);
    }
  };

  const updateReviewQuestion = (index, field, value) => {
    setReviewQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== index) return q;
        if (field.startsWith("option")) {
          const optionIndex = Number(field.replace("option", ""));
          const options = [...(q.options || ["", "", "", ""])];
          options[optionIndex] = value;
          return { ...q, options };
        }
        return { ...q, [field]: value };
      })
    );
  };

  const saveReviewToForm = () => {
    const normalized = normalizeQuestions(reviewQuestions);
    if (!normalized.length) return alert("❌ कोई valid Question नहीं है।");
    setForm((p) => ({
      ...p,
      questionsJson: JSON.stringify(normalized, null, 2),
      totalQuestions: normalized.length,
    }));
    setReviewQuestions(normalized);
    setReviewOpen(false);
    alert(`✅ ${normalized.length} Questions Review करके Form में रखे गए।`);
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const checkExistingTest = async () => {
    const id = String(form.testId || "").trim();
    if (!id) return alert("पहले Existing Test ID डालें।");

    try {
      setCheckingTest(true);
      const snap = await get(ref(db, `tests/${id}`));
      if (!snap.exists()) return alert("❌ यह Test ID Firebase में नहीं मिला।");
      const data = snap.val() || {};
      alert(`✅ Test मिल गया!\n\nTest: ${data.title || data.name || "Test"}\nQuestions: ${questionCount(data.questions)}`);
    } catch (error) {
      alert(`❌ Test check नहीं हो सका:\n${error.message}`);
    } finally {
      setCheckingTest(false);
    }
  };

  const generateQuestions = async () => {
    const count = Math.min(150, Math.max(1, Number(form.totalQuestions) || 25));
    let topic = form.geminiTopic.trim() || form.examName.trim() || "General Competitive Exam";

    if (form.questionSource === "ncert") {
      topic = [
        `NCERT Class ${form.ncertClass || ""}`,
        form.ncertSubject || "",
        form.ncertLessonNo ? `Lesson/Chapter ${form.ncertLessonNo}` : "",
      ].filter(Boolean).join(" - ");
    }

    const response = await fetch("/api/mcq", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic,
        exam: form.examName || "Competitive Exam",
        count,
        language: "Hindi",
        difficulty: form.geminiDifficulty || "Medium",
        explanationPoints: 5,
        currentAffairs: false,
        source: form.questionSource,
        ncert: form.questionSource === "ncert"
          ? {
              class: form.ncertClass,
              subject: form.ncertSubject,
              lessonNo: form.ncertLessonNo,
            }
          : null,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success || !Array.isArray(data.questions)) {
      throw new Error(data?.error || "Gemini से Questions प्राप्त नहीं हुए।");
    }

    const questions = normalizeQuestions(data.questions).slice(0, count);
    if (!questions.length) throw new Error("कोई valid question नहीं मिला।");
    return questions;
  };

  const saveTest = async (e) => {
    e.preventDefault();

    if (!form.testName.trim()) return alert("Test Name डालें।");
    if (!form.examName.trim()) return alert("Exam Name डालें।");
    if (!form.startTime || !form.endTime) return alert("Start और End Time दोनों चुनें।");
    if (new Date(form.endTime).getTime() <= new Date(form.startTime).getTime()) {
      return alert("End Time, Start Time के बाद होना चाहिए।");
    }

    const total = Math.min(150, Math.max(1, Number(form.totalQuestions) || 25));

    try {
      setSaving(true);
      let questions = [];
      let linkedQuestionCount = 0;

      if (form.questionSource === "existing") {
        const testId = form.testId.trim();
        if (!testId) return alert("Existing Test ID डालें।");
        const snap = await get(ref(db, `tests/${testId}`));
        if (!snap.exists()) return alert("❌ Existing Test ID Firebase में नहीं मिला।");
        const source = snap.val() || {};
        questions = normalizeQuestions(source.questions).slice(0, total);
        linkedQuestionCount = questionCount(source.questions);
        if (!questions.length) return alert("❌ Existing Test में कोई Question नहीं है।");
      }

      if (form.questionSource === "json") {
        if (!form.questionsJson.trim()) return alert("Questions JSON डालें।");
        let parsed;
        try {
          parsed = JSON.parse(form.questionsJson);
        } catch {
          return alert("❌ Questions JSON गलत है।");
        }
        questions = normalizeQuestions(parsed).slice(0, total);
        if (!questions.length) return alert("❌ JSON में valid Questions नहीं मिले।");
        linkedQuestionCount = questions.length;
      }

      if (form.questionSource === "gemini" || form.questionSource === "ncert") {
        setGenerating(true);
        questions = await generateQuestions();
        linkedQuestionCount = questions.length;
      }

      const payload = {
        testName: form.testName.trim(),
        examName: form.examName.trim(),
        testId: form.testId.trim(),
        questionSource: form.questionSource,
        questions,
        totalQuestions: Math.min(total, questions.length || total),
        duration: Number(form.duration) || 30,
        startTime: form.startTime,
        endTime: form.endTime,
        examIcon: form.examIcon || "📝",
        live: false,
        published: false,
        linkedQuestionCount,
        geminiTopic: form.geminiTopic.trim(),
        geminiDifficulty: form.geminiDifficulty,
        ncertClass: form.ncertClass,
        ncertSubject: form.ncertSubject,
        ncertLessonNo: form.ncertLessonNo,
        updatedAt: new Date().toISOString(),
      };

      if (editingId) {
        await update(ref(db, `liveTests/${editingId}`), payload);
        alert("✅ Live Test update हो गया।");
      } else {
        const newRef = push(ref(db, "liveTests"));
        await set(newRef, { ...payload, participants: 0, createdAt: new Date().toISOString() });
        alert("✅ Live Test create हो गया।");
      }

      resetForm();
    } catch (error) {
      console.error(error);
      alert(`❌ Live Test save नहीं हुआ:\n${error.message}`);
    } finally {
      setSaving(false);
      setGenerating(false);
    }
  };

  const editTest = (test) => {
    setEditingId(test.id);
    setForm({
      ...EMPTY_FORM,
      ...test,
      questionsJson: JSON.stringify(test.questions || [], null, 2),
      totalQuestions: test.totalQuestions || 25,
      duration: test.duration || 30,
      questionSource: test.questionSource || (test.testId ? "existing" : "gemini"),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const publishTest = async (test) => {
    try {
      await update(ref(db, `liveTests/${test.id}`), { published: !test.published, updatedAt: new Date().toISOString() });
    } catch (error) { alert(error.message); }
  };

  const startLive = async (test) => {
    const now = Date.now();
    const start = test.startTime ? new Date(test.startTime).getTime() : 0;
    const end = test.endTime ? new Date(test.endTime).getTime() : 0;
    if (start && now < start) return alert("⏰ Start Time अभी नहीं आया है।");
    if (end && now > end) return alert("❌ End Time निकल चुका है।");
    try {
      await update(ref(db, `liveTests/${test.id}`), { live: true, published: true, startedAt: new Date().toISOString() });
      alert("🔴 Live Test START हो गया।");
    } catch (error) { alert(error.message); }
  };

  const stopLive = async (test) => {
    try {
      await update(ref(db, `liveTests/${test.id}`), { live: false, stoppedAt: new Date().toISOString() });
      alert("⏹️ Live Test STOP हो गया।");
    } catch (error) { alert(error.message); }
  };

  const deleteTest = async (test) => {
    if (!window.confirm(`"${test.testName}" को delete करना चाहते हैं?`)) return;
    try { await remove(ref(db, `liveTests/${test.id}`)); }
    catch (error) { alert(error.message); }
  };

  const getStatus = (test) => {
    const now = Date.now();
    const start = test.startTime ? new Date(test.startTime).getTime() : 0;
    const end = test.endTime ? new Date(test.endTime).getTime() : 0;
    if (test.live && (!end || now <= end)) return "LIVE";
    if (start && now < start) return "UPCOMING";
    if (end && now > end) return "ENDED";
    return "OFF";
  };

  const formatDate = (value) => {
    if (!value) return "-";
    try { return new Date(value).toLocaleString("hi-IN", { dateStyle: "medium", timeStyle: "short" }); }
    catch { return String(value); }
  };

  return (
    <div className="admin-live-container">
      <div className="admin-live-header">
        <div>
          <h2>🔴 Live Test Management</h2>
          <p>Questions Zone, JSON, Gemini और NCERT से Live Test तैयार करें।</p>
        </div>
      </div>

      <form className="admin-live-form" onSubmit={saveTest}>
        <div className="form-title">{editingId ? "✏️ Live Test Edit करें" : "➕ नया Live Test"}</div>

        <div className="admin-form-grid">
          <div className="admin-field">
            <label>Test Name *</label>
            <input name="testName" value={form.testName} onChange={handleChange} placeholder="जैसे UPPCS Live Test 01" />
          </div>

          <div className="admin-field">
            <label>Exam Name *</label>
            <input name="examName" value={form.examName} onChange={handleChange} placeholder="जैसे UPPCS 2026" />
          </div>

          <div className="admin-field" style={{ gridColumn: "1 / -1" }}>
            <label>📝 Question Source *</label>
            <select name="questionSource" value={form.questionSource} onChange={handleChange}>
              <option value="existing">📚 Questions Zone / Existing Test</option>
              <option value="json">🧩 Questions JSON</option>
              <option value="gemini">🤖 Gemini AI</option>
              <option value="ncert">📖 NCERT + Gemini</option>
            </select>
          </div>

          {form.questionSource === "existing" && (
            <div className="admin-field" style={{ gridColumn: "1 / -1" }}>
              <label>📚 Questions Zone से Test चुनें *</label>
              <select name="testId" value={form.testId} onChange={handleChange}>
                <option value="">-- Questions Zone का Test चुनें --</option>
                {questionZoneTests.map((test) => (
                  <option key={test.id} value={test.id}>
                    {test.testName || test.title || test.name || test.examName || "Untitled Test"} — {questionCount(test.questions)} Questions
                  </option>
                ))}
              </select>
              {form.testId && <small>✅ Selected Test ID: {form.testId}</small>}
              {!questionZoneTests.length && <small>⚠️ Questions Zone में अभी कोई Test उपलब्ध नहीं है।</small>}
            </div>
          )}

          {form.questionSource === "json" && (
            <div className="admin-field" style={{ gridColumn: "1 / -1" }}>
              <label>Questions JSON *</label>

              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
                <label
                  htmlFor="questions-json-file"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 14px",
                    borderRadius: 10,
                    background: "#0f766e",
                    color: "#fff",
                    cursor: uploadingJson ? "not-allowed" : "pointer",
                    fontWeight: 700,
                    opacity: uploadingJson ? 0.7 : 1,
                  }}
                >
                  📁 {uploadingJson ? "JSON पढ़ी जा रही है..." : "JSON File Upload करें"}
                </label>
                <input
                  id="questions-json-file"
                  type="file"
                  accept=".json,application/json"
                  disabled={uploadingJson}
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    handleJsonFileUpload(file);
                    e.target.value = "";
                  }}
                />
                <small>JSON file चुनते ही Review / Edit खुलेगा और Questions textarea में भी भरेंगे।</small>
              </div>

              {reviewQuestions.length > 0 && (
                <button
                  type="button"
                  onClick={() => setReviewOpen(true)}
                  style={{ marginBottom: 10 }}
                >
                  👀 Review / Edit {reviewQuestions.length} Questions
                </button>
              )}

              <textarea
                name="questionsJson"
                value={form.questionsJson}
                onChange={handleChange}
                rows={10}
                placeholder='[{"question":"...","options":["A","B","C","D"],"answer":0,"explanation":"..."}]'
              />
            </div>
          )}

          {(form.questionSource === "gemini" || form.questionSource === "ncert") && (
            <>
              <div className="admin-field">
                <label>Gemini Topic</label>
                <input name="geminiTopic" value={form.geminiTopic} onChange={handleChange} placeholder="जैसे भारतीय संविधान" />
              </div>
              <div className="admin-field">
                <label>Difficulty</label>
                <select name="geminiDifficulty" value={form.geminiDifficulty} onChange={handleChange}>
                  <option>Easy</option><option>Medium</option><option>Hard</option>
                </select>
              </div>
            </>
          )}

          {form.questionSource === "ncert" && (
            <>
              <div className="admin-field"><label>📖 NCERT Class</label><input name="ncertClass" value={form.ncertClass} onChange={handleChange} placeholder="Class 6 / 7 / 8..." /></div>
              <div className="admin-field"><label>📚 Subject</label><input name="ncertSubject" value={form.ncertSubject} onChange={handleChange} placeholder="History / Science..." /></div>
              <div className="admin-field"><label>Lesson / Chapter No.</label><input name="ncertLessonNo" value={form.ncertLessonNo} onChange={handleChange} placeholder="जैसे 03" /></div>
            </>
          )}

          <div className="admin-field"><label>Total Questions *</label><input type="number" min="1" max="150" name="totalQuestions" value={form.totalQuestions} onChange={handleChange} /></div>
          <div className="admin-field"><label>Duration (Minutes) *</label><input type="number" min="1" name="duration" value={form.duration} onChange={handleChange} /></div>
          <div className="admin-field"><label>Exam Icon</label><input name="examIcon" value={form.examIcon} onChange={handleChange} /></div>
          <div className="admin-field"><label>Start Time *</label><input type="datetime-local" name="startTime" value={form.startTime} onChange={handleChange} /></div>
          <div className="admin-field"><label>End Time *</label><input type="datetime-local" name="endTime" value={form.endTime} onChange={handleChange} /></div>
        </div>

        <div className="admin-form-buttons">
          <button type="submit" className="save-live-btn" disabled={saving || generating}>
            {generating ? "🤖 Gemini Questions बना रहा है..." : saving ? "Saving..." : editingId ? "💾 Update Test" : "➕ Create Live Test"}
          </button>
          {editingId && <button type="button" className="cancel-live-btn" onClick={resetForm}>Cancel</button>}
        </div>
      </form>

      <div className="admin-live-list">
        <div className="admin-list-title">📋 Live Tests</div>
        {tests.length === 0 ? <div className="admin-empty">अभी कोई Live Test नहीं है।</div> : tests.map((test) => {
          const status = getStatus(test);
          return (
            <div className="admin-test-card" key={test.id}>
              <div className="admin-test-main">
                <div className="admin-test-icon">{test.examIcon || "📝"}</div>
                <div className="admin-test-details">
                  <h3>{test.testName}</h3>
                  <p>📚 {test.examName}</p>
                  <p>📝 Source: {test.questionSource || "existing"} · {test.totalQuestions || 0} Questions · ⏱️ {test.duration || 0} Min</p>
                  <p>🆔 Test ID: {test.testId || "—"}</p>
                  <p>🟢 Start: {formatDate(test.startTime)}</p>
                  <p>🔴 End: {formatDate(test.endTime)}</p>
                  <p>👥 Participants: {test.participants || 0}</p>
                </div>
                <div className={`admin-test-status ${status.toLowerCase()}`}>{status === "LIVE" ? "🔴 LIVE" : status === "UPCOMING" ? "⏰ UPCOMING" : status === "ENDED" ? "⚫ ENDED" : "⚪ OFF"}</div>
              </div>

              <div className="admin-test-actions">
                <button type="button" onClick={() => editTest(test)}>✏️ Edit</button>
                <button type="button" onClick={() => publishTest(test)}>{test.published ? "🙈 Unpublish" : "📢 Publish"}</button>
                {!test.live ? <button type="button" onClick={() => startLive(test)}>🔴 Start</button> : <button type="button" onClick={() => stopLive(test)}>⏹️ Stop</button>}
                <button type="button" onClick={() => deleteTest(test)}>🗑️ Delete</button>
              </div>
            </div>
          );
        })}
      </div>

      {reviewOpen && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,.65)", padding: "20px", overflowY: "auto"
          }}
        >
          <div style={{ maxWidth: 1000, margin: "0 auto", background: "#fff", borderRadius: 16, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, position: "sticky", top: 0, background: "#fff", paddingBottom: 12, zIndex: 2 }}>
              <div>
                <h2 style={{ margin: 0 }}>📝 Questions Review / Edit</h2>
                <small>{reviewQuestions.length} Questions — JSON से पढ़े गए</small>
              </div>
              <button type="button" onClick={() => setReviewOpen(false)}>✕ Close</button>
            </div>

            {reviewQuestions.map((q, index) => (
              <div key={q.id || index} style={{ border: "1px solid #dbeafe", borderRadius: 12, padding: 14, marginTop: 14, background: "#f8fafc" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <strong>Question {index + 1}</strong>
                  <button type="button" onClick={() => setReviewQuestions((prev) => prev.filter((_, i) => i !== index))}>🗑️ Delete</button>
                </div>
                <textarea rows={3} value={q.question || ""} onChange={(e) => updateReviewQuestion(index, "question", e.target.value)} style={{ width: "100%", marginTop: 8 }} />
                {[0,1,2,3].map((opt) => (
                  <div key={opt} style={{ display: "grid", gridTemplateColumns: "28px 1fr auto", gap: 8, alignItems: "center", marginTop: 8 }}>
                    <strong>{String.fromCharCode(65 + opt)}</strong>
                    <input value={q.options?.[opt] || ""} onChange={(e) => updateReviewQuestion(index, `option${opt}`, e.target.value)} />
                    <label><input type="radio" name={`review-answer-${index}`} checked={Number(q.answer) === opt} onChange={() => updateReviewQuestion(index, "answer", opt)} /> सही</label>
                  </div>
                ))}
                <textarea rows={3} placeholder="व्याख्या" value={q.explanation || ""} onChange={(e) => updateReviewQuestion(index, "explanation", e.target.value)} style={{ width: "100%", marginTop: 8 }} />
              </div>
            ))}

            <div style={{ display: "flex", gap: 10, marginTop: 18, position: "sticky", bottom: 0, background: "#fff", paddingTop: 12 }}>
              <button type="button" onClick={saveReviewToForm}>💾 Review Save करके Form में रखें</button>
              <button type="button" onClick={() => setReviewOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
