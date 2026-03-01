# review-lens

AI-powered code review desktop app. ローカルで動くDevin Review的なレビュー体験を提供する。

## Getting Started

### 前提条件

- [mise](https://mise.jdx.dev/)
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) (サブスクリプション)
- [gh CLI](https://cli.github.com/)

`node`, `pnpm`, `rust` は `mise.toml` で固定している。Tauri CLI は project の devDependency を使う。

### 起動

```bash
mise install
pnpm install
pnpm tauri dev
```
