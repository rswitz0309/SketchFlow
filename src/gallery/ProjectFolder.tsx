import { useState } from 'react';
import type { GalleryFolder, ProjectSummary } from '../types';
import ProjectCard from './ProjectCard';
import './ProjectFolder.css';

export interface ProjectFolderProps {
  folder: GalleryFolder;
  onOpen: (projectId: string) => void;
  onOpenTimeline: (projectId: string) => void;
  onOpenFamilyMap: () => void;
  onDelete: (projectId: string) => void;
}

export default function ProjectFolder({
  folder,
  onOpen,
  onOpenTimeline,
  onOpenFamilyMap,
  onDelete,
}: ProjectFolderProps) {
  const [open, setOpen] = useState(true);
  const total = 1 + folder.variants.length;
  const hasVariants = folder.variants.length > 0;

  return (
    <section className="sf-folder" aria-label={`${folder.root.title} and variants`}>
      <div className="sf-folder__header">
        <button
          type="button"
          className="sf-folder__toggle"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
        >
          <span className="sf-folder__icon" aria-hidden>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M3 7a2 2 0 012-2h5l2 2h9a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="sf-folder__title">{folder.root.title}</span>
          <span className="sf-folder__count">
            {total} sketch{total === 1 ? '' : 'es'}
          </span>
          <span className={`sf-folder__chev ${open ? 'is-open' : ''}`} aria-hidden>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 9l6 6 6-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </span>
        </button>
        {hasVariants && (
          <button
            type="button"
            className="sf-folder__map-btn"
            onClick={onOpenFamilyMap}
          >
            Family map
          </button>
        )}
      </div>
      {open && (
        <div className="sf-folder__grid">
          <ProjectCard
            project={folder.root}
            badge="Main"
            onOpen={() => onOpen(folder.root.id)}
            onOpenTimeline={() => onOpenTimeline(folder.root.id)}
            onDelete={() => onDelete(folder.root.id)}
          />
          {folder.variants.map((v: ProjectSummary) => (
            <ProjectCard
              key={v.id}
              project={v}
              badge="Variant"
              onOpen={() => onOpen(v.id)}
              onOpenTimeline={() => onOpenTimeline(v.id)}
              onDelete={() => onDelete(v.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
