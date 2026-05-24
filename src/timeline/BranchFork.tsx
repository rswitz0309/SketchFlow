import type { ProjectBranch } from '../types';
import './BranchFork.css';

export interface BranchForkProps {
  branches: ProjectBranch[];
  onOpenBranch: (branchProjectId: string) => void;
}

/** Compact “Open variant” control for inside sketch / checkpoint cards. */
export function VariantOpenInline({ branches, onOpenBranch }: BranchForkProps) {
  if (branches.length === 0) return null;

  const primary = branches[0];
  const title =
    branches.length > 1
      ? branches.map((b) => b.title).join('\n')
      : primary.title;

  return (
    <button
      type="button"
      className="sf-variant-inline__btn"
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        onOpenBranch(primary.id);
      }}
    >
      Open variant
      {branches.length > 1 ? (
        <span className="sf-variant-inline__count"> ({branches.length})</span>
      ) : null}
    </button>
  );
}

/** Legacy fork graphic below strip cards (unused in strip — kept for reference). */
export default function BranchFork({ branches, onOpenBranch }: BranchForkProps) {
  if (branches.length === 0) return null;

  return (
    <div className="sf-branch-fork" aria-label="Variant branches">
      <svg className="sf-branch-fork__arrow" viewBox="0 0 48 56" fill="none" aria-hidden>
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
