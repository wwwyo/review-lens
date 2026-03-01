import type { DiffFile, DiffHunk, DiffLine } from "../types";

export function parseDiff(raw: string): DiffFile[] {
  const files: DiffFile[] = [];
  const sections = raw.split(/^diff --git /m).filter(Boolean);

  for (const section of sections) {
    const lines = section.split("\n");
    const headerMatch = lines[0]?.match(/a\/(.+?) b\/(.+)/);
    if (!headerMatch) continue;

    const oldPath = headerMatch[1];
    const newPath = headerMatch[2];
    let isRename = false;
    let isNew = false;
    let isDeleted = false;
    let similarityIndex: number | null = null;

    let idx = 1;
    while (
      idx < lines.length &&
      !lines[idx].startsWith("---") &&
      !lines[idx].startsWith("@@")
    ) {
      const line = lines[idx];
      if (line.startsWith("rename from") || line.startsWith("rename to")) {
        isRename = true;
      }
      const simMatch = line.match(/^similarity index (\d+)%/);
      if (simMatch) {
        similarityIndex = parseInt(simMatch[1]);
      }
      if (line.startsWith("new file mode")) {
        isNew = true;
      }
      if (line.startsWith("deleted file mode")) {
        isDeleted = true;
      }
      idx++;
    }

    // Skip --- and +++ lines
    while (
      idx < lines.length &&
      (lines[idx].startsWith("---") || lines[idx].startsWith("+++"))
    ) {
      idx++;
    }

    const hunks: DiffHunk[] = [];

    while (idx < lines.length) {
      const hunkMatch = lines[idx].match(
        /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)/,
      );
      if (!hunkMatch) {
        idx++;
        continue;
      }

      const hunk: DiffHunk = {
        header: lines[idx],
        oldStart: parseInt(hunkMatch[1]),
        oldCount: parseInt(hunkMatch[2] ?? "1"),
        newStart: parseInt(hunkMatch[3]),
        newCount: parseInt(hunkMatch[4] ?? "1"),
        lines: [],
      };
      hunks.push(hunk);

      let oldLine = hunk.oldStart;
      let newLine = hunk.newStart;
      idx++;

      while (idx < lines.length && !lines[idx].startsWith("@@")) {
        const raw = lines[idx];
        if (raw.startsWith("+")) {
          hunk.lines.push(
            makeLine("add", raw.substring(1), null, newLine++),
          );
        } else if (raw.startsWith("-")) {
          hunk.lines.push(
            makeLine("delete", raw.substring(1), oldLine++, null),
          );
        } else if (raw.startsWith(" ") || raw === "") {
          hunk.lines.push(
            makeLine("context", raw.substring(1), oldLine++, newLine++),
          );
        } else {
          // Binary or no-newline marker — skip
          idx++;
          continue;
        }
        idx++;
      }
    }

    files.push({
      oldPath,
      newPath,
      hunks,
      isRename,
      isNew,
      isDeleted,
      similarityIndex,
    });
  }

  return files;
}

function makeLine(
  type: DiffLine["type"],
  content: string,
  oldLineNumber: number | null,
  newLineNumber: number | null,
): DiffLine {
  return { type, content, oldLineNumber, newLineNumber };
}
