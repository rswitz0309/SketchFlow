import { useEffect, useState } from 'react';
import type { GalleryLayout } from '../lib/storage';
import {
  createProject,
  deleteProject,
  listGalleryLayout,
} from '../lib/storage';
import ProjectCard from '../gallery/ProjectCard';
import ProjectFolder from '../gallery/ProjectFolder';
import NewProjectButton from '../gallery/NewProjectButton';
import './Gallery.css';

export interface GalleryProps {
  onOpenProject: (projectId: string, screen: 'canvas' | 'timeline') => void;
  onOpenFamilyMap: (rootProjectId: string) => void;
}

export default function Gallery({ onOpenProject, onOpenFamilyMap }: GalleryProps) {
  const [layout, setLayout] = useState<GalleryLayout | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setError(null);
      const data = await listGalleryLayout();
      setLayout(data);
    } catch (e: unknown) {
      console.error(e);
      setError(
        e instanceof Error ? e.message : 'Could not load your sketches.',
      );
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleCreate(title: string) {
    const project = await createProject(title);
    onOpenProject(project.id, 'canvas');
  }

  async function handleDelete(id: string) {
    await deleteProject(id);
    await load();
  }

  const loading = layout === null && !error;

  return (
    <div className="sf-gallery">
      <header className="sf-gallery__header">
        <div className="sf-gallery__heading">
          <span className="sf-gallery__eyebrow">Gallery</span>
          <h1 className="sf-gallery__title">Your sketches</h1>
        </div>
        <p className="sf-gallery__subtitle">
          A sketchbook that remembers every version of itself.
        </p>
      </header>

      {error && (
        <div className="sf-gallery__error">
          {error}
          <button className="sf-btn sf-btn--ghost" onClick={() => void load()}>
            Try again
          </button>
        </div>
      )}

      <div className="sf-gallery__grid">
        <NewProjectButton onCreate={handleCreate} />
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="sf-gallery__skeleton" />
            ))
          : (
            <>
              {(layout?.standalone ?? []).map((p) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  onOpen={() => onOpenProject(p.id, 'canvas')}
                  onOpenTimeline={() => onOpenProject(p.id, 'timeline')}
                  onDelete={() => void handleDelete(p.id)}
                />
              ))}
              {(layout?.folders ?? []).map((folder) => (
                <ProjectFolder
                  key={folder.root.id}
                  folder={folder}
                  onOpen={(id) => onOpenProject(id, 'canvas')}
                  onOpenTimeline={(id) => onOpenProject(id, 'timeline')}
                  onOpenFamilyMap={() => onOpenFamilyMap(folder.root.id)}
                  onDelete={(id) => void handleDelete(id)}
                />
              ))}
            </>
          )}
      </div>
    </div>
  );
}
