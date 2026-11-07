"use client";
import { ChangeEvent, DragEvent, FormEvent, useEffect, useRef, useState } from "react";

type Entry = { id: string; question: string; answer: string; date: string; photos: number };
type Photo = { id: string; file: File; url: string };
type View = "home" | "history" | "profile";
const HISTORY_KEY = "solveshot-ai-history";
const id = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

async function encodePhoto(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(new Error("Could not open photo. Use JPG or PNG.")); img.src = url; });
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 1450 / Math.max(img.naturalWidth, img.naturalHeight));
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Photo processing is unavailable.");
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    let data = canvas.toDataURL("image/jpeg", 0.78);
    if (data.length > 1300000) data = canvas.toDataURL("image/jpeg", 0.53);
    if (data.length > 1300000) throw new Error("Photo too detailed. Crop it and try again.");
    return data;
  } finally { URL.revokeObjectURL(url); }
}

export default function Home() {
  const [view, setView] = useState<View>("home");
  const [question, setQuestion] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [history, setHistory] = useState<Entry[]>([]);
  const [active, setActive] = useState<Entry | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const photoRef = useRef<Photo[]>([]);
  const cameraRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const answerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const value = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
      if (Array.isArray(value)) setHistory(value.filter((x) => x && typeof x.question === "string" && typeof x.answer === "string").slice(0, 40));
    } catch { /* Storage can be disabled. */ }
    return () => photoRef.current.forEach((p) => URL.revokeObjectURL(p.url));
  }, []);
  useEffect(() => { photoRef.current = photos; }, [photos]);

  function persist(next: Entry[]) {
    setHistory(next);
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch { /* Local storage is optional. */ }
  }
  function addFiles(files: FileList | File[]) {
    setError("");
    const available = 3 - photos.length;
    if (available < 1) { setError("Maximum 3 photos per question."); return; }
    const chosen = Array.from(files).filter((f) => f.type.startsWith("image/") && f.size <= 15 * 1024 * 1024).slice(0, available);
    if (!chosen.length) { setError("Please choose an image smaller than 15 MB."); return; }
    if (files.length > available) setError("Only the first " + available + " photo(s) were added.");
    setPhotos((old) => [...old, ...chosen.map((file) => ({ file, id: id(), url: URL.createObjectURL(file) }))]);
  }
  function selected(event: ChangeEvent<HTMLInputElement>) { if (event.target.files) addFiles(event.target.files); event.target.value = ""; }
  function dropped(event: DragEvent<HTMLDivElement>) { event.preventDefault(); setDragging(false); addFiles(event.dataTransfer.files); }
  function removePhoto(target: string) {
    const photo = photos.find((p) => p.id === target);
    if (photo) URL.revokeObjectURL(photo.url);
    setPhotos((old) => old.filter((p) => p.id !== target));
  }
  function resetPhotos() { photos.forEach((p) => URL.revokeObjectURL(p.url)); setPhotos([]); }
  function newQuestion() { setQuestion(""); resetPhotos(); setError(""); setActive(null); setView("home"); }
  function openEntry(entry: Entry) { setActive(entry); setQuestion(""); setError(""); setView("home"); }
  function deleteEntry(target: string) { persist(history.filter((e) => e.id !== target)); if (active?.id === target) setActive(null); }

  async function solve(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || (!question.trim() && !photos.length)) return;
    setBusy(true); setError("");
    try {
      const images = await Promise.all(photos.map((p) => encodePhoto(p.file)));
      const res = await fetch("/api/solve", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.trim(), images, context: active ? { question: active.question, answer: active.answer } : undefined }),
      });
      const data: { answer?: string; error?: string } = await res.json().catch(() => ({}));
      if (!res.ok || !data.answer) throw new Error(data.error || "The solver is unavailable. Please retry.");
      const entry: Entry = {
        id: id(), question: question.trim() || "Question from photo",
        answer: data.answer, date: new Date().toISOString(), photos: photos.length,
      };
      setActive(entry); persist([entry, ...history].slice(0, 40));
      setQuestion(""); resetPhotos(); setView("home");
      setTimeout(() => answerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (e) { setError(e instanceof Error ? e.message : "An unexpected error occurred."); }
    finally { setBusy(false); }
  }

  return <div className="app-shell">
    <header className="topbar">
      <button type="button" className="brand" onClick={newQuestion}><span className="logo">✦</span><span>SolveShot <b>AI</b></span></button>
      <div className="header-right"><span className="plan-chip"><i /> STUDY MODE</span><button type="button" className="new-button" onClick={newQuestion}>＋ <span>New question</span></button></div>
    </header>
    <main className="content">
      {view === "home" && <>
        {!active && <section className="hero"><div className="eyebrow">✳ &nbsp; YOUR AI STUDY SIDEKICK</div><h1>Homework help,<br /><em>in a snap.</em></h1><p>Stuck on a question? Just snap a photo and get the clarity you need to keep going.</p></section>}
        <section className="solver">
          <div className="section-heading"><span className="section-logo">✦</span><div><h2>{active ? "Keep learning together" : "Let’s solve it together"}</h2><p>{active ? "Ask a follow-up about your solution." : "Start by adding a photo of your question."}</p></div></div>
          <div className={dragging ? "drop-area dragging" : "drop-area"}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={(e) => { e.preventDefault(); setDragging(false); }} onDrop={dropped}>
            <span className="camera-glyph">▣<sup>✦</sup></span>
            <h3>Have a question? Drop it here.</h3><p>Take a photo, upload a screenshot, or type below.</p>
            <div className="upload-buttons">
              <button type="button" className="btn primary" onClick={() => cameraRef.current?.click()}>◉ &nbsp;Take a photo</button>
              <button type="button" className="btn secondary" onClick={() => uploadRef.current?.click()}>↥ &nbsp;Upload screenshot</button>
            </div>
            <small>or drag and drop an image here · JPG, PNG, WebP</small>
            <input hidden type="file" accept="image/*" capture="environment" ref={cameraRef} onChange={selected} />
            <input hidden type="file" accept="image/*" multiple ref={uploadRef} onChange={selected} />
          </div>
          {!!photos.length && <div className="photo-list">{photos.map((p) => <div className="photo" key={p.id}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt={p.file.name} /><button type="button" onClick={() => removePhoto(p.id)} aria-label={"Remove " + p.file.name}>×</button>
          </div>)}</div>}
          <form onSubmit={solve}>
            <label htmlFor="question">Your question <span>(optional if you added a photo)</span></label>
            <textarea rows={3} id="question" maxLength={6000} value={question} disabled={busy} onChange={(e) => setQuestion(e.target.value)}
              placeholder={active ? "Ask a follow-up question…" : "Or type your question here…"} />
            {error && <div className="error" role="alert">{error}</div>}
            <div className="form-footer"><span className="privacy">♢ &nbsp;Photos are sent to your configured AI provider and are not stored in history.</span>
              <button type="submit" className="btn primary submit" disabled={busy || (!question.trim() && !photos.length)}>{busy ? "Solving…" : "Solve question ↗"}</button></div>
          </form>
        </section>
        {active && <section ref={answerRef} className="answer" aria-live="polite"><div className="answer-title"><span>✳</span><div><small>YOUR SOLUTION</small><h2>{active.question}</h2></div></div><div className="solution">{active.answer}</div><div className="answer-actions"><button type="button" onClick={() => navigator.clipboard?.writeText(active.answer)}>Copy answer</button><button type="button" onClick={newQuestion}>New problem ↗</button></div></section>}
        {!active && <section className="features"><span className="eyebrow">SIMPLE AS THAT</span><h2>From stuck to <em>unstoppable.</em></h2><div className="feature-grid">
          <article><span>✳</span><h3>Snap your question</h3><p>Photo, screenshot, or upload.</p></article>
          <article><span>◈</span><h3>Get a clear answer</h3><p>Understand the how, not just the what.</p></article>
          <article><span>✦</span><h3>Keep learning</h3><p>Ask follow-ups when you need them.</p></article>
        </div><div className="subjects"><small>MADE FOR YOUR SUBJECTS</small><div><span>✳ Math</span><span>◈ Science</span><span>✎ English</span><span>◷ History</span><span>＋ More</span></div></div></section>}
      </>}
      {view === "history" && <section className="subpage"><span className="eyebrow">YOUR STUDY TRAIL</span><h1>Question <em>history.</em></h1><p>Solutions saved on this device.</p>
        {!history.length ? <div className="empty"><div>◷</div><h2>Nothing here yet</h2><p>Your solved questions will appear here.</p><button className="btn primary" onClick={newQuestion}>Solve a question</button></div> :
          <div className="history-list">{history.map((item) => <article key={item.id}><button className="history-open" onClick={() => openEntry(item)}><small>{new Date(item.date).toLocaleDateString()} · {item.photos} photo(s)</small><strong>{item.question}</strong><span>View answer ↗</span></button><button className="delete" onClick={() => deleteEntry(item.id)} aria-label="Delete question">×</button></article>)}</div>}
      </section>}
      {view === "profile" && <section className="subpage"><span className="eyebrow">YOUR LEARNING WORKSPACE</span><h1>Your <em>workspace.</em></h1><p>Study smarter, one question at a time.</p><div className="profile"><div className="avatar">✦</div><h2>SolveShot AI</h2><p>No account required.</p><div className="stats"><strong>{history.length}</strong><span>Saved solutions on this device</span></div><p>Your text history is stored only in this browser. Photos are not stored in your history.</p><button className="btn secondary" onClick={() => setView("history")}>View history</button></div></section>}
    </main>
    <footer>© {new Date().getFullYear()} SolveShot AI · Made for the curious ✦</footer>
    <nav className="nav" aria-label="Primary navigation">
      <button type="button" className={view === "home" ? "active" : ""} onClick={() => setView("home")}><span>⌂</span>Home</button>
      <button type="button" className={view === "history" ? "active" : ""} onClick={() => setView("history")}><span>◷</span>History</button>
      <button type="button" className={view === "profile" ? "active" : ""} onClick={() => setView("profile")}><span>◯</span>Profile</button>
    </nav>
  </div>;
}
