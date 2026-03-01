import { invoke } from "@tauri-apps/api/core";
import type {
  ReviewSummary,
  ChangeGroup,
  BugFinding,
} from "../types";

function parseClaudeJson<T>(text: string): T {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }
  return JSON.parse(cleaned) as T;
}

export async function fetchPrDiff(
  prNumber: string,
  repo?: string,
): Promise<string> {
  return invoke<string>("fetch_pr_diff", {
    pr_number: prNumber,
    repo: repo || null,
  });
}

export async function generateSummary(
  diff: string,
): Promise<ReviewSummary> {
  const result = await invoke<string>("generate_review_summary", { diff });
  return parseClaudeJson<ReviewSummary>(result);
}

export async function generateChangeGroups(
  diff: string,
): Promise<ChangeGroup[]> {
  const result = await invoke<string>("generate_change_groups", { diff });
  return parseClaudeJson<ChangeGroup[]>(result);
}

export async function detectBugs(diff: string): Promise<BugFinding[]> {
  const result = await invoke<string>("detect_bugs", { diff });
  return parseClaudeJson<BugFinding[]>(result);
}

export async function chatWithContext(
  context: string,
  messagesJson: string,
): Promise<string> {
  return invoke<string>("chat_with_context", {
    context,
    messages: messagesJson,
  });
}

export async function postPrComment(
  prNumber: string,
  body: string,
  repo?: string,
): Promise<void> {
  await invoke<void>("post_pr_comment", {
    pr_number: prNumber,
    body,
    repo: repo || null,
  });
}

export async function postReviewComments(
  prNumber: string,
  comments: Array<{ path: string; line: number; body: string }>,
  repo?: string,
): Promise<void> {
  await invoke<void>("post_review_comments", {
    pr_number: prNumber,
    comments: JSON.stringify(comments),
    repo: repo || null,
  });
}
