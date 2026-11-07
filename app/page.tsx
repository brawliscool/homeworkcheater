"use client";

import { ChangeEvent, DragEvent, FormEvent, useEffect, useRef, useState } from "react";

type Attachment = { id: string; file: File; preview: string };
type SavedSolution = { id: string; question: string; answer: string; subject: string; date: string; images: number };
type Tab = "home" | "history" | "profile";

const MAX_FILES = 3;
const MAX_FILE_BYTES = 4 * 1024 * 1024;
const STORAGE_KEY = "solveshot-history-v1";
const MAX_HISTORY = 40;
const SUPPORTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function Icon({ name, size = 20 }: { name: "sparkle" | "camera" | "upload" | "arrow" | "clock" | "user" | "home" | "check" | "copy" | "trash" | "book" | "close" | "image" | "shield"; size?: number }) {
  const paths: Record<typeof name, React.ReactNode> = {
    sparkle: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/><path d="m19 17 .7 2.3L22 20l-2.3.7L19 23l-.7-2.3L16 20l2.3-.7L19 17Z"/></>,
    camera: <><path d="M14.5 4H9.5l-1.6 2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-2.9l-1.6-2Z"/><circle cx="12" cy="13" r="3.5"/></>,
    upload: <><path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></>,
    arrow: <><path d="M4 12h16m-7-7 7 7-7 7"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M4.5 21c.3-4.3 3-6 7.5-6s7.2 1.7 7.5 6"/></>,
    home: <><path d="m3 11 9-8 9 8v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-9Z"/><path d="M9 21v-8h6v8"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    copy: <><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></>,
    trash: <><path d="M4 7h16M10 4h4m-8 3 1 14h10l1-14M10 11v6m4-6v6"/></>,
    book: <><path d="M12 6C9 4 6 4 3 5v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1Z"/><path d="M12 6v14"/></>,
    close: <path d="M6 6l12 12M18 6 6 18"/>,
    image: <><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m4 18 5-5 3 3 4-5 4 6"/></>,
    shield: <><path d="M12 2 4 6v6c0 5 3 8 8 10 5-2 8-5 8-10V6l-8-4Z"/><path d="m9 12 2 2 4-4"/></>
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function toDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Could not read image."));
    reader.onerror = () => reject(new Error("Could not read image."));
    reader.readAsDataURL(file);
  });
}

function classify(question: string): string {
  if (/equation|graph|algebra|calculus|geometry|\d\s*[+×÷=^-]/i.test(question)) return "Math";
  if (/science|biology|chemical|physics|atom|cell|molecule/i.test(question)) return "Science";
  if (/essay|grammar|poem|paragraph|literature|writing/i.test(question)) return "English";
  if (/history|century|war|government|historical/i.test(question)) return "History";
  return "Homework";
}

