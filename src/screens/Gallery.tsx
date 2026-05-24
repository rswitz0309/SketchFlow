import { useEffect, useState } from 'react';
import type { ProjectSummary } from '../types';
import { createProject, deleteProject, listProjectSummaries } from '../lib/storage';
import ProjectCard from '../gallery/ProjectCard';
import NewProjectButton from '../gallery/NewProjectButton';
import './Gallery.css';

export interface GalleryProps {
  onOpenProject: (projectId: string, screen: 'canvas' | 'timeline') => void;
}

export default function Gallery({ onOpenProject }: GalleryProps) {
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setError(null);
      const data = await listProjectSummaries();
      setProjects(data);
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
    setProjects((prev) => (prev ?? []).filter((p) => p.id !== id));
  }

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
        {projects === null && !error
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="sf-gallery__skeleton" />
            ))
          : (projects ?? []).map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                onOpen={() => onOpenProject(p.id, 'canvas')}
                onOpenTimeline={() => onOpenProject(p.id, 'timeline')}
                onDelete={() => void handleDelete(p.id)}
              />
            ))}
      </div>
    </div>
  );
}
