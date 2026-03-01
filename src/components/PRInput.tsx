import { useState } from "react";

interface PRInputProps {
  onLoad: (prNumber: string, repo: string) => void;
  loading: boolean;
}

export function PRInput({ onLoad, loading }: PRInputProps) {
  const [prNumber, setPrNumber] = useState("");
  const [repo, setRepo] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prNumber.trim()) {
      onLoad(prNumber.trim(), repo.trim());
    }
  };

  return (
    <form className="pr-input" onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="owner/repo (optional)"
        value={repo}
        onChange={(e) => setRepo(e.target.value)}
        className="pr-input__field pr-input__repo"
      />
      <input
        type="text"
        placeholder="PR # or URL"
        value={prNumber}
        onChange={(e) => setPrNumber(e.target.value)}
        className="pr-input__field pr-input__number"
      />
      <button
        type="submit"
        disabled={loading || !prNumber.trim()}
        className="btn btn--primary"
      >
        {loading ? "Loading…" : "Load PR"}
      </button>
    </form>
  );
}
