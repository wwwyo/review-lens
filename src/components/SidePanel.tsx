import { useState } from "react";
import type {
  ReviewSummary,
  ChangeGroup,
  BugFinding,
  ChatMessage,
  DiffFile,
} from "../types";

type Tab = "summary" | "groups" | "bugs" | "chat" | "comment";

interface SidePanelProps {
  summary: ReviewSummary | null;
  changeGroups: ChangeGroup[] | null;
  bugFindings: BugFinding[] | null;
  chatMessages: ChatMessage[];
  selectedFile: DiffFile | null;
  prNumber: string;
  loading: Record<string, boolean>;
  onGenerateSummary: () => void;
  onGenerateGroups: () => void;
  onDetectBugs: () => void;
  onSendChat: (message: string) => void;
  onPostComment: (body: string) => void;
  onPostLineComment: (
    path: string,
    line: number,
    body: string,
  ) => void;
  onSelectFile: (path: string) => void;
}

export function SidePanel({
  summary,
  changeGroups,
  bugFindings,
  chatMessages,
  selectedFile,
  prNumber,
  loading,
  onGenerateSummary,
  onGenerateGroups,
  onDetectBugs,
  onSendChat,
  onPostComment,
  onPostLineComment,
  onSelectFile,
}: SidePanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("summary");
  const [chatInput, setChatInput] = useState("");
  const [commentBody, setCommentBody] = useState("");
  const [commentPath, setCommentPath] = useState("");
  const [commentLine, setCommentLine] = useState("");

  const tabs: { key: Tab; label: string }[] = [
    { key: "summary", label: "Summary" },
    { key: "groups", label: "Groups" },
    { key: "bugs", label: "Bugs" },
    { key: "chat", label: "Chat" },
    { key: "comment", label: "Comment" },
  ];

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim()) {
      onSendChat(chatInput.trim());
      setChatInput("");
    }
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentBody.trim()) return;
    if (commentPath.trim() && commentLine.trim()) {
      onPostLineComment(
        commentPath.trim(),
        parseInt(commentLine),
        commentBody.trim(),
      );
    } else {
      onPostComment(commentBody.trim());
    }
    setCommentBody("");
    setCommentPath("");
    setCommentLine("");
  };

  return (
    <div className="side-panel">
      <div className="tab-bar">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`tab-btn${activeTab === tab.key ? " tab-btn--active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="tab-content">
        {activeTab === "summary" && (
          <SummaryTab
            summary={summary}
            loading={loading["summary"] ?? false}
            onGenerate={onGenerateSummary}
            disabled={!prNumber}
          />
        )}
        {activeTab === "groups" && (
          <GroupsTab
            groups={changeGroups}
            loading={loading["groups"] ?? false}
            onGenerate={onGenerateGroups}
            disabled={!prNumber}
            onSelectFile={onSelectFile}
          />
        )}
        {activeTab === "bugs" && (
          <BugsTab
            bugs={bugFindings}
            loading={loading["bugs"] ?? false}
            onDetect={onDetectBugs}
            disabled={!prNumber}
            onSelectFile={onSelectFile}
          />
        )}
        {activeTab === "chat" && (
          <div className="chat-panel">
            <div className="chat-messages">
              {chatMessages.length === 0 && (
                <p className="chat-empty">
                  {selectedFile
                    ? `Ask about ${selectedFile.newPath}`
                    : "Select a file and ask questions about the changes"}
                </p>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`chat-msg chat-msg--${msg.role}`}>
                  <div className="chat-msg__role">
                    {msg.role === "user" ? "You" : "AI"}
                  </div>
                  <div className="chat-msg__content">{msg.content}</div>
                </div>
              ))}
              {(loading["chat"] ?? false) && (
                <div className="chat-msg chat-msg--assistant">
                  <div className="chat-msg__role">AI</div>
                  <div className="chat-msg__content">Thinking…</div>
                </div>
              )}
            </div>
            <form className="chat-input" onSubmit={handleChatSubmit}>
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about the code…"
                disabled={loading["chat"] ?? false}
              />
              <button
                type="submit"
                className="btn btn--primary"
                disabled={(loading["chat"] ?? false) || !chatInput.trim()}
              >
                Send
              </button>
            </form>
          </div>
        )}
        {activeTab === "comment" && (
          <form className="comment-form" onSubmit={handleCommentSubmit}>
            <p className="comment-form__title">Post to GitHub PR #{prNumber}</p>
            <input
              type="text"
              placeholder="File path (optional, for line comment)"
              value={commentPath}
              onChange={(e) => setCommentPath(e.target.value)}
            />
            <input
              type="text"
              placeholder="Line number (optional)"
              value={commentLine}
              onChange={(e) => setCommentLine(e.target.value)}
            />
            <textarea
              placeholder="Comment body"
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              rows={6}
            />
            <button
              type="submit"
              className="btn btn--primary"
              disabled={(loading["comment"] ?? false) || !commentBody.trim()}
            >
              {loading["comment"] ?? false ? "Posting…" : "Post Comment"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function SummaryTab({
  summary,
  loading,
  onGenerate,
  disabled,
}: {
  summary: ReviewSummary | null;
  loading: boolean;
  onGenerate: () => void;
  disabled: boolean;
}) {
  return (
    <div className="summary-tab">
      <button
        className="btn btn--primary btn--full"
        onClick={onGenerate}
        disabled={loading || disabled}
      >
        {loading ? "Generating…" : "Generate Summary"}
      </button>
      {summary && (
        <div className="summary-content">
          <h4>Overview</h4>
          <p>{summary.summary}</p>
          {summary.risks.length > 0 && (
            <>
              <h4>Risks</h4>
              <ul className="risk-list">
                {summary.risks.map((risk, i) => (
                  <li key={i} className={`risk-item risk-item--${risk.severity}`}>
                    <span className="risk-severity">
                      {risk.severity.toUpperCase()}
                    </span>
                    <span className="risk-desc">{risk.description}</span>
                    {risk.file && (
                      <span className="risk-file">{risk.file}</span>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
      {!summary && !loading && (
        <p className="tab-empty">
          Click "Generate Summary" to analyze changes
        </p>
      )}
    </div>
  );
}

function GroupsTab({
  groups,
  loading,
  onGenerate,
  disabled,
  onSelectFile,
}: {
  groups: ChangeGroup[] | null;
  loading: boolean;
  onGenerate: () => void;
  disabled: boolean;
  onSelectFile: (path: string) => void;
}) {
  return (
    <div className="groups-tab">
      <button
        className="btn btn--primary btn--full"
        onClick={onGenerate}
        disabled={loading || disabled}
      >
        {loading ? "Analyzing…" : "Suggest Reading Order"}
      </button>
      {groups && (
        <ol className="group-list">
          {groups
            .sort((a, b) => a.order - b.order)
            .map((group, i) => (
              <li key={i} className="group-item">
                <div className="group-item__name">
                  <span className="group-order">{group.order}</span>
                  {group.name}
                </div>
                <p className="group-item__desc">{group.description}</p>
                <div className="group-item__files">
                  {group.files.map((f) => (
                    <button
                      key={f}
                      className="file-link"
                      onClick={() => onSelectFile(f)}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </li>
            ))}
        </ol>
      )}
      {!groups && !loading && (
        <p className="tab-empty">
          Click above to group changes and suggest reading order
        </p>
      )}
    </div>
  );
}

function BugsTab({
  bugs,
  loading,
  onDetect,
  disabled,
  onSelectFile,
}: {
  bugs: BugFinding[] | null;
  loading: boolean;
  onDetect: () => void;
  disabled: boolean;
  onSelectFile: (path: string) => void;
}) {
  return (
    <div className="bugs-tab">
      <button
        className="btn btn--primary btn--full"
        onClick={onDetect}
        disabled={loading || disabled}
      >
        {loading ? "Scanning…" : "Detect Bugs"}
      </button>
      {bugs && (
        <>
          {bugs.length === 0 ? (
            <p className="tab-empty">No issues found</p>
          ) : (
            <ul className="bug-list">
              {bugs.map((bug, i) => (
                <li key={i} className={`bug-item bug-item--${bug.severity}`}>
                  <div className="bug-item__header">
                    <span className="bug-severity">
                      {bug.severity.toUpperCase()}
                    </span>
                    <button
                      className="file-link"
                      onClick={() => onSelectFile(bug.file)}
                    >
                      {bug.file}:{bug.line}
                    </button>
                  </div>
                  <p className="bug-item__message">{bug.message}</p>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {!bugs && !loading && (
        <p className="tab-empty">Click above to scan for potential issues</p>
      )}
    </div>
  );
}
