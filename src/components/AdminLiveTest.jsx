import React, { useEffect, useState } from "react";
import "./AdminLiveTest.css";

import {
  ref,
  push,
  set,
  update,
  remove,
  onValue,
  get,
} from "firebase/database";

import { db } from "../firebase";

const AdminLiveTest = () => {
  const [tests, setTests] = useState([]);

  const [form, setForm] = useState({
    testName: "",
    examName: "",
    testId: "",
    totalQuestions: 25,
    duration: 30,
    startTime: "",
    endTime: "",
    examIcon: "📝",
  });

  const [editingId, setEditingId] =
    useState(null);

  const [saving, setSaving] =
    useState(false);

  const [checkingTest, setCheckingTest] =
    useState(false);

  // =====================================================
  // LOAD LIVE TESTS
  // =====================================================

  useEffect(() => {
    const testsRef =
      ref(db, "liveTests");

    const unsubscribe =
      onValue(
        testsRef,
        (snapshot) => {

          const data =
            snapshot.val();

          if (!data) {
            setTests([]);
            return;
          }

          const list =
            Object.entries(data).map(
              ([id, value]) => ({
                id,
                ...(value || {}),
              })
            );

          list.sort(
            (a, b) =>
              new Date(
                b.createdAt || 0
              ).getTime() -
              new Date(
                a.createdAt || 0
              ).getTime()
          );

          setTests(list);
        }
      );

    return () =>
      unsubscribe();
  }, []);

  // =====================================================
  // FORM CHANGE
  // =====================================================

  const handleChange = (e) => {

    const {
      name,
      value,
    } = e.target;

    setForm(
      (previous) => ({
        ...previous,
        [name]: value,
      })
    );
  };

  // =====================================================
  // RESET
  // =====================================================

  const resetForm = () => {

    setForm({
      testName: "",
      examName: "",
      testId: "",
      totalQuestions: 25,
      duration: 30,
      startTime: "",
      endTime: "",
      examIcon: "📝",
    });

    setEditingId(null);
  };

  // =====================================================
  // CHECK EXISTING TEST
  // =====================================================

  const checkExistingTest = async () => {

    const testId =
      String(
        form.testId || ""
      ).trim();

    if (!testId) {
      alert(
        "पहले Existing Test ID डालें।"
      );
      return;
    }

    try {

      setCheckingTest(true);

      const testRef =
        ref(
          db,
          `tests/${testId}`
        );

      const snapshot =
        await get(testRef);

      if (!snapshot.exists()) {

        alert(
          "❌ यह Test ID Firebase में नहीं मिला।"
        );

        return;
      }

      const data =
        snapshot.val();

      let questions =
        data?.questions;

      if (
        Array.isArray(
          questions
        )
      ) {
        questions =
          questions;
      } else if (
        questions &&
        typeof questions ===
          "object"
      ) {
        questions =
          Object.values(
            questions
          );
      } else {
        questions = [];
      }

      alert(
        `✅ Test मिल गया!\n\n` +
        `Test: ${
          data.title ||
          data.name ||
          "Test"
        }\n` +
        `Questions: ${
          questions.length
        }`
      );

    } catch (error) {

      console.error(
        "CHECK TEST ERROR:",
        error
      );

      alert(
        "❌ Test check नहीं हो सका:\n" +
          error.message
      );

    } finally {

      setCheckingTest(false);
    }
  };

  // =====================================================
  // SAVE TEST
  // =====================================================

  const saveTest = async (e) => {

    e.preventDefault();

    if (
      !form.testName.trim()
    ) {
      alert(
        "Test Name डालें।"
      );
      return;
    }

    if (
      !form.examName.trim()
    ) {
      alert(
        "Exam Name डालें।"
      );
      return;
    }

    // ===================================================
    // Existing Test ID REQUIRED
    // ===================================================

    if (
      !form.testId.trim()
    ) {
      alert(
        "Existing Test ID डालें।\n\nLive Test के Questions इसी Test से आएंगे।"
      );
      return;
    }

    if (!form.startTime) {
      alert(
        "Start Time चुनें।"
      );
      return;
    }

    if (!form.endTime) {
      alert(
        "End Time चुनें।"
      );
      return;
    }

    if (
      new Date(
        form.endTime
      ).getTime() <=
      new Date(
        form.startTime
      ).getTime()
    ) {
      alert(
        "End Time, Start Time के बाद होना चाहिए।"
      );
      return;
    }

    try {

      setSaving(true);

      // =================================================
      // Existing Test verify
      // =================================================

      const existingTestRef =
        ref(
          db,
          `tests/${form.testId.trim()}`
        );

      const existingSnapshot =
        await get(
          existingTestRef
        );

      if (
        !existingSnapshot.exists()
      ) {
        alert(
          "❌ Existing Test ID Firebase में नहीं मिला।"
        );

        return;
      }

      const existingTest =
        existingSnapshot.val();

      let questionCount = 0;

      if (
        Array.isArray(
          existingTest?.questions
        )
      ) {

        questionCount =
          existingTest.questions.length;

      } else if (
        existingTest?.questions &&
        typeof existingTest.questions ===
          "object"
      ) {

        questionCount =
          Object.keys(
            existingTest.questions
          ).length;

      } else {

        questionCount =
          Number(
            existingTest?.questionCount ||
            existingTest?.questionsCount ||
            0
          );
      }

      if (
        questionCount === 0
      ) {

        alert(
          "❌ इस Existing Test में कोई Question नहीं है।\n\nपहले Test में Questions जोड़ें।"
        );

        return;
      }

      // =================================================
      // UPDATE
      // =================================================

      if (editingId) {

        const testRef =
          ref(
            db,
            `liveTests/${editingId}`
          );

        await update(
          testRef,
          {

            testName:
              form.testName.trim(),

            examName:
              form.examName.trim(),

            testId:
              form.testId.trim(),

            totalQuestions:
              Number(
                form.totalQuestions
              ) ||
              questionCount,

            duration:
              Number(
                form.duration
              ) || 30,

            startTime:
              form.startTime,

            endTime:
              form.endTime,

            examIcon:
              form.examIcon,

            updatedAt:
              new Date().toISOString(),

          }
        );

        alert(
          "✅ Live Test update हो गया।"
        );

      }

      // =================================================
      // CREATE
      // =================================================

      else {

        const testsRef =
          ref(
            db,
            "liveTests"
          );

        const newTestRef =
          push(testsRef);

        await set(
          newTestRef,
          {

            testName:
              form.testName.trim(),

            examName:
              form.examName.trim(),

            // IMPORTANT
            // Existing Test का Firebase ID
            testId:
              form.testId.trim(),

            totalQuestions:
              Number(
                form.totalQuestions
              ) ||
              questionCount,

            duration:
              Number(
                form.duration
              ) || 30,

            startTime:
              form.startTime,

            endTime:
              form.endTime,

            examIcon:
              form.examIcon,

            live:
              false,

            published:
              false,

            participants:
              0,

            // Original Test के Questions की संख्या
            linkedQuestionCount:
              questionCount,

            createdAt:
              new Date().toISOString(),

            updatedAt:
              new Date().toISOString(),

          }
        );

        alert(
          `✅ Live Test create हो गया।\n\nLinked Questions: ${questionCount}`
        );
      }

      resetForm();

    } catch (error) {

      console.error(
        "SAVE LIVE TEST ERROR:",
        error
      );

      alert(
        "❌ Live Test save नहीं हो पाया:\n" +
          error.message
      );

    } finally {

      setSaving(false);
    }
  };

  // =====================================================
  // EDIT
  // =====================================================

  const editTest = (test) => {

    setEditingId(
      test.id
    );

    setForm({

      testName:
        test.testName ||
        "",

      examName:
        test.examName ||
        "",

      testId:
        test.testId ||
        "",

      totalQuestions:
        test.totalQuestions ||
        25,

      duration:
        test.duration ||
        30,

      startTime:
        test.startTime ||
        "",

      endTime:
        test.endTime ||
        "",

      examIcon:
        test.examIcon ||
        "📝",

    });

    window.scrollTo({
      top: 0,
      behavior:
        "smooth",
    });
  };

  // =====================================================
  // PUBLISH
  // =====================================================

  const publishTest =
    async (test) => {

      try {

        if (!test.testId) {

          alert(
            "❌ Existing Test ID नहीं है।"
          );

          return;
        }

        await update(
          ref(
            db,
            `liveTests/${test.id}`
          ),
          {
            published:
              true,
          }
        );

        alert(
          "🌐 Test User side पर publish हो गया।"
        );

      } catch (error) {

        alert(
          error.message
        );
      }
    };

  // =====================================================
  // UNPUBLISH
  // =====================================================

  const unpublishTest =
    async (test) => {

      try {

        await update(
          ref(
            db,
            `liveTests/${test.id}`
          ),
          {
            published:
              false,

            live:
              false,
          }
        );

        alert(
          "Test unpublish कर दिया गया।"
        );

      } catch (error) {

        alert(
          error.message
        );
      }
    };

  // =====================================================
  // START LIVE
  // =====================================================

  const startLive =
    async (test) => {

      if (!test.published) {

        alert(
          "पहले Test को Publish करें।"
        );

        return;
      }

      if (!test.testId) {

        alert(
          "❌ इस Live Test में Existing Test ID नहीं है।"
        );

        return;
      }

      try {

        const sourceRef =
          ref(
            db,
            `tests/${test.testId}`
          );

        const snapshot =
          await get(
            sourceRef
          );

        if (
          !snapshot.exists()
        ) {

          alert(
            "❌ Linked Existing Test नहीं मिला।"
          );

          return;
        }

        await update(
          ref(
            db,
            `liveTests/${test.id}`
          ),
          {

            live:
              true,

            startedAt:
              new Date().toISOString(),

          }
        );

        alert(
          "🔴 Live Test START हो गया।"
        );

      } catch (error) {

        alert(
          "❌ " +
            error.message
        );
      }
    };

  // =====================================================
  // STOP LIVE
  // =====================================================

  const stopLive =
    async (test) => {

      try {

        await update(
          ref(
            db,
            `liveTests/${test.id}`
          ),
          {

            live:
              false,

            stoppedAt:
              new Date().toISOString(),

          }
        );

        alert(
          "Live Test STOP हो गया।"
        );

      } catch (error) {

        alert(
          error.message
        );
      }
    };

  // =====================================================
  // DELETE
  // =====================================================

  const deleteTest =
    async (test) => {

      const ok =
        window.confirm(
          `"${test.testName}" को delete करना चाहते हैं?`
        );

      if (!ok) return;

      try {

        await remove(
          ref(
            db,
            `liveTests/${test.id}`
          )
        );

        alert(
          "Test delete हो गया।"
        );

      } catch (error) {

        alert(
          error.message
        );
      }
    };

  // =====================================================
  // STATUS
  // =====================================================

  const getStatus =
    (test) => {

      const now =
        Date.now();

      const start =
        test.startTime
          ? new Date(
              test.startTime
            ).getTime()
          : 0;

      const end =
        test.endTime
          ? new Date(
              test.endTime
            ).getTime()
          : 0;

      if (
        test.live &&
        (!end ||
          now <= end)
      ) {
        return "LIVE";
      }

      if (
        start &&
        now < start
      ) {
        return "UPCOMING";
      }

      if (
        end &&
        now > end
      ) {
        return "ENDED";
      }

      return "OFF";
    };

  // =====================================================
  // FORMAT DATE
  // =====================================================

  const formatDate =
    (date) => {

      if (!date)
        return "-";

      try {

        return new Date(
          date
        ).toLocaleString(
          "hi-IN",
          {
            dateStyle:
              "medium",

            timeStyle:
              "short",
          }
        );

      } catch {

        return date;
      }
    };

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="admin-live-container">

      {/* HEADER */}

      <div className="admin-live-header">

        <div>

          <h2>
            🔴 Live Test Management
          </h2>

          <p>
            Live Test बनाएँ और
            Start / Stop करें
          </p>

        </div>

      </div>

      {/* FORM */}

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

          {/* TEST NAME */}

          <div className="admin-field">

            <label>
              Test Name *
            </label>

            <input
              type="text"
              name="testName"
              value={
                form.testName
              }
              onChange={
                handleChange
              }
              placeholder="जैसे UP PET Live Test"
            />

          </div>

          {/* EXAM */}

          <div className="admin-field">

            <label>
              Exam Name *
            </label>

            <input
              type="text"
              name="examName"
              value={
                form.examName
              }
              onChange={
                handleChange
              }
              placeholder="जैसे UP PET 2026"
            />

          </div>

          {/* EXISTING TEST ID */}

          <div
            className="admin-field"
            style={{
              gridColumn:
                "1 / -1",
            }}
          >

            <label>
              Existing Test ID *
            </label>

            <div
              style={{
                display:
                  "flex",
                gap: 8,
              }}
            >

              <input
                type="text"
                name="testId"
                value={
                  form.testId
                }
                onChange={
                  handleChange
                }
                placeholder="Firebase tests का ID"
                style={{
                  flex: 1,
                }}
              />

              <button
                type="button"
                onClick={
                  checkExistingTest
                }
                disabled={
                  checkingTest
                }
                style={{
                  padding:
                    "10px 14px",
                  border:
                    "none",
                  borderRadius:
                    8,
                  cursor:
                    "pointer",
                  fontWeight:
                    700,
                }}
              >
                {checkingTest
                  ? "Checking..."
                  : "🔍 Check"}
              </button>

            </div>

            <small
              style={{
                display:
                  "block",
                marginTop:
                  6,
                color:
                  "#64748b",
              }}
            >
              इसी Test के Questions
              Live Test में खुलेंगे।
            </small>

          </div>

          {/* ICON */}

          <div className="admin-field">

            <label>
              Icon
            </label>

            <input
              type="text"
              name="examIcon"
              value={
                form.examIcon
              }
              onChange={
                handleChange
              }
              placeholder="📝"
            />

          </div>

          {/* QUESTIONS */}

          <div className="admin-field">

            <label>
              Total Questions
            </label>

            <input
              type="number"
              name="totalQuestions"
              value={
                form.totalQuestions
              }
              onChange={
                handleChange
              }
              min="1"
            />

          </div>

          {/* DURATION */}

          <div className="admin-field">

            <label>
              Duration (Minutes)
            </label>

            <input
              type="number"
              name="duration"
              value={
                form.duration
              }
              onChange={
                handleChange
              }
              min="1"
            />

          </div>

          {/* START */}

          <div className="admin-field">

            <label>
              Start Time *
            </label>

            <input
              type="datetime-local"
              name="startTime"
              value={
                form.startTime
              }
              onChange={
                handleChange
              }
            />

          </div>

          {/* END */}

          <div className="admin-field">

            <label>
              End Time *
            </label>

            <input
              type="datetime-local"
              name="endTime"
              value={
                form.endTime
              }
              onChange={
                handleChange
              }
            />

          </div>

        </div>

        {/* BUTTONS */}

        <div className="admin-form-buttons">

          <button
            type="submit"
            className="save-live-btn"
            disabled={
              saving
            }
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
              onClick={
                resetForm
              }
            >
              Cancel
            </button>

          )}

        </div>

      </form>

      {/* LIST */}

      <div className="admin-live-list">

        <div className="admin-list-title">
          📋 Live Tests
        </div>

        {tests.length === 0 ? (

          <div className="admin-empty">
            अभी कोई Live Test
            नहीं बनाया गया है।
          </div>

        ) : (

          tests.map(
            (test) => {

              const status =
                getStatus(test);

              return (

                <div
                  className="admin-test-card"
                  key={test.id}
                >

                  <div className="admin-test-main">

                    <div className="admin-test-icon">
                      {test.examIcon ||
                        "📝"}
                    </div>

                    <div className="admin-test-details">

                      <h3>
                        {test.testName}
                      </h3>

                      <p>
                        📚{" "}
                        {test.examName}
                      </p>

                      <p>
                        🆔 Test ID:{" "}
                        {test.testId ||
                          "—"}
                      </p>

                      <p>
                        📝{" "}
                        {
                          test.totalQuestions ||
                          0
                        }{" "}
                        Questions
                        &nbsp; | &nbsp;
                        ⏱️{" "}
                        {
                          test.duration ||
                          0
                        }{" "}
                        Min
                      </p>

                      {test.linkedQuestionCount !==
                        undefined && (

                        <p>
                          🔗 Linked Questions:{" "}
                          {
                            test.linkedQuestionCount
                          }
                        </p>

                      )}

                      <p>
                        🟢 Start:{" "}
                        {formatDate(
                          test.startTime
                        )}
                      </p>

                      <p>
                        🔴 End:{" "}
                        {formatDate(
                          test.endTime
                        )}
                      </p>

                    </div>

                    <div
                      className={`admin-test-status ${status.toLowerCase()}`}
                    >

                      {status ===
                        "LIVE"
                        ? "🔴 LIVE"
                        : status ===
                          "UPCOMING"
                        ? "⏰ UPCOMING"
                        : status ===
                          "ENDED"
                        ? "⚫ ENDED"
                        : "⚪ OFF"}

                    </div>

                  </div>

                  {/* ACTIONS */}

                  <div className="admin-test-actions">

                    {!test.published ? (

                      <button
                        className="publish-btn"
                        onClick={() =>
                          publishTest(
                            test
                          )
                        }
                      >
                        🌐 Publish
                      </button>

                    ) : (

                      <button
                        className="unpublish-btn"
                        onClick={() =>
                          unpublishTest(
                            test
                          )
                        }
                      >
                        🚫 Unpublish
                      </button>

                    )}

                    {!test.live ? (

                      <button
                        className="start-btn"
                        onClick={() =>
                          startLive(
                            test
                          )
                        }
                      >
                        🔴 Start Live
                      </button>

                    ) : (

                      <button
                        className="stop-btn"
                        onClick={() =>
                          stopLive(
                            test
                          )
                        }
                      >
                        ⏹ Stop Live
                      </button>

                    )}

                    <button
                      className="edit-btn"
                      onClick={() =>
                        editTest(
                          test
                        )
                      }
                    >
                      ✏️ Edit
                    </button>

                    <button
                      className="delete-btn"
                      onClick={() =>
                        deleteTest(
                          test
                        )
                      }
                    >
                      🗑 Delete
                    </button>

                  </div>

                </div>

              );
            }
          )

        )}

      </div>

    </div>
  );
};

export default AdminLiveTest;
