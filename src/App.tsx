import "./App.css";

const focusAreas = [
  {
    title: "Readable diff flow",
    body: "ファイル一覧、文脈付き diff、レビュー順の提案を一画面で扱える前提を作る。",
  },
  {
    title: "Local-first analysis",
    body: "Claude Code CLI を前提に、外部 API コストなしで要約と懸念抽出へつなげる。",
  },
  {
    title: "Desktop delivery",
    body: "Tauri v2 と React/TypeScript を土台に、軽い配布物と素直な開発体験を両立する。",
  },
];

const milestoneChecklist = [
  "Tauri v2 + React/TypeScript の開発基盤を作る",
  "PR diff を取得して構造化データへ変換する",
  "AI 要約とリスク表示をレビュー画面へ統合する",
];

function App() {
  return (
    <main className="app-shell">
      <section className="hero">
        <p className="eyebrow">Review Lens</p>
        <h1>AI-assisted code review, tuned for human judgment.</h1>
        <p className="lede">
          ローカルで PR diff を読み解き、Claude Code CLI の要約と対話を重ねて、 GitHub
          より筋の良いレビュー体験へ寄せる。
        </p>
        <div className="hero-actions">
          <span className="pill">Tauri v2</span>
          <span className="pill">React + TypeScript</span>
          <span className="pill">Claude Code CLI</span>
        </div>
      </section>

      <section className="panel-grid">
        {focusAreas.map((item) => (
          <article className="panel" key={item.title}>
            <p className="panel-kicker">{item.title}</p>
            <p className="panel-body">{item.body}</p>
          </article>
        ))}
      </section>

      <section className="roadmap">
        <div>
          <p className="section-label">Current phase</p>
          <h2>MVP foundation</h2>
        </div>
        <ol className="milestones">
          {milestoneChecklist.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </section>
    </main>
  );
}

export default App;
