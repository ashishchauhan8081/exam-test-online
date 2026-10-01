import React, { useEffect, useState } from "react";
import "./AdminLiveTest.css";

import {
  ref,
  push,
  set,
  update,
  remove,
  onValue,
} from "firebase/database";

import { db } from "../firebase";

const AdminLiveTest = () => {
  const [tests, setTests] = useState([]);

  const [form, setForm] = useState({
    testName: "",
    examName: "",
    testId: "",
    totalQuestions: 100,
    duration: 60,
    startTime: "",
    endTime: "",
    examIcon: "📝",
  });

  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const testsRef = ref(db, "liveTests");

    const unsubscribe = onValue(testsRef, (snapshot) => {
      const data = snapshot.val();

      if (!data) {
        setTests([]);
        return;
      }

      const list = Object.entries(data).map(([id, value]) => ({
        id,
        ...value,
      }));

      list.sort((a, b) => {
        return (
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
        );
      });

      setTests(list);
    });

    return () => unsubscribe();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setForm({
      testName: "",
      examName: "",
      testId: "",
      totalQuestions: 100,
      duration: 60,
      startTime: "",
      endTime: "",
      examIcon: "📝",
    });

    setEditingId(null);
  };

  const saveTest = async (e) => {
    e.preventDefault();

    if (!form.testName.trim()) {
      alert("Test Name डालें।");
      return;
    }

    if (!form.examName.trim()) {
      alert("Exam Name डालें।");
      return;
    }

    if (!form.startTime) {
      alert("Start Time चुनें।");
      return;
    }

    if (!form.endTime) {
      alert("End Time चुनें।");
      return;
    }

    if (
      new Date(form.endTime).getTime() <=
      new Date(form.startTime).getTime()
    ) {
      alert("End Time, Start Time के बाद होना चाहिए।");
      return;
    }

    try {
      setSaving(true);

      if (editingId) {
        const testRef = ref(db, `liveTests/${editingId}`);

        await update(testRef, {
          testName: form.testName.trim(),
          examName: form.examName.trim(),
          testId: form.testId.trim(),
          totalQuestions: Number(form.totalQuestions),
          duration: Number(form.duration),
          startTime: form.startTime,
          endTime: form.endTime,
          examIcon: form.examIcon,
          updatedAt: new Date().toISOString(),
        });

        alert("Live Test update हो गया।");
      } else {
        const testsRef = ref(db, "liveTests");

        const newTestRef = push(testsRef);

        await set(newTestRef, {
          testName: form.testName.trim(),
          examName: form.examName.trim(),
          testId: form.testId.trim(),

          totalQuestions: Number(form.totalQuestions),
          duration: Number(form.duration),

          startTime: form.startTime,
          endTime: form.endTime,

          examIcon: form.examIcon,

          live: false,
          published: false,

          participants: 0,

          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        alert("Live Test create हो गया।");
      }

      resetForm();
    } catch (error) {
      console.error(error);
      alert("Live Test save नहीं हो पाया: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const editTest = (test) => {
    setEditingId(test.id);

    setForm({
      testName: test.testName || "",
      examName: test.examName || "",
      testId: test.testId || "",
      totalQuestions: test.totalQuestions || 100,
      duration: test.duration || 60,
      startTime: test.startTime || "",
      endTime: test.endTime || "",
      examIcon: test.examIcon || "📝",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const publishTest = async (test) => {
    try {
      await update(ref(db, `liveTests/${test.id}`), {
        published: true,
      });

      alert("Test User side पर publish हो गया।");
    } catch (error) {
      alert(error.message);
    }
  };

  const unpublishTest = async (test) => {
    try {
      await update(ref(db, `liveTests/${test.id}`), {
        published: false,
        live: false,
      });

      alert("Test unpublish कर दिया गया।");
    } catch (error) {
      alert(error.message);
    }
  };

  const startLive = async (test) => {
    if (!test.published) {
      alert("पहले Test को Publish करें।");
      return;
    }

    try {
      await update(ref(db, `liveTests/${test.id}`), {
        live: true,
        startedAt: new Date().toISOString(),
      });

      alert("🔴 Live Test START हो गया।");
    } catch (error) {
      alert(error.message);
    }
  };

  const stopLive = async (test) => {
    try {
      await update(ref(db, `liveTests/${test.id}`), {
        live: false,
        stoppedAt: new Date().toISOString(),
      });

      alert("Live Test STOP हो गया।");
    } catch (error) {
      alert(error.message);
    }
  };

  const deleteTest = async (test) => {
    const ok = window.confirm(
      `"${test.testName}" को delete करना चाहते हैं?`
    );

    if (!ok) return;

    try {
      await remove(ref(db, `liveTests/${test.id}`));

      alert("Test delete हो गया।");
    } catch (error) {
      alert(error.message);
    }
  };

  const getStatus = (test) => {
    const now = Date.now();

    const start = test.startTime
      ? new Date(test.startTime).getTime()
      : 0;

    const end = test.endTime
      ? new Date(test.endTime).getTime()
      : 0;

    if (test.live && (!end || now <= end)) {
      return "LIVE";
    }

    if (start && now < start) {
      return "UPCOMING";
    }

    if (end && now > end) {
      return "ENDED";
    }

    return "OFF";
  };

  const formatDate = (date) => {
    if (!date) return "-";

    try {
      return new Date(date).toLocaleString("hi-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return date;
    }
  };

  return (
    <div className="admin-live-container">

      <div className="admin-live-header">
        <div>
          <h2>🔴 Live Test Management</h2>
          <p>Live Test बनाएँ और Start / Stop करें</p>
        </div>
      </div>

      <form
        className="admin-live-form"
        onSubmit={saveTest}
      >

        <div className="form-title">
          {editingId
            ? "✏️ Live Test Edit करें"
            : "➕ नया Live Test"}
        </div>

        <div className="admin-form-grid">

          <div className="admin-field">
            <label>Test Name *</label>

            <input
              type="text"
              name="testName"
              value={form.testName}
              onChange={handleChange}
              placeholder="जैसे UPPCS Full Mock Test"
            />
          </div>

          <div className="admin-field">
            <label>Exam Name *</label>

            <input
              type="text"
              name="examName"
              value={form.examName}
              onChange={handleChange}
              placeholder="जैसे UPPCS 2026"
            />
          </div>

          <div className="admin-field">
            <label>Existing Test ID</label>

            <input
              type="text"
              name="testId"
              value={form.testId}
              onChange={handleChange}
              placeholder="Test ID"
            />
          </div>

          <div className="admin-field">
            <label>Icon</label>

            <input
              type="text"
              name="examIcon"
              value={form.examIcon}
              onChange={handleChange}
              placeholder="📝"
            />
          </div>

          <div className="admin-field">
            <label>Total Questions</label>

            <input
              type="number"
              name="totalQuestions"
              value={form.totalQuestions}
              onChange={handleChange}
              min="1"
            />
          </div>

          <div className="admin-field">
            <label>Duration (Minutes)</label>

            <input
              type="number"
              name="duration"
              value={form.duration}
              onChange={handleChange}
              min="1"
            />
          </div>

          <div className="admin-field">
            <label>Start Time *</label>

            <input
              type="datetime-local"
              name="startTime"
              value={form.startTime}
              onChange={handleChange}
            />
          </div>

          <div className="admin-field">
            <label>End Time *</label>

            <input
              type="datetime-local"
              name="endTime"
              value={form.endTime}
              onChange={handleChange}
            />
          </div>

        </div>

        <div className="admin-form-buttons">

          <button
            type="submit"
            className="save-live-btn"
            disabled={saving}
          >
            {saving
              ? "Saving..."
              : editingId
              ? "💾 Update Test"
              : "➕ Create Live Test"}
          </button>

          {editingId && (
            <button
              type="button"
              className="cancel-live-btn"
              onClick={resetForm}
            >
              Cancel
            </button>
          )}

        </div>

      </form>

      <div className="admin-live-list">

        <div className="admin-list-title">
          📋 Live Tests
        </div>

        {tests.length === 0 ? (
          <div className="admin-empty">
            अभी कोई Live Test नहीं बनाया गया है।
          </div>
        ) : (
          tests.map((test) => {

            const status = getStatus(test);

            return (
              <div
                className="admin-test-card"
                key={test.id}
              >

                <div className="admin-test-main">

                  <div className="admin-test-icon">
                    {test.examIcon || "📝"}
                  </div>

                  <div className="admin-test-details">

                    <h3>
                      {test.testName}
                    </h3>

                    <p>
                      📚 {test.examName}
                    </p>

                    <p>
                      📝 {test.totalQuestions || 0} Questions
                      &nbsp; | &nbsp;
                      ⏱️ {test.duration || 0} Min
                    </p>

                    <p>
                      🟢 Start: {formatDate(test.startTime)}
                    </p>

                    <p>
                      🔴 End: {formatDate(test.endTime)}
                    </p>

                  </div>

                  <div
                    className={`admin-test-status ${status.toLowerCase()}`}
                  >
                    {status === "LIVE"
                      ? "🔴 LIVE"
                      : status === "UPCOMING"
                      ? "⏰ UPCOMING"
                      : status === "ENDED"
                      ? "⚫ ENDED"
                      : "⚪ OFF"}
                  </div>

                </div>

                <div className="admin-test-actions">

                  {!test.published ? (
                    <button
                      className="publish-btn"
                      onClick={() =>
                        publishTest(test)
                      }
                    >
                      🌐 Publish
                    </button>
                  ) : (
                    <button
                      className="unpublish-btn"
                      onClick={() =>
                        unpublishTest(test)
                      }
                    >
                      🚫 Unpublish
                    </button>
                  )}

                  {!test.live ? (
                    <button
                      className="start-btn"
                      onClick={() =>
                        startLive(test)
                      }
                    >
                      🔴 Start Live
                    </button>
                  ) : (
                    <button
                      className="stop-btn"
                      onClick={() =>
                        stopLive(test)
                      }
                    >
                      ⏹ Stop Live
                    </button>
                  )}

                  <button
                    className="edit-btn"
                    onClick={() =>
                      editTest(test)
                    }
                  >
                    ✏️ Edit
                  </button>

                  <button
                    className="delete-btn"
                    onClick={() =>
                      deleteTest(test)
                    }
                  >
                    🗑 Delete
                  </button>

                </div>

              </div>
            );
          })
        )}

      </div>

    </div>
  );
};

export default AdminLiveTest;
