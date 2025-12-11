'use client';

import Image from "next/image";
import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type Screenshot = {
  id: string;
  name: string;
  previewUrl: string;
};

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrls = useRef<Set<string>>(new Set());
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const hasScreenshots = useMemo(() => screenshots.length > 0, [screenshots]);
  const formattedAnswer = useMemo(() => {
    if (!answer) return [];
    return answer
      .split(/\n{2,}/)
      .map((block) => block.trim())
      .filter(Boolean);
  }, [answer]);

  const handlePlusClick = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedQuestion = question.trim();

    if (!trimmedQuestion) {
      setErrorMessage("Type a homework question to get started.");
      return;
    }

    setIsLoading(true);
    setAnswer(null);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmedQuestion }),
      });

      const body = await response.json().catch(() => null);

      if (!response.ok) {
        const details =
          body?.error ||
          body?.details ||
          "Something went wrong while contacting DeepSeek.";
        throw new Error(details);
      }

      setAnswer(
        body?.answer ?? "I couldn't generate a solution this time. Please retry."
      );
      setQuestion("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unexpected error while solving your question."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const isSubmitDisabled = !question.trim() || isLoading;

  const handleFilesSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(event.target.files ?? []).filter((file) =>
      file.type.startsWith("image/")
    );

    if (!newFiles.length) {
      event.target.value = "";
      return;
    }

    const preparedFiles = newFiles.map((file) => {
      const previewUrl = URL.createObjectURL(file);
      previewUrls.current.add(previewUrl);
      return {
        id: `${file.name}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: file.name,
        previewUrl,
      };
    });

    setScreenshots((prev) => [...prev, ...preparedFiles]);
    event.target.value = "";
  };

  const clearScreenshots = () => {
    if (!screenshots.length) return;
    previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
    previewUrls.current.clear();
    setScreenshots([]);
  };

  useEffect(() => {
    const urls = previewUrls.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-between p-8 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      {/* Header */}
      <header className="w-full max-w-5xl flex justify-between items-center mb-12">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-white font-bold">
            AI
          </div>
          <h1 className="text-xl font-bold text-text-primary">HomeworkHelper</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-xs text-text-secondary uppercase tracking-wider">Free Snaps</span>
            <span className="text-success font-bold">5 left</span>
          </div>
          <button className="bg-success text-white px-6 py-2 rounded-full font-semibold hover:opacity-90 transition-opacity">
            Subscribe
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex flex-col gap-8 w-full max-w-3xl flex-grow">
        
        {/* Chat / Result Area */}
        <div className="bg-surface rounded-2xl p-6 min-h-[400px] flex flex-col gap-6 shadow-lg border border-white/5">
          {hasScreenshots ? (
            <div className="flex flex-col flex-grow gap-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-text-primary">Selected screenshots</h3>
                  <p className="text-sm text-text-secondary">
                    {screenshots.length} file{screenshots.length > 1 ? "s" : ""} ready to analyze
                  </p>
                </div>
                <button
                  onClick={clearScreenshots}
                  className="text-sm text-primary font-semibold hover:underline"
                  type="button"
                >
                  Clear
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {screenshots.map((shot) => (
                  <div
                    key={shot.id}
                    className="rounded-xl border border-white/10 bg-surface p-3 flex flex-col gap-3"
                  >
                    <div className="relative w-full pt-[56%] overflow-hidden rounded-lg bg-black/20">
                      <Image
                        src={shot.previewUrl}
                        alt={shot.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, 50vw"
                        unoptimized
                      />
                    </div>
                    <p className="text-xs text-text-secondary truncate">{shot.name}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            !answer &&
            !isLoading &&
            !errorMessage && (
              <div className="flex-grow flex flex-col justify-center items-center text-center p-8 opacity-60">
                <div className="w-16 h-16 mb-4 rounded-full bg-surface border-2 border-dashed border-text-secondary flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-text-secondary">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">Upload your homework</h3>
                <p className="text-text-secondary max-w-sm">
                  Take a photo of a math problem or question. Our vision AI will analyze it and help you solve it.
                </p>
              </div>
            )
          )}

          <div className="rounded-2xl border border-white/10 bg-black/20 p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-text-primary">AI Solution</h3>
                <p className="text-sm text-text-secondary">
                  {isLoading
                    ? "Analyzing your question..."
                    : answer
                      ? "Here is the breakdown:"
                      : "Ask a question or upload a screenshot to get help."}
                </p>
              </div>
              {isLoading && (
                <div className="flex items-center gap-2 text-xs text-text-secondary">
                  <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  Thinking
                </div>
              )}
            </div>

            {errorMessage && (
              <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/30 rounded-xl px-4 py-3">
                {errorMessage}
              </p>
            )}

            {!errorMessage && (
              <>
                {isLoading && (
                  <div className="flex items-center gap-3 text-text-secondary">
                    <span className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span>Working on it...</span>
                  </div>
                )}

                {!isLoading && answer && (
                  <div className="space-y-3 text-sm leading-relaxed text-text-primary">
                    {formattedAnswer.map((block, index) => (
                      <p key={`${block}-${index}`} className="bg-white/5 rounded-xl px-4 py-3 whitespace-pre-wrap">
                        {block}
                      </p>
                    ))}
                  </div>
                )}

                {!isLoading && !answer && (
                  <p className="text-sm text-text-secondary">
                    Need help? Type a prompt like &ldquo;Explain how to solve quadratic equations&rdquo; and I will walk you through it.
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Input Area */}
        <form className="relative" onSubmit={handleSubmit}>
          <button
            type="button"
            onClick={handlePlusClick}
            className="absolute inset-y-0 left-1 flex items-center justify-center w-10 text-primary rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/40 hover:bg-white/5 transition-colors z-10"
            aria-label="Add screenshots"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFilesSelected}
          />
          <input
            type="text"
            placeholder="Type a question or upload a photo..."
            className="w-full bg-surface border border-white/10 rounded-full py-4 pl-12 pr-12 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder-text-secondary/50"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            disabled={isLoading}
          />
          <button
            type="submit"
            className="absolute inset-y-1 right-1 bg-primary hover:bg-indigo-500 text-white p-3 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSubmitDisabled}
            aria-label="Send question"
          >
            {isLoading ? (
              <span className="block h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0 1 21.485 12 59.77 59.77 0 0 1 3.27 20.876L5.999 12Zm0 0h7.5" />
              </svg>
            )}
          </button>
        </form>

      </main>
      
      <footer className="mt-12 text-center text-text-secondary text-sm">
        <p>© 2024 HomeworkAI. All rights reserved.</p>
      </footer>
    </div>
  );
}
