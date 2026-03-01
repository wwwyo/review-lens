import type { DiffFile, BugFinding } from "../types";

interface DiffViewProps {
  file: DiffFile | null;
  bugFindings: BugFinding[];
}

export function DiffView({ file, bugFindings }: DiffViewProps) {
  if (!file) {
    return (
      <div className="diff-view diff-view--empty">
        <p>Select a file to view its diff</p>
      </div>
    );
  }

  const bugsByLine = new Map<number, BugFinding[]>();
  for (const bug of bugFindings) {
    const existing = bugsByLine.get(bug.line) ?? [];
    existing.push(bug);
    bugsByLine.set(bug.line, existing);
  }

  return (
    <div className="diff-view">
      <div className="diff-view__header">
        <span className="diff-view__path">{file.newPath}</span>
        {file.isRename && (
          <span className="diff-view__rename">
            renamed from {file.oldPath}
          </span>
        )}
      </div>
      {file.hunks.length === 0 ? (
        <div className="diff-view__no-changes">
          {file.isRename
            ? "File renamed with no content changes"
            : "No content changes"}
        </div>
      ) : (
        file.hunks.map((hunk, hi) => (
          <div className="diff-hunk" key={hi}>
            <div className="diff-hunk__header">{hunk.header}</div>
            {hunk.lines.map((line, li) => {
              const lineNum = line.newLineNumber ?? line.oldLineNumber;
              const bugs = lineNum ? (bugsByLine.get(lineNum) ?? []) : [];
              return (
                <div key={li}>
                  <div className={`diff-line diff-line--${line.type}`}>
                    <span className="diff-line__old">
                      {line.oldLineNumber ?? ""}
                    </span>
                    <span className="diff-line__new">
                      {line.newLineNumber ?? ""}
                    </span>
                    <span className="diff-line__marker">
                      {line.type === "add"
                        ? "+"
                        : line.type === "delete"
                          ? "-"
                          : " "}
                    </span>
                    <span className="diff-line__content">{line.content}</span>
                  </div>
                  {bugs.map((bug, bi) => (
                    <div
                      key={bi}
                      className={`bug-annotation bug-annotation--${bug.severity}`}
                    >
                      <span className="bug-annotation__severity">
                        {bug.severity.toUpperCase()}
                      </span>
                      <span className="bug-annotation__message">
                        {bug.message}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))
      )}
    </div>
  );
}
