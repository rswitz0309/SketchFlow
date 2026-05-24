import { useEffect, useRef, useState } from 'react';
import type { ProjectSummary } from '../types';
import { relativeTime } from '../lib/time';
import './ProjectCard.css';

export interface ProjectCardProps {
  project: ProjectSummary;
  onOpen: () => void;
  onOpenTimeline: () => void;
  onDelete: () => void;
}

export default function ProjectCard({
  project,
  onOpen,
  onOpenTimeline,
  onDelete,
}: ProjectCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setConfirming(false);
      }
    }
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [menuOpen]);

  const countLabel =
    project.checkpointCount === 0
      ? 'No saved versions yet'
      : `${project.checkpointCount} saved version${
          project.checkpointCount === 1 ? '' : 's'
        }`;

  return (
    <article className="sf-card sf-pcard" onClick={onOpen}>
      <div className="sf-pcard__thumb">
        {project.latestThumbnailDataUrl ? (
          <img src={project.latestThumbnailDataUrl} alt="" />
        ) : (
          <div className="sf-pcard__thumb-empty">
            <svg width="42" height="42" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 18l5-5 4 4 7-7M4 6h16v12H4z"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.4"
              />
            </svg>
            <span>Empty canvas</span>
          </div>
        )}
      </div>
      <div className="sf-pcard__body">
        <div className="sf-pcard__title-row">
          <h3 className="sf-pcard__title">{project.title}</h3>
          <div
            className="sf-pcard__menu"
            ref={menuRef}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="sf-pcard__menu-btn"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Project actions"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="5" cy="12" r="1.6" />
                <circle cx="12" cy="12" r="1.6" />
                <circle cx="19" cy="12" r="1.6" />
              </svg>
            </button>
            {menuOpen && (
              <div className="sf-pcard__menu-popover" role="menu">
                <button
                  className="sf-pcard__menu-item"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenTimeline();
                  }}
                >
                  Your timeline
                </button>
                {!confirming ? (
                  <button
                    className="sf-pcard__menu-item sf-pcard__menu-item--danger"
                    onClick={() => setConfirming(true)}
                  >
                    Delete project
                  </button>
                ) : (
                  <button
                    className="sf-pcard__menu-item sf-pcard__menu-item--danger"
                    onClick={() => {
                      setMenuOpen(false);
                      setConfirming(false);
                      onDelete();
                    }}
                  >
                    Tap again to confirm
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="sf-pcard__meta">
          <span>{countLabel}</span>
          <span className="sf-pcard__dot" aria-hidden>·</span>
          <span>Edited {relativeTime(project.updatedAt)}</span>
        </div>
      </div>
    </article>
  );
}
