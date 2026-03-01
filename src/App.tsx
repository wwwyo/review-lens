import { useCallback, useEffect, useState } from "react";
import { PRInput } from "./components/PRInput";
import { FileList } from "./components/FileList";
import { DiffView } from "./components/DiffView";
import { SidePanel } from "./components/SidePanel";
import { parseDiff } from "./lib/diff-parser";
import {
  fetchPrDiff,
  generateSummary,
  generateChangeGroups,
  detectBugs,
  chatWithContext,
  postPrComment,
  postReviewComments,
} from "./lib/commands";
import type {
  DiffFile,
  ReviewSummary,
  ChangeGroup,
  BugFinding,
  ChatMessage,
} from "./types";
import "./App.css";

const PROGRESS_KEY = (pr: string) => `review-lens-progress-${pr}`;

function loadProgress(pr: string): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY(pr));
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

function saveProgress(pr: string, progress: Record<string, boolean>) {
  localStorage.setItem(PROGRESS_KEY(pr), JSON.stringify(progress));
}

function App() {
  const [prNumber, setPrNumber] = useState("");
  const [repo, setRepo] = useState("");
  const [rawDiff, setRawDiff] = useState<string | null>(null);
  const [files, setFiles] = useState<DiffFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [changeGroups, setChangeGroups] = useState<ChangeGroup[] | null>(null);
  const [bugFindings, setBugFindings] = useState<BugFinding[] | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [reviewProgress, setReviewProgress] = useState<
    Record<string, boolean>
  >({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (prNumber) {
      setReviewProgress(loadProgress(prNumber));
    }
  }, [prNumber]);

  const setLoadingKey = (key: string, value: boolean) =>
    setLoading((prev) => ({ ...prev, [key]: value }));

  const handleLoadPr = useCallback(async (pr: string, r: string) => {
    setPrNumber(pr);
    setRepo(r);
    setRawDiff(null);
    setFiles([]);
    setSelectedFile(null);
    setSummary(null);
    setChangeGroups(null);
    setBugFindings(null);
    setChatMessages([]);
    setError(null);
    setLoadingKey("diff", true);

    try {
      const diff = await fetchPrDiff(pr, r || undefined);
      setRawDiff(diff);
      const parsed = parseDiff(diff);
      setFiles(parsed);
      if (parsed.length > 0) {
        setSelectedFile(parsed[0].newPath);
      }
      setReviewProgress(loadProgress(pr));
    } catch (e) {
      setError(String(e));
    } finally {
      setLoadingKey("diff", false);
    }
  }, []);

  const handleSelectFile = useCallback((path: string) => {
    setSelectedFile(path);
    setChatMessages([]);
  }, []);

  const handleToggleReviewed = useCallback(
    (path: string) => {
      setReviewProgress((prev) => {
        const next = { ...prev, [path]: !prev[path] };
        saveProgress(prNumber, next);
        return next;
      });
    },
    [prNumber],
  );

  const handleGenerateSummary = useCallback(async () => {
    if (!rawDiff) return;
    setLoadingKey("summary", true);
    try {
      const result = await generateSummary(rawDiff);
      setSummary(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoadingKey("summary", false);
    }
  }, [rawDiff]);

  const handleGenerateGroups = useCallback(async () => {
    if (!rawDiff) return;
    setLoadingKey("groups", true);
    try {
      const result = await generateChangeGroups(rawDiff);
      setChangeGroups(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoadingKey("groups", false);
    }
  }, [rawDiff]);

  const handleDetectBugs = useCallback(async () => {
    if (!rawDiff) return;
    setLoadingKey("bugs", true);
    try {
      const result = await detectBugs(rawDiff);
      setBugFindings(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoadingKey("bugs", false);
    }
  }, [rawDiff]);

  const handleSendChat = useCallback(
    async (message: string) => {
      const file = files.find((f) => f.newPath === selectedFile);
      const context = file
        ? file.hunks
            .map((h) => h.lines.map((l) => l.content).join("\n"))
            .join("\n\n")
        : rawDiff ?? "";

      const newMessages: ChatMessage[] = [
        ...chatMessages,
        { role: "user", content: message },
      ];
      setChatMessages(newMessages);
      setLoadingKey("chat", true);

      try {
        const formatted = newMessages
          .map((m) => `${m.role}: ${m.content}`)
          .join("\n");
        const reply = await chatWithContext(context, formatted);
        setChatMessages([...newMessages, { role: "assistant", content: reply }]);
      } catch (e) {
        setError(String(e));
      } finally {
        setLoadingKey("chat", false);
      }
    },
    [chatMessages, files, selectedFile, rawDiff],
  );

  const handlePostComment = useCallback(
    async (body: string) => {
      setLoadingKey("comment", true);
      try {
        await postPrComment(prNumber, body, repo || undefined);
        setError(null);
      } catch (e) {
        setError(String(e));
      } finally {
        setLoadingKey("comment", false);
      }
    },
    [prNumber, repo],
  );

  const handlePostLineComment = useCallback(
    async (path: string, line: number, body: string) => {
      setLoadingKey("comment", true);
      try {
        await postReviewComments(
          prNumber,
          [{ path, line, body }],
          repo || undefined,
        );
        setError(null);
      } catch (e) {
        setError(String(e));
      } finally {
        setLoadingKey("comment", false);
      }
    },
    [prNumber, repo],
  );

  const selectedDiff =
    files.find(
      (f) => f.newPath === selectedFile || f.oldPath === selectedFile,
    ) ?? null;

  const fileBugs = bugFindings?.filter((b) => b.file === selectedFile) ?? [];

  return (
    <div className="app-layout">
      <header className="app-header">
        <span className="app-logo">Review Lens</span>
        <PRInput onLoad={handleLoadPr} loading={loading["diff"] ?? false} />
      </header>

      {error && (
        <div className="app-error">
          <span>{error}</span>
          <button className="app-error__close" onClick={() => setError(null)}>
            ×
          </button>
        </div>
      )}

      <div className="app-body">
        <aside className="sidebar-left">
          {files.length > 0 ? (
            <FileList
              files={files}
              selectedFile={selectedFile}
              onSelect={handleSelectFile}
              reviewProgress={reviewProgress}
              onToggleReviewed={handleToggleReviewed}
            />
          ) : (
            <div className="sidebar-empty">
              {loading["diff"]
                ? "Loading PR diff…"
                : "Enter a PR number to get started"}
            </div>
          )}
        </aside>

        <main className="main-content">
          <DiffView file={selectedDiff} bugFindings={fileBugs} />
        </main>

        <aside className="sidebar-right">
          <SidePanel
            summary={summary}
            changeGroups={changeGroups}
            bugFindings={bugFindings}
            chatMessages={chatMessages}
            selectedFile={selectedDiff}
            prNumber={prNumber}
            loading={loading}
            onGenerateSummary={handleGenerateSummary}
            onGenerateGroups={handleGenerateGroups}
            onDetectBugs={handleDetectBugs}
            onSendChat={handleSendChat}
            onPostComment={handlePostComment}
            onPostLineComment={handlePostLineComment}
            onSelectFile={handleSelectFile}
          />
        </aside>
      </div>
    </div>
  );
}

export default App;
