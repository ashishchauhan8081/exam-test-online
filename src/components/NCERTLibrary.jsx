import React, { useEffect, useMemo, useState } from "react";
import { getApps, getApp, initializeApp } from "firebase/app";
import { getDatabase, ref, onValue } from "firebase/database";
import firebaseConfig from "../firebase-config.json";

const firebaseApp = getApps().length
  ? getApp()
  : initializeApp({
      ...firebaseConfig,
      databaseURL:
        firebaseConfig.databaseURL ||
        "https://study-with-power-f6914-default-rtdb.asia-southeast1.firebasedatabase.app",
    });

const db = getDatabase(firebaseApp);

const classes = [
  "All", "Class 1", "Class 2", "Class 3", "Class 4", "Class 5",
  "Class 6", "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12",
];

export default function NCERTLibrary({ onBack }) {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedClass, setSelectedClass] = useState("All");
  const [selectedSubject, setSelectedSubject] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedBook, setSelectedBook] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError("");

    const unsubscribe = onValue(
      ref(db, "ncertBooks"),
      (snapshot) => {
        const data = snapshot.val() || {};
        const list = Object.entries(data)
          .map(([id, value]) => ({ id, ...(value || {}) }))
          .filter((book) => book.published !== false);

        list.sort((a, b) =>
          String(a.className || "").localeCompare(String(b.className || "")) ||
          String(a.subject || "").localeCompare(String(b.subject || "")) ||
          String(a.lessonNo || "").localeCompare(String(b.lessonNo || ""))
        );

        setBooks(list);
        setLoading(false);
      },
      (firebaseError) => {
        console.error(firebaseError);
        setError(firebaseError.message || "NCERT data load नहीं हुआ।");
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  const subjects = useMemo(() => {
    const set = new Set();
    books.forEach((book) => {
      if (book.subject) set.add(String(book.subject));
    });
    return ["All", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [books]);

  const filteredBooks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return books.filter((book) => {
      const classMatch = selectedClass === "All" || book.className === selectedClass;
      const subjectMatch = selectedSubject === "All" || book.subject === selectedSubject;
      const searchMatch = !q || [
        book.bookTitle,
        book.className,
        book.subject,
        book.lessonNo,
        book.lessonTitle,
        book.description,
      ].join(" ").toLowerCase().includes(q);
      return classMatch && subjectMatch && searchMatch;
    });
  }, [books, selectedClass, selectedSubject, search]);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>📚 NCERT Books</h1>
          <p style={styles.sub}>Class • Subject • Lesson के अनुसार NCERT सामग्री</p>
        </div>
        {onBack && <button style={styles.back} onClick={onBack}>← Back</button>}
      </div>

      <div style={styles.filters}>
        <select style={styles.control} value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
          {classes.map((item) => <option key={item}>{item}</option>)}
        </select>

        <select style={styles.control} value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}>
          {subjects.map((item) => <option key={item}>{item}</option>)}
        </select>

        <input style={styles.search} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔎 Book / Lesson / Subject खोजें..." />
      </div>

      {loading && <div style={styles.state}>⏳ NCERT Books load हो रही हैं...</div>}
      {error && <div style={styles.error}>❌ {error}</div>}

      {!loading && !error && filteredBooks.length === 0 && (
        <div style={styles.state}>
          <div style={{ fontSize: 42 }}>📚</div>
          <h2>अभी कोई NCERT Book उपलब्ध नहीं है</h2>
          <p>Admin Panel से Class, Subject, Lesson और PDF add करें।</p>
        </div>
      )}

      <div style={styles.grid}>
        {filteredBooks.map((book) => (
          <article key={book.id} style={styles.card}>
            <div style={styles.badge}>{book.className || "NCERT"}</div>
            <h2 style={styles.bookTitle}>{book.bookTitle || `${book.subject || "NCERT"} Book`}</h2>
            <div style={styles.subject}>📘 {book.subject || "Subject"}</div>
            {(book.lessonNo || book.lessonTitle) && (
              <div style={styles.lesson}>📖 Lesson {book.lessonNo || ""}{book.lessonTitle ? ` — ${book.lessonTitle}` : ""}</div>
            )}
            {book.description && <p style={styles.description}>{book.description}</p>}
            <div style={styles.cardActions}>
              <button style={styles.read} onClick={() => setSelectedBook(book)}>📖 पढ़ें</button>
              <a style={styles.download} href={book.pdfUrl} target="_blank" rel="noreferrer">⬇️ PDF खोलें</a>
            </div>
          </article>
        ))}
      </div>

      {selectedBook && (
        <div style={styles.overlay} onClick={() => setSelectedBook(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <h2 style={{ margin: 0 }}>{selectedBook.bookTitle || "NCERT PDF"}</h2>
                <small>{selectedBook.className} • {selectedBook.subject}{selectedBook.lessonNo ? ` • Lesson ${selectedBook.lessonNo}` : ""}</small>
              </div>
              <button style={styles.close} onClick={() => setSelectedBook(null)}>✕</button>
            </div>
            <iframe
              title={selectedBook.bookTitle || "NCERT PDF"}
              src={selectedBook.pdfUrl}
              style={styles.pdf}
            />
            <div style={{ padding: 10, textAlign: "right" }}>
              <a style={styles.download} href={selectedBook.pdfUrl} target="_blank" rel="noreferrer">⬇️ PDF को नए tab में खोलें</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "#f5f7fb", padding: 20, boxSizing: "border-box", color: "#172033" },
  header: { maxWidth: 1150, margin: "0 auto 18px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 },
  title: { margin: 0, fontSize: 30 },
  sub: { margin: "5px 0 0", color: "#64748b" },
  back: { border: "1px solid #cbd5e1", background: "#fff", borderRadius: 10, padding: "10px 15px", fontWeight: 800, cursor: "pointer" },
  filters: { maxWidth: 1150, margin: "0 auto 20px", display: "grid", gridTemplateColumns: "180px 200px 1fr", gap: 10 },
  control: { width: "100%", boxSizing: "border-box", padding: "11px 12px", border: "1px solid #cbd5e1", borderRadius: 10, background: "#fff" },
  search: { width: "100%", boxSizing: "border-box", padding: "11px 12px", border: "1px solid #cbd5e1", borderRadius: 10, background: "#fff" },
  state: { maxWidth: 1150, margin: "30px auto", padding: 40, background: "#fff", borderRadius: 16, textAlign: "center", color: "#64748b" },
  error: { maxWidth: 1150, margin: "20px auto", padding: 15, background: "#fff1f2", color: "#b91c1c", borderRadius: 12, fontWeight: 700 },
  grid: { maxWidth: 1150, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(270px,1fr))", gap: 16 },
  card: { background: "#fff", borderRadius: 16, padding: 18, boxShadow: "0 7px 25px rgba(15,23,42,.07)", border: "1px solid #e2e8f0" },
  badge: { display: "inline-block", padding: "5px 9px", borderRadius: 999, background: "#eff6ff", color: "#1d4ed8", fontWeight: 800, fontSize: 12 },
  bookTitle: { margin: "12px 0 7px", fontSize: 20 },
  subject: { color: "#334155", fontWeight: 700 },
  lesson: { marginTop: 8, color: "#475569", fontSize: 14 },
  description: { color: "#64748b", lineHeight: 1.5 },
  cardActions: { display: "flex", gap: 8, marginTop: 15, flexWrap: "wrap" },
  read: { border: 0, background: "#2563eb", color: "#fff", borderRadius: 10, padding: "10px 14px", fontWeight: 800, cursor: "pointer" },
  download: { display: "inline-flex", alignItems: "center", borderRadius: 10, padding: "10px 14px", background: "#ecfdf5", color: "#047857", fontWeight: 800, textDecoration: "none" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,.65)", zIndex: 9999, padding: 20, boxSizing: "border-box", display: "grid", placeItems: "center" },
  modal: { width: "min(1100px,100%)", height: "min(90vh,900px)", background: "#fff", borderRadius: 14, overflow: "hidden", display: "grid", gridTemplateRows: "auto 1fr auto" },
  modalHeader: { padding: "12px 15px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" },
  close: { border: 0, background: "#f1f5f9", borderRadius: 8, width: 38, height: 38, cursor: "pointer", fontWeight: 800 },
  pdf: { width: "100%", height: "100%", border: 0, background: "#e5e7eb" },
};
