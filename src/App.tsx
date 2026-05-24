import { useState } from 'react';
import Gallery from './screens/Gallery';
import Canvas from './screens/Canvas';
import Timeline from './screens/Timeline';
import FamilyGraph from './screens/FamilyGraph';
import './App.css';

type Route =
  | { screen: 'gallery' }
  | { screen: 'family'; rootProjectId: string }
  | { screen: 'canvas'; projectId: string }
  | { screen: 'timeline'; projectId: string };

export default function App() {
  const [route, setRoute] = useState<Route>({ screen: 'gallery' });

  function openProject(projectId: string, screen: 'canvas' | 'timeline') {
    setRoute({ screen, projectId });
  }

  function backToGallery() {
    setRoute({ screen: 'gallery' });
  }

  const screen = route.screen;
  const topbarScreen =
    screen === 'family' ? 'gallery' : screen;

  return (
    <div className="sf-app">
      <Topbar
        current={topbarScreen}
        onHome={backToGallery}
        onCanvas={
          screen === 'timeline'
            ? () => setRoute({ screen: 'canvas', projectId: route.projectId })
            : undefined
        }
        onTimeline={
          screen === 'canvas'
            ? () => setRoute({ screen: 'timeline', projectId: route.projectId })
            : undefined
        }
      />

      <main className="sf-app__main">
        {screen === 'gallery' && (
          <Gallery
            onOpenProject={openProject}
            onOpenFamilyMap={(rootProjectId) =>
              setRoute({ screen: 'family', rootProjectId })
            }
          />
        )}
        {screen === 'family' && (
          <FamilyGraph
            key={route.rootProjectId}
            rootProjectId={route.rootProjectId}
            onBack={backToGallery}
            onOpenProject={openProject}
          />
        )}
        {screen === 'canvas' && (
          <Canvas
            key={route.projectId}
            projectId={route.projectId}
            onBack={backToGallery}
            onOpenTimeline={() =>
              setRoute({ screen: 'timeline', projectId: route.projectId })
            }
          />
        )}
        {screen === 'timeline' && (
          <Timeline
            key={route.projectId}
            projectId={route.projectId}
            onBack={backToGallery}
            onOpenCanvas={() =>
              setRoute({ screen: 'canvas', projectId: route.projectId })
            }
            onOpenBranch={(branchProjectId) =>
              setRoute({ screen: 'canvas', projectId: branchProjectId })
            }
            onRestore={() =>
              setRoute({ screen: 'canvas', projectId: route.projectId })
            }
          />
        )}
      </main>
    </div>
  );
}

interface TopbarProps {
  current: 'gallery' | 'canvas' | 'timeline';
  onHome: () => void;
  onCanvas?: () => void;
  onTimeline?: () => void;
}

function Topbar({ current, onHome, onCanvas, onTimeline }: TopbarProps) {
  return (
    <header className="sf-topbar">
      <button className="sf-topbar__brand" onClick={onHome} aria-label="Home">
        <span className="sf-topbar__mark" aria-hidden>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path
              d="M4 18l5-5 4 4 7-7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="sf-topbar__name">sketchflow</span>
      </button>
      <nav className="sf-topbar__tabs" aria-label="Workspace">
        <button
          className={`sf-topbar__tab ${current === 'gallery' ? 'is-active' : ''}`}
          onClick={onHome}
        >
          Gallery
        </button>
        <button
          className={`sf-topbar__tab ${current === 'canvas' ? 'is-active' : ''}`}
          onClick={onCanvas}
          disabled={!onCanvas && current !== 'canvas'}
        >
          Canvas
        </button>
        <button
          className={`sf-topbar__tab ${current === 'timeline' ? 'is-active' : ''}`}
          onClick={onTimeline}
          disabled={!onTimeline && current !== 'timeline'}
        >
          Timeline
        </button>
      </nav>
    </header>
  );
}
