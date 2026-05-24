/* App shell with top tabs + cross-screen navigation.
   Exposes `goTo(tabId, context)` so a screen can hand off (e.g. History → Memory). */

// Comp must be the component itself (not a wrapper that calls it),
// so React tracks each screen's hooks independently.
const AREAS = [
  { id: "shell",   label: "Sketch",        Comp: () => window.ShellScreen },
  { id: "history", label: "History",       Comp: () => window.HistoryScreen },
  { id: "pr",      label: "Pull Requests", Comp: () => window.PRScreen },
];

const AREA_BLURB = {
  shell:   <><b>The canvas.</b> Draw, ink, paint — whatever your medium. Every save is a commit; the rest of git lives in the left rail.</>,
  history: <><b>Branches and commits.</b> Pick a branch on the left, scan its commits on the right. Tick two commits to compare before and after, in place.</>,
  pr:      <><b>Collaboration.</b> Open a pull request to the project owner. When a PR has conflicts, the resolver lives right inside it — only the owner can apply a fix.</>,
};

function TabsBar({ active, onChange }) {
  return (
    <div className="tabs">
      {AREAS.map(a => (
        <button key={a.id}
          className={`tab ${active === a.id ? "active" : ""}`}
          onClick={() => onChange(a.id)}
          data-screen-label={`${a.label}`}>
          {a.label}
        </button>
      ))}
    </div>
  );
}

function App() {
  const [active, setActive] = React.useState("shell");
  // Context passed across screens (e.g. selected commit from History → Memory)
  const [context, setContext] = React.useState({ commit: null, component: null });

  function goTo(tabId, ctx = {}) {
    setContext(c => ({ ...c, ...ctx }));
    setActive(tabId);
    // scroll to top of area
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Render tabs into the topbar slot
  React.useEffect(() => {
    const mount = document.getElementById("tabs-mount");
    if (!mount._root) {
      mount._root = ReactDOM.createRoot(mount);
    }
    mount._root.render(<TabsBar active={active} onChange={setActive} />);
  }, [active]);

  const area = AREAS.find(a => a.id === active);
  const ScreenComp = area.Comp();
  return (
    <div className="area" data-screen-label={`screen-${area.id}`}>
      <div className="area-head">
        <div className="area-title">{area.label}</div>
        <div className="area-blurb">{AREA_BLURB[area.id]}</div>
      </div>
      {ScreenComp ? <ScreenComp key={area.id} goTo={goTo} context={context} /> : null}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
