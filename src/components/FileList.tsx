import type { DiffFile } from "../types";

interface FileListProps {
  files: DiffFile[];
  selectedFile: string | null;
  onSelect: (path: string) => void;
  reviewProgress: Record<string, boolean>;
  onToggleReviewed: (path: string) => void;
}

export function FileList({
  files,
  selectedFile,
  onSelect,
  reviewProgress,
  onToggleReviewed,
}: FileListProps) {
  const reviewed = Object.values(reviewProgress).filter(Boolean).length;
  const total = files.length;

  return (
    <div className="file-list">
      <div className="file-list__header">
        <span className="file-list__title">Files</span>
        <span className="file-list__progress">
          {reviewed}/{total}
        </span>
      </div>
      {total > 0 && (
        <div className="file-list__bar">
          <div
            className="file-list__bar-fill"
            style={{ width: `${total > 0 ? (reviewed / total) * 100 : 0}%` }}
          />
        </div>
      )}
      <ul className="file-list__items">
        {files.map((file) => {
          const path = file.newPath;
          const isSelected = path === selectedFile;
          const isReviewed = reviewProgress[path] ?? false;
          return (
            <li
              key={path}
              className={`file-item${isSelected ? " file-item--selected" : ""}${isReviewed ? " file-item--reviewed" : ""}`}
            >
              <label
                className="file-item__check"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="checkbox"
                  checked={isReviewed}
                  onChange={() => onToggleReviewed(path)}
                />
              </label>
              <button
                className="file-item__name"
                onClick={() => onSelect(path)}
              >
                {file.isRename && (
                  <span className="file-badge file-badge--rename">R</span>
                )}
                {file.isNew && (
                  <span className="file-badge file-badge--new">N</span>
                )}
                {file.isDeleted && (
                  <span className="file-badge file-badge--deleted">D</span>
                )}
                <span className="file-item__path">{path}</span>
                {file.isRename && file.oldPath !== file.newPath && (
                  <span className="file-item__rename-from">
                    ← {file.oldPath}
                  </span>
                )}
                {file.similarityIndex != null && (
                  <span className="file-item__similarity">
                    {file.similarityIndex}%
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
