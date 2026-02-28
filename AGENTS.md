# review-lens

Devin Review的なAIコードレビュー体験をローカルで実現するデスクトップアプリ。Claude Code CLIをサブスクリプションで利用し、APIコストを回避する。

## ディレクトリ構造

```
review-lens/
├── src/              # React フロントエンド
├── src-tauri/        # Rust バックエンド (Tauri v2)
├── AGENTS.md
├── CLAUDE.md
└── plan.md           # 開発方針・フェーズ計画
```

## セットアップ

```bash
# 前提: Node.js, Rust, Tauri CLI
pnpm install
pnpm tauri dev
```

## 技術スタック

- **フレームワーク**: Tauri v2
- **フロントエンド**: React + TypeScript
- **UIコンポーネント**: shadcn/ui
- **バックエンド**: Rust (subprocess管理中心)
- **AI**: Claude Code CLI (`claude -p`)
- **GitHub連携**: gh CLI

## コミュニケーション方針

- 忖度しない。問題点やリスクがあれば率直に指摘する
- コメントは「なぜ」を説明する場合にのみ書く
