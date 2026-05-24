/* GRAFT wireframes — top-level app with tab navigation.
   Each tab renders one "functional area" component containing 3 variation cards.
*/

const AREAS = [
  { id: "shell",   label: "App Shell",       blurb: "How the user moves between Diff, History, Merge and Component Memory, and switches branches/commits.", Comp: () => window.ShellArea() },
  { id: "diff",    label: "Diff View",       blurb: "The hero. Before / After / Diff overlay; legend for the four change types; change list with click-to-locate; commit pickers.", Comp: () => window.DiffArea(), hero: true },
  { id: "history", label: "History Graph",   blurb: "Commit graph with colored branch lanes, merge commits, click-for-preview, two-select for diff, and a merge action. NL search as stretch.", Comp: () => window.HistoryArea() },
  { id: "merge",   label: "Merge View",      blurb: "Three-way merge: theirs / base / mine. Auto-resolved changes settle; conflict list lets you pick per element with per-option preview and a manual escape hatch.", Comp: () => window.MergeArea() },
  { id: "memory",  label: "Component Memory",blurb: "Stretch. Obsidian-style node graph of components used across the project, browseable and re-insertable.", Comp: () => window.MemoryArea() },
];

function App() {
  const [active, setActive] = React.useState("shell");
  const area = AREAS.find(a => a.id === active);

  return (
    <div>
      <div className="tabs">
        {AREAS.map((a, i) => (
          <div key={a.id}
            className={`tab ${active === a.id ? "active" : ""} ${a.hero ? "hero" : ""}`}
            onClick={() => setActive(a.id)}
            data-screen-label={`${String(i+1).padStart(2,'0')} ${a.label}`}>
            <span className="num">{String(i+1).padStart(2,'0')}</span>
            {a.label}
          </div>
        ))}
      </div>
      <div className="area-rule" />
      <div className="area" data-screen-label={`area-${area.id}`}>
        <div className="area-head">
          <div className="area-title">{area.label}</div>
          <div className="area-blurb">{area.blurb}</div>
        </div>
        {area.Comp()}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
