export interface DiffLine {
  type: "add" | "delete" | "context";
  content: string;
  oldLineNumber: number | null;
  newLineNumber: number | null;
}

export interface DiffHunk {
  header: string;
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  lines: DiffLine[];
}

export interface DiffFile {
  oldPath: string;
  newPath: string;
  hunks: DiffHunk[];
  isRename: boolean;
  isNew: boolean;
  isDeleted: boolean;
  similarityIndex: number | null;
}

export interface ReviewSummary {
  summary: string;
  risks: RiskItem[];
}

export interface RiskItem {
  severity: "high" | "medium" | "low";
  description: string;
  file: string;
}

export interface ChangeGroup {
  name: string;
  description: string;
  files: string[];
  order: number;
}

export interface BugFinding {
  severity: "high" | "medium" | "low";
  file: string;
  line: number;
  message: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
