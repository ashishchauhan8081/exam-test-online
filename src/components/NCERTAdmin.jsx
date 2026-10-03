import React, { useEffect, useState } from "react";
import { getApps, getApp, initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, push, set, update, remove } from "firebase/database";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { getAuth, onAuthStateChanged } from "firebase/auth";
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
const storage = getStorage(firebaseApp);
const auth = getAuth(firebaseApp);

const ADMIN_EMAIL = "cciashish@gmail.com";

const EMPTY_FORM = {
  bookTitle: "",
  className: "Class 6",
  subject: "",
  lessonNo: "",
  lessonTitle: "",
  description: "",
  pdfUrl: "",
  published: true,
};

const classes = [
  "Class 1", "Class 2", "Class 3", "Class 4", "Class 5",
  "Class 6", "Class 7", "Class 8", "Class 9", "Class 10",
  "Class 11", "Class 12",
];

export default function NCERTAdmin({ onBack }) {
  const [user, setUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [books, setBooks] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser || null);
      setAuthChecking(false);
    });
  }, []);

  useEffect(() => {
    return onValue(ref(db, "ncertBooks"), (snapshot) => {
      const data = snapshot.val() || {};
      const list = Object.entries(data).map(([id, value]) => ({
        id,
        ...(value || {}),
      }));
      list.sort((a, b) => String(a.className || "").localeCompare(String(b.className || "")) || String(a.lessonNo || "").localeCompare(String(b.lessonNo || "")));
      setBooks(list);
    });
  }, []);

  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((p) => ({ ...p, [name]: type === "checkbox" ? checked : value }));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setMessage("");
  };

  const uploadPdf = async (file) => {
    if (!file) return;
    if (file.type !== "application/pdf") {
      setMessage("❌ केवल PDF file upload करें।");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setMessage("❌ PDF अधिकतम 50 MB की हो सकती है।");
      return;
    }

    try {
      setUploading(true);
      setMessage("⏳ PDF upload हो रही है...");
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `ncert-pdfs/${Date.now()}-${safeName}`;
      const fileRef = storageRef(storage, path);
      await uploadBytes(fileRef, file, { contentType: "application/pdf" });
      const url = await getDownloadURL(fileRef);
      setForm((p) => ({ ...p, pdfUrl: url }));
      setMessage("✅ PDF upload हो गई। अब Save NCERT Book दबाएँ।");
    } catch (error) {
      console.error(error);
      setMessage(`❌ PDF upload नहीं हुई: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const saveBook = async (e) => {
    e.preventDefault();
    if (!isAdmin) return setMessage("❌ केवल Admin NCERT book save कर सकता है।");
    if (!form.bookTitle.trim()) return setMessage("❌ Book Title डालें।");
    if (!form.subject.trim()) return setMessage("❌ Subject डालें।");
    if (!form.pdfUrl.trim()) return setMessage("❌ PDF upload करें या PDF URL डालें।");

    try {
      setSaving(true);
      const payload = {
        ...form,
        bookTitle: form.bookTitle.trim(),
        subject: form.subject.trim(),
        lessonNo: form.lessonNo.trim(),
        lessonTitle: form.lessonTitle.trim(),
        description: form.description.trim(),
        pdfUrl: form.pdfUrl.trim(),
        published: !!form.published,
        updatedAt: new Date().toISOString(),
      };

      if (editingId) {
        await update(ref(db, `ncertBooks/${editingId}`), payload);
        setMessage("✅ NCERT Book update हो गई।");
      } else {
        const newRef = push(ref(db, "ncertBooks"));
        await set(newRef, { ...payload, createdAt: new Date().toISOString() });
        setMessage("✅ NCERT Book save हो गई।");
      }
      resetForm();
    } catch (error) {
      console.error(error);
      setMessage(`❌ Save नहीं हुआ: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const editBook = (book) => {
    setEditingId(book.id);
    setForm({
      bookTitle: book.bookTitle || "",
      className: book.className || "Class 6",
      subject: book.subject || "",
      lessonNo: book.lessonNo || "",
      lessonTitle: book.lessonTitle || "",
      description: book.description || "",
      pdfUrl: book.pdfUrl || "",
      published: book.published !== false,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteBook = async (id) => {
    if (!isAdmin) return;
    if (!window.confirm("यह NCERT Book delete करनी है?")) return;
    try {
      await remove(ref(db, `ncertBooks/${id}`));
      setMessage("✅ NCERT Book delete हो गई।");
      if (editingId === id) resetForm();
    } catch (error) {
      setMessage(`❌ Delete नहीं हुआ: ${error.message}`);
    }
  };

  const togglePublished = async (book) => {
    try {
      await update(ref(db, `ncertBooks/${book.id}`), {
        published: book.published === false,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      setMessage(`❌ Status update नहीं हुआ: ${error.message}`);
    }
  };

  const filteredBooks = books.filter((book) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [book.bookTitle, book.className, book.subject, book.lessonNo, book.lessonTitle]
      .join(" ")
      .toLowerCase()
      .includes(q);
  });

  if (authChecking) {
    return <div style={styles.center}>⏳ Admin check हो रहा है...</div>;
  }

  if (!isAdmin) {
    return (
      <div style={styles.center}>
        <div style={styles.denied}>
          <h2>🔐 Admin Access Required</h2>
          <p>इस page को केवल Admin account से खोला जा सकता है।</p>
          {onBack && <button style={styles.secondary} onClick={onBack}>← Back</button>}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>📚 NCERT Library Admin</h1>
          <p style={styles.sub}>Class • Subject • Lesson • PDF</p>
        </div>
        {onBack && <button style={styles.secondary} onClick={onBack}>← Back</button>}
      </div>

      {message && <div style={styles.message}>{message}</div>}

      <form onSubmit={saveBook} style={styles.card}>
        <h2 style={styles.cardTitle}>{editingId ? "✏️ NCERT Book Edit करें" : "➕ NCERT Book Add करें"}</h2>

        <div style={styles.grid}>
          <label style={styles.label}>Book Title *<input style={styles.input} name="bookTitle" value={form.bookTitle} onChange={handleChange} placeholder="जैसे NCERT History" /></label>
          <label style={styles.label}>Class *<select style={styles.input} name="className" value={form.className} onChange={handleChange}>{classes.map((c) => <option key={c}>{c}</option>)}</select></label>
          <label style={styles.label}>Subject *<input style={styles.input} name="subject" value={form.subject} onChange={handleChange} placeholder="History / Science / Geography" /></label>
          <label style={styles.label}>Lesson / Chapter No.<input style={styles.input} name="lessonNo" value={form.lessonNo} onChange={handleChange} placeholder="01" /></label>
          <label style={styles.label}>Lesson / Chapter Title<input style={styles.input} name="lessonTitle" value={form.lessonTitle} onChange={handleChange} placeholder="जैसे भारतीय संविधान" /></label>
        </div>

        <label style={styles.label}>Description<textarea style={{ ...styles.input, minHeight: 80 }} name="description" value={form.description} onChange={handleChange} placeholder="Lesson के बारे में छोटा विवरण" /></label>

        <div style={styles.uploadBox}>
          <strong>📄 PDF File</strong>
          <input type="file" accept="application/pdf,.pdf" onChange={(e) => uploadPdf(e.target.files?.[0])} disabled={uploading} />
          {uploading && <span>⏳ Uploading...</span>}
          {form.pdfUrl && <a href={form.pdfUrl} target="_blank" rel="noreferrer">🔗 Current PDF खोलें</a>}
          <input style={styles.input} name="pdfUrl" value={form.pdfUrl} onChange={handleChange} placeholder="या यहाँ PDF URL paste करें" />
        </div>

        <label style={styles.check}><input type="checkbox" name="published" checked={form.published} onChange={handleChange} /> User को यह NCERT Book दिखाएँ</label>

        <div style={styles.actions}>
          <button style={styles.primary} type="submit" disabled={saving || uploading}>{saving ? "Saving..." : editingId ? "💾 Update Book" : "💾 Save NCERT Book"}</button>
          {editingId && <button type="button" style={styles.secondary} onClick={resetForm}>Cancel Edit</button>}
        </div>
      </form>

      <div style={styles.card}>
        <div style={styles.listHeader}>
          <h2 style={styles.cardTitle}>📚 Added NCERT Books ({filteredBooks.length})</h2>
          <input style={{ ...styles.input, maxWidth: 300 }} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔎 Search..." />
        </div>

        {filteredBooks.length === 0 ? (
          <div style={styles.empty}>अभी कोई NCERT Book नहीं है। ऊपर से Add करें।</div>
        ) : (
          <div style={styles.list}>
            {filteredBooks.map((book) => (
              <div key={book.id} style={styles.item}>
                <div style={{ flex: 1 }}>
                  <div style={styles.itemTitle}>{book.className} • {book.subject}</div>
                  <strong>{book.bookTitle}</strong>
                  <div style={styles.meta}>Lesson {book.lessonNo || "—"}{book.lessonTitle ? ` • ${book.lessonTitle}` : ""}</div>
                  <div style={styles.meta}>{book.published === false ? "🔒 Unpublished" : "🟢 Published"}</div>
                </div>
                <div style={styles.itemActions}>
                  <a style={styles.linkBtn} href={book.pdfUrl} target="_blank" rel="noreferrer">📖 PDF</a>
                  <button style={styles.secondary} onClick={() => editBook(book)}>✏️ Edit</button>
                  <button style={styles.secondary} onClick={() => togglePublished(book)}>{book.published === false ? "Publish" : "Unpublish"}</button>
                  <button style={styles.danger} onClick={() => deleteBook(book.id)}>🗑️ Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "#f5f7fb", padding: 20, color: "#172033", boxSizing: "border-box" },
  center: { minHeight: "60vh", display: "grid", placeItems: "center", padding: 30, background: "#f5f7fb" },
  denied: { background: "#fff", padding: 30, borderRadius: 16, textAlign: "center", boxShadow: "0 8px 30px rgba(0,0,0,.08)" },
  header: { maxWidth: 1100, margin: "0 auto 18px", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" },
  title: { margin: 0, fontSize: 28 },
  sub: { margin: "5px 0 0", color: "#64748b" },
  card: { maxWidth: 1100, margin: "0 auto 18px", background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 8px 28px rgba(15,23,42,.08)" },
  cardTitle: { margin: "0 0 16px", fontSize: 20 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 },
  label: { display: "grid", gap: 7, fontWeight: 700, marginBottom: 14 },
  input: { width: "100%", boxSizing: "border-box", padding: "11px 12px", border: "1px solid #cbd5e1", borderRadius: 10, fontSize: 15, background: "#fff" },
  uploadBox: { border: "2px dashed #cbd5e1", borderRadius: 14, padding: 16, display: "grid", gap: 10, margin: "6px 0 14px" },
  check: { display: "flex", alignItems: "center", gap: 8, fontWeight: 700, margin: "10px 0 16px" },
  actions: { display: "flex", gap: 10, flexWrap: "wrap" },
  primary: { border: 0, borderRadius: 10, padding: "11px 16px", background: "#2563eb", color: "#fff", fontWeight: 800, cursor: "pointer" },
  secondary: { border: "1px solid #cbd5e1", borderRadius: 10, padding: "10px 14px", background: "#fff", color: "#172033", fontWeight: 700, cursor: "pointer" },
  danger: { border: "1px solid #fecaca", borderRadius: 10, padding: "10px 14px", background: "#fff1f2", color: "#b91c1c", fontWeight: 700, cursor: "pointer" },
  linkBtn: { borderRadius: 10, padding: "10px 14px", background: "#ecfdf5", color: "#047857", fontWeight: 800, textDecoration: "none" },
  message: { maxWidth: 1100, margin: "0 auto 15px", padding: 12, background: "#eff6ff", borderRadius: 10, fontWeight: 700 },
  listHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" },
  list: { display: "grid", gap: 10 },
  item: { border: "1px solid #e2e8f0", borderRadius: 14, padding: 14, display: "flex", gap: 14, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" },
  itemTitle: { color: "#2563eb", fontWeight: 800, marginBottom: 4 },
  meta: { color: "#64748b", fontSize: 13, marginTop: 4 },
  itemActions: { display: "flex", gap: 7, flexWrap: "wrap" },
  empty: { padding: 25, textAlign: "center", color: "#64748b" },
};
