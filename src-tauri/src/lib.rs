use std::io::Write;
use std::process::{Command, Stdio};

fn run_gh(args: &[&str]) -> Result<String, String> {
    let output = Command::new("gh")
        .args(args)
        .output()
        .map_err(|e| format!("Failed to run gh: {e}"))?;
    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr)
            .to_string()
            .trim()
            .to_string())
    }
}

fn run_claude(prompt: &str) -> Result<String, String> {
    let mut child = Command::new("claude")
        .args(["-p", "--output-format", "json"])
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start claude: {e}"))?;

    if let Some(mut stdin) = child.stdin.take() {
        stdin
            .write_all(prompt.as_bytes())
            .map_err(|e| format!("Failed to write prompt: {e}"))?;
    }

    let output = child
        .wait_with_output()
        .map_err(|e| format!("Claude process error: {e}"))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr)
            .to_string()
            .trim()
            .to_string());
    }

    let json: serde_json::Value = serde_json::from_slice(&output.stdout)
        .map_err(|e| format!("Failed to parse claude output: {e}"))?;

    json.get("result")
        .and_then(|v| v.as_str())
        .map(String::from)
        .ok_or_else(|| "No result in claude output".to_string())
}

#[tauri::command]
fn fetch_pr_diff(pr_number: String, repo: Option<String>) -> Result<String, String> {
    match repo {
        Some(r) => run_gh(&["pr", "diff", &pr_number, "--repo", &r]),
        None => run_gh(&["pr", "diff", &pr_number]),
    }
}

#[tauri::command]
fn generate_review_summary(diff: String) -> Result<String, String> {
    let prompt = format!(
        r#"Analyze this code diff and return a JSON object with exactly this structure:
{{
  "summary": "Brief overview of all changes",
  "risks": [
    {{"severity": "high|medium|low", "description": "Risk description", "file": "filename"}}
  ]
}}

Return ONLY valid JSON. No markdown fences, no explanation.

Diff:
{diff}"#
    );
    run_claude(&prompt)
}

#[tauri::command]
fn generate_change_groups(diff: String) -> Result<String, String> {
    let prompt = format!(
        r#"Analyze this code diff and group related changes logically. Return a JSON array:
[
  {{
    "name": "Group name",
    "description": "What this group of changes does",
    "files": ["file1.ts", "file2.ts"],
    "order": 1
  }}
]

The "order" field indicates recommended reading order (1 = read first).
Return ONLY valid JSON. No markdown fences, no explanation.

Diff:
{diff}"#
    );
    run_claude(&prompt)
}

#[tauri::command]
fn detect_bugs(diff: String) -> Result<String, String> {
    let prompt = format!(
        r#"Analyze this code diff for potential bugs, security issues, and code quality concerns. Return a JSON array:
[
  {{
    "severity": "high|medium|low",
    "file": "filename",
    "line": 42,
    "message": "Description of the issue"
  }}
]

The "line" field should reference the new file line number. Return ONLY valid JSON. No markdown fences. Return [] if no issues.

Diff:
{diff}"#
    );
    run_claude(&prompt)
}

#[tauri::command]
fn chat_with_context(context: String, messages: String) -> Result<String, String> {
    let prompt = format!(
        r#"You are a code review assistant. Here is the code context:

{context}

Conversation:
{messages}

Provide a helpful, concise response about the code."#
    );
    run_claude(&prompt)
}

#[tauri::command]
fn post_pr_comment(pr_number: String, body: String, repo: Option<String>) -> Result<(), String> {
    match repo {
        Some(r) => run_gh(&["pr", "comment", &pr_number, "--body", &body, "--repo", &r]),
        None => run_gh(&["pr", "comment", &pr_number, "--body", &body]),
    }?;
    Ok(())
}

#[tauri::command]
fn post_review_comments(
    pr_number: String,
    comments: String,
    repo: Option<String>,
) -> Result<(), String> {
    let parsed: Vec<serde_json::Value> =
        serde_json::from_str(&comments).map_err(|e| format!("Invalid comments JSON: {e}"))?;

    let sha = get_pr_head_sha(pr_number.clone(), repo.clone())?;
    let repo_name = match repo {
        Some(r) => r,
        None => run_gh(&[
            "repo",
            "view",
            "--json",
            "nameWithOwner",
            "-q",
            ".nameWithOwner",
        ])?
        .trim()
        .to_string(),
    };

    let endpoint = format!("repos/{repo_name}/pulls/{pr_number}/comments");

    for comment in &parsed {
        let path = comment["path"].as_str().ok_or("Missing path")?;
        let line = comment["line"].as_u64().ok_or("Missing line")?;
        let body = comment["body"].as_str().ok_or("Missing body")?;

        let json_body = serde_json::json!({
            "body": body,
            "path": path,
            "line": line,
            "side": "RIGHT",
            "commit_id": sha,
        });

        let mut child = Command::new("gh")
            .args(["api", &endpoint, "--method", "POST", "--input", "-"])
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to start gh: {e}"))?;

        if let Some(mut stdin) = child.stdin.take() {
            stdin
                .write_all(json_body.to_string().as_bytes())
                .map_err(|e| format!("Failed to write to gh: {e}"))?;
        }

        let output = child
            .wait_with_output()
            .map_err(|e| format!("gh process error: {e}"))?;

        if !output.status.success() {
            return Err(String::from_utf8_lossy(&output.stderr)
                .to_string()
                .trim()
                .to_string());
        }
    }

    Ok(())
}

#[tauri::command]
fn get_pr_head_sha(pr_number: String, repo: Option<String>) -> Result<String, String> {
    let result = match repo {
        Some(r) => run_gh(&[
            "pr",
            "view",
            &pr_number,
            "--json",
            "headRefOid",
            "-q",
            ".headRefOid",
            "--repo",
            &r,
        ]),
        None => run_gh(&[
            "pr",
            "view",
            &pr_number,
            "--json",
            "headRefOid",
            "-q",
            ".headRefOid",
        ]),
    }?;
    Ok(result.trim().to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            fetch_pr_diff,
            generate_review_summary,
            generate_change_groups,
            detect_bugs,
            chat_with_context,
            post_pr_comment,
            post_review_comments,
            get_pr_head_sha,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