export default function Home() {
  const [tab, setTab] = useState<Tab>("home");
  const [question, setQuestion] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSolving, setIsSolving] = useState(false);
  const [answer, setAnswer] = useState("");
  const [lastQuestion, setLastQuestion] = useState("");
  const [lastSubject, setLastSubject] = useState("");
  const [error, setError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [history, setHistory] = useState<SavedSolution[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const activeUrls = useRef<Set<string>>(new Set());

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
      if (Array.isArray(saved)) setHistory(saved.filter((item) => item && typeof item.answer === "string").slice(0, MAX_HISTORY));
    } catch { /* Storage may be unavailable. */ }
    setHistoryLoaded(true);
    const urls = activeUrls.current;
    return () => { urls.forEach((url) => URL.revokeObjectURL(url)); urls.clear(); };
  }, []);

  useEffect(() => {
    if (!historyLoaded) return;
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history)); } catch { /* Private browsing can block storage. */ }
  }, [history, historyLoaded]);

  const addFiles = (files: File[]) => {
    const supported = files.filter((file) => SUPPORTED_TYPES.has(file.type) && file.size <= MAX_FILE_BYTES);
    if (supported.length !== files.length) setError("Choose JPG, PNG or WebP images, up to 4 MB each.");
    else setError("");
    const slots = Math.max(0, MAX_FILES - attachments.length);
    if (supported.length > slots) setError(`You can add up to ${MAX_FILES} images at once.`);
    const added = supported.slice(0, slots).map((file) => {
      const preview = URL.createObjectURL(file);
      activeUrls.current.add(preview);
      return { id: crypto.randomUUID(), file, preview };
    });
    setAttachments((prev) => [...prev, ...added]);
  };

  const removeImage = (id: string) => {
    setAttachments((prev) => {
      const item = prev.find((attachment) => attachment.id === id);
      if (item) { URL.revokeObjectURL(item.preview); activeUrls.current.delete(item.preview); }
      return prev.filter((attachment) => attachment.id !== id);
    });
  };

  const clearImages = () => {
    attachments.forEach((item) => { URL.revokeObjectURL(item.preview); activeUrls.current.delete(item.preview); });
    setAttachments([]);
  };

  const onFiles = (event: ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(event.target.files || []));
    event.target.value = "";
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer.files.length) addFiles(Array.from(event.dataTransfer.files));
  };

  const solve = async (event: FormEvent) => {
    event.preventDefault();
    if (isSolving) return;
    const text = question.trim();
    if (!text && !attachments.length) { setError("Add a photo or type a question first."); return; }
    setError(""); setCopyMessage(""); setIsSolving(true);
    try {
      const images = await Promise.all(attachments.map((attachment) => toDataUrl(attachment.file)));
      const response = await fetch("/api/solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text, images, previousQuestion: lastQuestion, previousAnswer: answer }),
        signal: AbortSignal.timeout(60000),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "Something went wrong. Please try again.");
      if (!payload.answer || typeof payload.answer !== "string") throw new Error("The AI returned an empty answer. Please retry.");
      const subject = classify(text);
      const entry: SavedSolution = { id: crypto.randomUUID(), question: text || `${attachments.length} image${attachments.length === 1 ? "" : "s"}`, answer: payload.answer, subject, date: new Date().toISOString(), images: attachments.length };
      setHistory((prev) => [entry, ...prev].slice(0, MAX_HISTORY));
      setAnswer(payload.answer); setLastQuestion(text); setLastSubject(subject); setQuestion(""); clearImages(); setTab("home");
    } catch (caught) {
      setError(caught instanceof Error ? (caught.name === "TimeoutError" ? "The request timed out. Please try again." : caught.message) : "Could not solve this question.");
    } finally { setIsSolving(false); }
  };

  const showSaved = (entry: SavedSolution) => {
    setAnswer(entry.answer); setLastQuestion(entry.question); setLastSubject(entry.subject); setQuestion(""); clearImages(); setError(""); setTab("home");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const copyAnswer = async () => {
    try { await navigator.clipboard.writeText(answer); setCopyMessage("Copied!"); }
    catch { setCopyMessage("Copy unavailable"); }
  };

  return (
    <div className="site-shell">
      <div className="ambient ambient-one" aria-hidden="true"/><div className="ambient ambient-two" aria-hidden="true"/>
      <header className="site-header">
        <button className="brand" onClick={() => setTab("home")} aria-label="SolveShot AI home">
          <span className="brand-symbol"><Icon name="sparkle" size={22}/></span>
          <span>SolveShot <strong>AI</strong></span>
        </button>
        <div className="desktop-navigation">
          <button className={tab === "home" ? "nav-active" : ""} onClick={() => setTab("home")}>Home</button>
          <button className={tab === "history" ? "nav-active" : ""} onClick={() => setTab("history")}>History</button>
          <button className={tab === "profile" ? "nav-active" : ""} onClick={() => setTab("profile")}>Profile</button>
        </div>
        <span className="plan-pill"><span className="plan-dot"/>FREE PLAN</span>
      </header>

      <main>
        {tab === "home" ? <>
          <section className="hero">
            <p className="eyebrow"><Icon name="sparkle" size={15}/> YOUR AI STUDY SIDEKICK</p>
            <h1>Homework help,<br/><span>in a snap.</span></h1>
            <p className="hero-subtitle">Stuck on a question? Just snap a photo and get the clarity you need to keep going.</p>
          </section>

          <section className="solver-panel" aria-labelledby="solver-title">
            <div className="solver-heading">
              <span className="panel-star"><Icon name="sparkle" size={20}/></span>
              <div><h2 id="solver-title">Let&apos;s solve it together</h2><p>Start by adding a photo of your question.</p></div>
            </div>
            <form onSubmit={solve}>
              <div className={`drop-zone ${isDragging ? "drop-zone-active" : ""}`} onDragOver={(event) => {event.preventDefault(); setIsDragging(true);}} onDragLeave={() => setIsDragging(false)} onDrop={onDrop} onPaste={(event) => { const pasted = Array.from(event.clipboardData.files); if (pasted.length) {event.preventDefault(); addFiles(pasted);} }}>
                <div className="camera-bubble"><Icon name="camera" size={28}/></div>
                <p className="drop-title">Your next answer starts here</p>
                <p className="drop-caption">Take a picture or upload an existing screenshot.</p>
                <div className="upload-buttons">
                  <button type="button" className="primary-button" disabled={isSolving} onClick={() => cameraInput.current?.click()}><Icon name="camera" size={18}/> Take a photo</button>
                  <button type="button" className="secondary-button" disabled={isSolving} onClick={() => fileInput.current?.click()}><Icon name="upload" size={18}/> Upload screenshot</button>
                </div>
                <p className="file-hint">or drag and drop an image here · JPG, PNG, WebP</p>
                <input className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" multiple ref={fileInput} onChange={onFiles} aria-label="Upload homework screenshots"/>
                <input className="visually-hidden" type="file" accept="image/*" capture="environment" ref={cameraInput} onChange={onFiles} aria-label="Take a photo of homework"/>
              </div>
              {!!attachments.length && <div className="preview-grid" aria-label="Attached images">{attachments.map((attachment) => <div className="preview-card" key={attachment.id}><img src={attachment.preview} alt={attachment.file.name || "Homework attachment"}/><button type="button" disabled={isSolving} aria-label={`Remove ${attachment.file.name}`} onClick={() => removeImage(attachment.id)}><Icon name="close" size={15}/></button></div>)}</div>}
              <label htmlFor="question" className="question-label">Or type your question <span>(optional when uploading a photo)</span></label>
              <textarea id="question" rows={3} maxLength={4000} value={question} disabled={isSolving} onChange={(event) => setQuestion(event.target.value)} placeholder="What do you need help understanding? You can also ask a follow-up…"/>
              {error && <p className="error-message" role="alert">{error}</p>}
              <div className="solver-actions"><span className="privacy-note"><Icon name="shield" size={14}/> Images are sent securely to the configured AI provider when you solve.</span><button type="submit" className="solve-button" disabled={isSolving || (!question.trim() && !attachments.length)}>{isSolving ? <><span className="spinner"/> Solving…</> : <>Solve question <Icon name="arrow" size={18}/></>}</button></div>
            </form>
          </section>

          {!!answer && <section className="answer-panel" aria-live="polite"><div className="answer-top"><div><p className="eyebrow answer-eyebrow"><Icon name="check" size={16}/> YOUR SOLUTION {lastSubject && `· ${lastSubject}`}</p><h2>Here&apos;s how it works</h2></div><button className="copy-button" onClick={copyAnswer}><Icon name="copy" size={16}/>{copyMessage || "Copy"}</button></div><div className="answer-body">{answer}</div><p className="followup-note">Want to go deeper? Ask another question above.</p></section>}

          <section className="features" aria-labelledby="features-title"><p className="eyebrow">SIMPLE AS THAT</p><h2 id="features-title">From stuck to <em>unstoppable.</em></h2><div className="feature-grid"><article><span className="feature-icon"><Icon name="camera" size={22}/></span><h3>Snap your question</h3><p>Photo, screenshot, or upload.</p></article><article><span className="feature-icon"><Icon name="sparkle" size={22}/></span><h3>Get a clear answer</h3><p>Understand the how, not just the what.</p></article><article><span className="feature-icon"><Icon name="book" size={22}/></span><h3>Keep learning</h3><p>Ask follow-ups when you need them.</p></article></div></section>
          <section className="subjects"><p className="eyebrow">MADE FOR YOUR SUBJECTS</p><div className="subject-list"><span>✳ &nbsp;Math</span><span>◈ &nbsp;Science</span><span>✎ &nbsp;English</span><span>◷ &nbsp;History</span><span>+ &nbsp;More</span></div></section>
        </> : tab === "history" ? <section className="subpage"><p className="eyebrow"><Icon name="clock" size={16}/> YOUR STUDY JOURNEY</p><h1>Past solutions<span className="period">.</span></h1><p className="subpage-description">Find questions you&apos;ve solved on this device.</p>{history.length ? <div className="history-list">{history.map((entry) => <button className="history-card" key={entry.id} onClick={() => showSaved(entry)}><div><span className="history-category">{entry.subject}</span><h3>{entry.question}</h3><p>{new Date(entry.date).toLocaleDateString(undefined, {dateStyle: "medium"})}</p></div><Icon name="arrow" size={20}/></button>)}</div> : <div className="empty-state"><Icon name="clock" size={30}/><h2>Your history starts here</h2><p>Solve a question and it will appear here automatically.</p><button className="secondary-button" onClick={() => setTab("home")}>Try the solver</button></div>}</section> : <section className="subpage"><p className="eyebrow"><Icon name="user" size={16}/> YOUR SPACE</p><h1>Study at your pace<span className="period">.</span></h1><p className="subpage-description">SolveShot keeps your recent solutions in this browser.</p><div className="profile-card"><div className="profile-row"><span className="feature-icon"><Icon name="clock" size={21}/></span><div><strong>{history.length} saved solutions</strong><p>Stored only on this device, not synced across devices.</p></div></div><button className="danger-button" disabled={!history.length} onClick={() => {if (window.confirm("Delete all saved solutions from this browser?")) { setHistory([]); setAnswer(""); }}}><Icon name="trash" size={18}/> Clear local history</button></div><div className="profile-card"><div className="profile-row"><span className="feature-icon"><Icon name="shield" size={21}/></span><div><strong>How your photos are used</strong><p>Photos are uploaded to your configured AI provider only when you select Solve question. Photos are not stored in your browser history.</p></div></div></div></section>}
      </main>

      <footer className="site-footer"><span>© 2026 SolveShot AI</span><span>Made for the curious <span className="purple-star">✦</span></span></footer>
      <nav className="mobile-nav" aria-label="Main navigation"><button className={tab === "home" ? "current" : ""} onClick={() => setTab("home")}><Icon name="home" size={20}/>Home</button><button className={tab === "history" ? "current" : ""} onClick={() => setTab("history")}><Icon name="clock" size={20}/>History</button><button className={tab === "profile" ? "current" : ""} onClick={() => setTab("profile")}><Icon name="user" size={20}/>Profile</button></nav>
    </div>
  );
}
