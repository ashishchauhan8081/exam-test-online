import React, { useRef } from "react";

export default function QuestionsForm({
  question,
  questionNumber,
  onQuestionChange,
  onOptionChange,
}) {
  const graphImageInputRef = useRef(null);

  if (!question) return null;

  const handleGraphImage = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    // केवल image files
    if (!file.type.startsWith("image/")) {
      alert("कृपया केवल Graph/Chart की image चुनें।");
      e.target.value = "";
      return;
    }

    // 5 MB limit
    if (file.size > 5 * 1024 * 1024) {
      alert("Image का size 5 MB से कम होना चाहिए।");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      onQuestionChange("questionImage", reader.result);
    };

    reader.readAsDataURL(file);
  };

  const removeGraphImage = () => {
    onQuestionChange("questionImage", "");
    if (graphImageInputRef.current) {
      graphImageInputRef.current.value = "";
    }
  };

  return (
    <div className="question-form">

      {/* QUESTION */}
      <div className="form-group form-group-full">
        <label>❓ Question {questionNumber}</label>

        <textarea
          rows={4}
          placeholder="यहाँ प्रश्न लिखें..."
          value={question.question || ""}
          onChange={(e) =>
            onQuestionChange("question", e.target.value)
          }
        />
      </div>

      {/* GRAPH / CHART IMAGE */}
      <div className="form-group form-group-full">
        <label>📊 Graph / Chart Image (Optional)</label>

        <input
          ref={graphImageInputRef}
          type="file"
          accept="image/*"
          onChange={handleGraphImage}
        />

        <small>
          Bar Graph, Line Graph, Pie Chart, Table या कोई भी Question
          Image यहाँ upload कर सकते हैं।
        </small>

        {question.questionImage && (
          <div
            style={{
              marginTop: "12px",
              padding: "10px",
              border: "1px solid #ddd",
              borderRadius: "8px",
              background: "#fff",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "8px",
              }}
            >
              <strong>📊 Preview</strong>

              <button
                type="button"
                onClick={removeGraphImage}
                style={{
                  padding: "6px 10px",
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer",
                }}
              >
                ❌ Remove
              </button>
            </div>

            <img
              src={question.questionImage}
              alt="Graph / Chart"
              style={{
                display: "block",
                width: "100%",
                maxWidth: "700px",
                maxHeight: "500px",
                objectFit: "contain",
                margin: "0 auto",
                borderRadius: "6px",
              }}
            />
          </div>
        )}
      </div>

      {/* OPTIONS */}
      <div className="options-editor">
        <h3>🔤 Options</h3>

        {question.options.map((option, index) => (
          <div className="option-row" key={index}>
            <div className="option-label">
              {String.fromCharCode(65 + index)}
            </div>

            <input
              type="text"
              placeholder={`Option ${String.fromCharCode(65 + index)}`}
              value={option || ""}
              onChange={(e) =>
                onOptionChange(index, e.target.value)
              }
            />

            <label className="correct-option">
              <input
                type="radio"
                name={`correct-answer-${question.id}`}
                checked={Number(question.answer) === index}
                onChange={() =>
                  onQuestionChange("answer", index)
                }
              />

              <span>सही</span>
            </label>
          </div>
        ))}
      </div>

      {/* EXPLANATION */}
      <div className="form-group form-group-full">
        <label>💡 सही उत्तर की व्याख्या</label>

        <textarea
          rows={4}
          placeholder="सही उत्तर की व्याख्या लिखें..."
          value={question.explanation || ""}
          onChange={(e) =>
            onQuestionChange("explanation", e.target.value)
          }
        />
      </div>

      {/* EXPLANATION IMAGE */}
      <div className="form-group form-group-full">
        <label>🖼️ Explanation Image URL (Optional)</label>

        <input
          type="text"
          placeholder="https://..."
          value={question.explanationImage || ""}
          onChange={(e) =>
            onQuestionChange(
              "explanationImage",
              e.target.value
            )
          }
        />
      </div>

    </div>
  );
}
