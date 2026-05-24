import type { ProjectBranch } from '../types';
import './BranchFork.css';

export interface BranchForkProps {
  branches: ProjectBranch[];
  onOpenBranch: (branchProjectId: string) => void;
}

export default function BranchFork({ branches, onOpenBranch }: BranchForkProps) {
  if (branches.length === 0) return null;

  return (
    <div className="sf-branch-fork" aria-label="Variant branches">
      <svg
        className="sf-branch-fork__arrow"
        viewBox="0 0 48 56"
        fill="none"
        aria-hidden
      >
        <path
          d="M8 4 C8 28, 12 40, 40 52"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M32 52 L40 52 L40 44"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="sf-branch-fork__list">
        {branches.map((b) => (
          <button
            key={b.id}
            type="button"
            className="sf-branch-fork__btn"
            onClick={(e) => {
              e.stopPropagation();
              onOpenBranch(b.id);
            }}
            title={b.title}
          >
            {b.latestThumbnailDataUrl ? (
              <img src={b.latestThumbnailDataUrl} alt="" className="sf-branch-fork__thumb" />
            ) : (
              <span className="sf-branch-fork__thumb sf-branch-fork__thumb--empty" />
            )}
            <span className="sf-branch-fork__label">Open variant</span>
          </button>
        ))}
      </div>
    </div>
  );
}
