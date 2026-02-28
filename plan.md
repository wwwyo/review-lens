# Review Lens - 開発方針

## 何を作るか

Devin Review的なAIコードレビューデスクトップアプリ。ローカルで動作し、Claude Code CLIをサブスクリプション（Claude Max等）で利用してAPIコストを回避する。

## なぜ作るか

- GitHub PRのdiffビューは読みにくい（ファイルがアルファベット順、コンテキスト不足）
- 既存のAIレビューツールは「AIがレビューする」設計。人間のレビュー体験を最大化するものがない
- クラウドAI APIのコスト問題 → Claude Code CLIサブスクで解決

## 技術選定

| 項目 | 選定 | 理由 |
|------|------|------|
| アプリ基盤 | **Tauri v2** | 軽量(3-10MB)、安定、システムトレイ/通知対応。Electronは重すぎる。Electrobunはv1出たばかりで見送り |
| フロントエンド | **React + TypeScript** | diff UIの自由度、エコシステム |
| UI | **shadcn/ui** | カスタマイズ性、diffビューアの自作に適する |
| AI | **Claude Code CLI** | `claude -p --output-format json` でサブスク定額利用 |
| GitHub | **gh CLI** | PR diff取得、コメント投稿 |
| diff解析 | **diff2html + カスタム** | 生diff→構造化データ変換 |

### VSCode拡張を不採用にした理由

- セマンティックdiff: VSCode組み込みdiffビューアはカスタマイズ不可
- チャットUI: WebViewで可能だがエディタ体験を失う
- 常時Watch: VSCode非起動時に動かない

## アーキテクチャ

```
[Tauri Desktop App]
├── Frontend (React + TypeScript)
│   ├── PR選択 → diff表示 → レビュー → コメント投稿
│   └── shadcn/ui ベースのカスタムdiffビューア
│
├── Tauri Commands (TS ↔ Rust ブリッジ)
│   ├── get_pr_diff(pr_number) → DiffData
│   ├── get_local_diff(staged) → DiffData
│   ├── analyze_diff(diff) → ReviewResult
│   ├── chat(context, message) → ChatResponse
│   └── post_comment(pr, comments) → Result
│
└── Rust Backend
    ├── CLI wrappers (claude, gh, git)
    ├── diff parser
    └── system tray / notifications
```

## フェーズ計画

### Phase 1: 基本ビューア（MVP）

**ゴール**: PRのdiffを取得して表示し、AIサマリを生成する

- [ ] Tauri v2 + React プロジェクト初期化
- [ ] `gh pr diff` でdiff取得 → Rustでパース → フロントに返却
- [ ] ファイル一覧 + unified diff表示UI
- [ ] `claude -p` でサマリ生成（変更概要、リスク分析）
- [ ] サマリ表示パネル

### Phase 2: セマンティック機能

**ゴール**: AIが変更を論理的にグルーピングし、バグ検出を行う

- [ ] 変更の論理グルーピング（Claude CLIで推論、ファイル横断）
- [ ] バグ検出インライン表示（赤: 高リスク / 黄: 注意 / 灰: 情報）
- [ ] 読む順番の提案（変更ストーリー）
- [ ] リネーム/移動検出

### Phase 3: インタラクション

**ゴール**: レビュー中の対話とGitHub連携

- [ ] ファイル/変更単位のインラインチャット
- [ ] GitHubへのコメント投稿（個別/一括）
- [ ] レビュー進捗トラッキング（どのファイルを見たか）

### Future

- 常時Watch: システムトレイ常駐、assignされたPRを自動検知・通知
- Context Explorer: 変更行の周辺の型定義・呼び出し元を展開
- マルチリポ対応

## Claude Code CLIの利用パターン

```bash
# サマリ + バグ検出（非対話）
echo "$DIFF" | claude -p --output-format json \
  "このdiffを解析して以下のJSON形式で返して:
   {
     summary: string,
     groups: [{ title: string, files: string[], description: string }],
     bugs: [{ severity: 'high'|'medium'|'low', file: string, line: number, message: string }],
     readingOrder: string[]
   }"

# インラインチャット（セッション維持）
claude -p --session-id $SESSION \
  "この変更の意図を推測して"
```

## 未解決の課題

- [ ] Claude CLI出力のJSONスキーマ定義（型安全性）
- [ ] 大規模PR（1000行+）の分割戦略
- [ ] diffビューアのコンポーネント設計（diff2html利用 vs フルカスタム）
- [ ] 大量diff描画時のWebViewパフォーマンス（仮想スクロール等）
- [ ] セマンティックグルーピングのプロンプト精度
- [ ] レビュー進捗の永続化（SQLite vs JSON file）
- [ ] Claude CLIのセッション管理（チャット継続のAPI設計）
