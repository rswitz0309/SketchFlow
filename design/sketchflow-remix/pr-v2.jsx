/* Pull Requests — collaboration with the project owner.
   Two views: the list, and a focused PR detail. */

const PRS = [
  {
    id: 12,
    title: "Add sunset gradient + relocate tree",
    branch: "feat/sunset",
    base: "main",
    author: "jane",
    when: "2d ago",
    state: "open",
    reviewState: "changes-requested",
    reviewer: "alex (owner)",
    commits: 3,
    changes: 4,
    conflicts: 1,
    comments: 4,
    me: true, // I authored this
  },
  {
    id: 11,
    title: "Crescent moon — adjust curvature",
    branch: "fix/moon",
    base: "main",
    author: "alex",
    when: "4d ago",
    state: "open",
    reviewState: "awaiting-review",
    reviewer: "you",
    commits: 2,
    changes: 1,
    conflicts: 0,
    comments: 1,
    me: false,
  },
  {
    id: 10,
    title: "Reference grid for composition",
    branch: "exp/grid",
    base: "main",
    author: "sam",
    when: "6d ago",
    state: "open",
    reviewState: "awaiting-review",
    reviewer: "alex (owner)",
    commits: 1,
    changes: 1,
    conflicts: 1,
    comments: 0,
    me: false,
  },
  {
    id: 9,
    title: "Initial sky palette",
    branch: "feat/sky",
    base: "main",
    author: "kim",
    when: "9d ago",
    state: "merged",
    reviewState: "approved",
    reviewer: "alex (owner)",
    commits: 5,
    changes: 8,
    conflicts: 0,
    comments: 12,
    me: false,
  },
];

const REVIEW_THREADS = [
  {
    id: "t1",
    anchorEl: "#moon",
    author: "alex (owner)",
    when: "1d ago",
    body: "Love the position, but can the crescent be a touch thinner? Feels heavier than the rest of the scene.",
    status: "open",
    replies: [
      { author: "jane", when: "23h ago", body: "Good call — pushing a tweak shortly." },
    ],
  },
  {
    id: "t2",
    anchorEl: "#tree",
    author: "alex (owner)",
    when: "1d ago",
    body: "The move to the right reads better with the new horizon, nice.",
    status: "resolved",
    replies: [],
  },
];

function StateBadge({ state, reviewState }) {
  const map = {
    "open":              { label: "Open",              color: "#16a34a", bg: "rgba(22,163,74,0.10)" },
    "merged":            { label: "Merged",            color: "#7c3aed", bg: "rgba(124,58,237,0.10)" },
    "closed":            { label: "Closed",            color: "#71717a", bg: "#f4f4f5" },
    "approved":          { label: "Approved",          color: "#0d9488", bg: "rgba(13,148,136,0.10)" },
    "changes-requested": { label: "Changes requested", color: "#e11d48", bg: "rgba(225,29,72,0.10)" },
    "awaiting-review":   { label: "Awaiting review",   color: "#2563eb", bg: "rgba(37,99,235,0.10)" },
  };
  const s = map[reviewState || state] || map.open;
  return (
    <span className="mono" style={{
      display:"inline-flex", alignItems:"center", gap:6,
      padding:"2px 8px", fontSize:10.5,
      color: s.color, background: s.bg, borderRadius:999,
      fontWeight:500,
    }}>
      <span style={{width:6, height:6, borderRadius:"50%", background:s.color}}></span>
      {s.label}
    </span>
  );
}

function NewPRComposer({ onClose, goTo }) {
  const branches = ["main", "feat/sunset", "fix/moon", "exp/grid", "feat/sky", "fix/colors"];
  const [base, setBase] = React.useState("main");
  const [compare, setCompare] = React.useState("feat/sunset");
  const [title, setTitle] = React.useState("Add sunset gradient + relocate tree");
  const [desc, setDesc] = React.useState(
    "Adds the warm sunset gradient behind the horizon, and moves the tree to the right third so it doesn't fight the new lighting. Open to feedback on the moon — happy to rework if it feels heavy."
  );
  const [previewTab, setPreviewTab] = React.useState("overlay"); // before | after | overlay

  // Fake-detected change summary for this branch comparison
  const changes = [
    { kind:"add", el:"#moon",  note:"added" },
    { kind:"rem", el:"#sun",   note:"removed" },
    { kind:"mov", el:"#tree",  note:"moved x: 182 → 258" },
    { kind:"sty", el:"#house", note:"fill #fff → #e9cfa0" },
  ];
  const sameBranch = base === compare;
  const hasConflict = base === "main" && compare === "fix/moon"; // demo

  return (
    <main style={{display:"flex", flexDirection:"column"}}>
      {/* Composer header */}
      <div style={{padding:"18px 24px 14px", borderBottom:"1px solid var(--rule)", display:"flex", alignItems:"baseline", gap:10}}>
        <span style={{fontSize:20, fontWeight:600, letterSpacing:"-0.01em"}}>Open a pull request</span>
        <span className="mono" style={{fontSize:11.5, color:"var(--ink-3)", marginLeft:6}}>
          new · against owner alex
        </span>
        <span style={{marginLeft:"auto"}}>
          <button className="btn sm ghost" onClick={onClose}>✕ Cancel</button>
        </span>
      </div>

      {/* Branch pickers */}
      <div style={{padding:"16px 24px", borderBottom:"1px solid var(--rule)", display:"flex", alignItems:"center", gap:12, flexWrap:"wrap"}}>
        <span className="mono" style={{fontSize:11, color:"var(--ink-3)", letterSpacing:"0.06em", textTransform:"uppercase"}}>
          base
        </span>
        <select value={base} onChange={e => setBase(e.target.value)}
          style={{
            padding:"6px 10px", border:"1px solid var(--rule-strong)",
            borderRadius:5, background:"var(--surface-2)",
            fontFamily:"var(--mono)", fontSize:12, color:"var(--ink-2)",
          }}>
          {branches.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <span style={{color:"var(--ink-4)"}}>←</span>
        <span className="mono" style={{fontSize:11, color:"var(--ink-3)", letterSpacing:"0.06em", textTransform:"uppercase"}}>
          compare
        </span>
        <select value={compare} onChange={e => setCompare(e.target.value)}
          style={{
            padding:"6px 10px", border:"1px solid var(--accent)",
            borderRadius:5, background:"#eff5ff",
            fontFamily:"var(--mono)", fontSize:12, color:"var(--accent-2,#1d4ed8)",
          }}>
          {branches.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <span className="mono" style={{
          marginLeft:8, fontSize:11, color:"var(--ink-3)",
          padding:"4px 10px", border:"1px solid var(--rule)", borderRadius:999, background:"var(--surface-2)",
        }}>
          {sameBranch
            ? "no changes — base equals compare"
            : `${changes.length} changed elements · ${hasConflict ? "1 conflict" : "no conflicts"}`}
        </span>
      </div>

      {/* Title + description */}
      <div style={{padding:"18px 24px", borderBottom:"1px solid var(--rule)", display:"flex", flexDirection:"column", gap:14}}>
        <div>
          <div className="mono" style={{fontSize:10, letterSpacing:"0.06em", textTransform:"uppercase", color:"var(--ink-3)", marginBottom:6}}>
            Title
          </div>
          <input value={title} onChange={e => setTitle(e.target.value)}
            placeholder="A short summary"
            style={{
              width:"100%", padding:"10px 12px",
              border:"1px solid var(--rule-strong)", borderRadius:5,
              fontFamily:"var(--sans)", fontSize:14.5, fontWeight:500,
              background:"var(--surface)",
            }} />
        </div>
        <div>
          <div className="mono" style={{fontSize:10, letterSpacing:"0.06em", textTransform:"uppercase", color:"var(--ink-3)", marginBottom:6}}>
            Description
          </div>
          <textarea value={desc} onChange={e => setDesc(e.target.value)}
            placeholder="What changed, and why? Mention elements with #name to anchor reviewers."
            style={{
              width:"100%", minHeight:88, resize:"vertical",
              padding:"10px 12px",
              border:"1px solid var(--rule-strong)", borderRadius:5,
              fontFamily:"var(--sans)", fontSize:13.5, lineHeight:1.55,
              background:"var(--surface)",
            }} />
          <div className="mono" style={{fontSize:10.5, color:"var(--ink-3)", marginTop:4}}>
            Tip: drag a change from the right rail to attach an inline review thread.
          </div>
        </div>
      </div>

      {/* Preview — Before / After / Diff-overlay */}
      <div style={{padding:"18px 24px", borderBottom:"1px solid var(--rule)"}}>
        <div style={{display:"flex", alignItems:"center", marginBottom:12}}>
          <div className="mono" style={{fontSize:10, letterSpacing:"0.06em", textTransform:"uppercase", color:"var(--ink-3)"}}>
            Preview
          </div>
          <div style={{
            marginLeft:12, display:"inline-flex", gap:0,
            border:"1px solid var(--rule-strong)", borderRadius:5, overflow:"hidden",
          }}>
            {[
              { id:"before",  label:"Before" },
              { id:"after",   label:"After"  },
              { id:"overlay", label:"Diff overlay" },
            ].map(t => (
              <button key={t.id} onClick={() => setPreviewTab(t.id)}
                style={{
                  padding:"5px 12px", border:"none",
                  background: previewTab === t.id ? "var(--ink)" : "var(--surface)",
                  color: previewTab === t.id ? "#fff" : "var(--ink-2)",
                  fontFamily:"var(--sans)", fontSize:12, fontWeight:500,
                  cursor:"pointer",
                }}>
                {t.label}
              </button>
            ))}
          </div>
          <span style={{marginLeft:"auto"}}>
            <button className="btn sm" onClick={() => goTo("history")}>Compare in History →</button>
          </span>
        </div>

        <div style={{
          border:"1px solid var(--rule)", borderRadius:6, overflow:"hidden",
          background:"#fcfdff", display:"grid",
          gridTemplateColumns: previewTab === "overlay" ? "1fr" : "1fr 1fr",
        }}>
          {previewTab !== "overlay" && (
            <>
              <div style={{padding:14, borderRight:"1px solid var(--rule)"}}>
                <div className="mono" style={{fontSize:11, color:"var(--ink-3)", marginBottom:8}}>Before · {base}</div>
                <svg viewBox="0 0 280 200" style={{display:"block", width:"100%"}}>
                  <SampleArt x={8} y={8} w={264} h={184} state="before" />
                </svg>
              </div>
              <div style={{padding:14}}>
                <div className="mono" style={{fontSize:11, color:"var(--ink-3)", marginBottom:8}}>After · {compare}</div>
                <svg viewBox="0 0 280 200" style={{display:"block", width:"100%"}}>
                  <SampleArt x={8} y={8} w={264} h={184} state="after" />
                </svg>
              </div>
            </>
          )}
          {previewTab === "overlay" && (
            <div style={{padding:14}}>
              <div className="mono" style={{fontSize:11, color:"var(--ink-3)", marginBottom:8}}>
                Diff overlay · added / removed / moved / restyled
              </div>
              <svg viewBox="0 0 560 280" style={{display:"block", width:"100%"}}>
                <SampleArt x={20} y={10} w={520} h={260} state="after" overlay />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Footer — submit row */}
      <div style={{padding:"14px 24px", display:"flex", alignItems:"center", gap:10, background:"var(--surface-2)", borderTop:"1px solid var(--rule)"}}>
        <span className="mono" style={{fontSize:11, color:"var(--ink-3)"}}>
          Will request review from <b style={{color:"var(--ink)"}}>alex (owner)</b>
        </span>
        {hasConflict && (
          <span className="mono" style={{
            fontSize:11, color:"var(--rem)",
            padding:"2px 8px", background:"#fef2f2", border:"1px solid #fecaca", borderRadius:999,
          }}>
            ⚠ 1 conflict — owner will resolve inline
          </span>
        )}
        <span style={{marginLeft:"auto", display:"flex", gap:8}}>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn" disabled={sameBranch || !title} style={{opacity: (sameBranch||!title) ? 0.5 : 1}}>
            Save draft
          </button>
          <button className="btn primary" disabled={sameBranch || !title} style={{opacity: (sameBranch||!title) ? 0.5 : 1}}>
            ✓ Create pull request
          </button>
        </span>
      </div>
    </main>
  );
}

/* ===== Inline Merge — Conflicts tab for PR detail ===== */

const PR_CONFLICTS = [
  {
    id: "celest",
    el: "#celestial",
    desc: "moon (theirs · fix/moon) vs sun (mine · feat/sunset)",
    optionA: { name: "Use theirs", subtitle: "moon",      state: "after"  },
    optionB: { name: "Use mine",   subtitle: "sun",       state: "before" },
  },
  {
    id: "house",
    el: "#house.fill",
    desc: "tan (theirs) vs cream (mine)",
    optionA: { name: "Use theirs", subtitle: "#c08a4a",   state: "before" },
    optionB: { name: "Use mine",   subtitle: "#e9cfa0",   state: "after"  },
  },
];

const PR_AUTOMERGED = [
  { el: "#sky-gradient",   note: "added (no conflict)"     },
  { el: "#tree.position",  note: "moved (no conflict)"     },
  { el: "#cloud",          note: "removed (no conflict)"   },
  { el: "#horizon.stroke", note: "restyled (no conflict)"  },
];

function ConflictsTab({ isOwner }) {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [activeId,    setActiveId]    = React.useState(PR_CONFLICTS[0].id);
  const [resolutions, setResolutions] = React.useState({}); // id -> 'theirs' | 'mine' | 'manual'

  const conflict   = PR_CONFLICTS.find(c => c.id === activeId);
  const resolved   = Object.keys(resolutions).length;
  const remaining  = PR_CONFLICTS.length - resolved;

  function resolve(id, choice) {
    if (!isOwner) return;
    setResolutions(r => ({ ...r, [id]: choice }));
    const next = PR_CONFLICTS.find(c => !({ ...resolutions, [id]: choice })[c.id]);
    if (next) setActiveId(next.id);
  }

  return (
    <div style={{display:"grid", gridTemplateColumns: sidebarOpen ? "240px 1fr" : "44px 1fr", minHeight: 520, transition: "grid-template-columns .2s ease"}}>

      {/* Conflict sidebar — collapsible */}
      <aside style={{
        borderRight:"1px solid var(--rule)",
        background:"#fcfdff",
        display:"flex", flexDirection:"column",
        overflow:"hidden",
      }}>
        <div style={{
          padding: sidebarOpen ? "12px 14px" : "10px 6px",
          borderBottom:"1px solid var(--rule)",
          display:"flex", alignItems:"center", gap:8,
          justifyContent: sidebarOpen ? "flex-start" : "center",
        }}>
          {sidebarOpen ? (
            <>
              <span style={{fontSize:13, fontWeight:600}}>Conflicts</span>
              <span className="mono" style={{fontSize:11, color:"var(--rem)"}}>{remaining}</span>
              <button className="btn sm ghost" style={{marginLeft:"auto"}}
                onClick={() => setSidebarOpen(false)} title="Collapse">⇤</button>
            </>
          ) : (
            <button className="btn sm ghost" title="Expand conflict list"
              onClick={() => setSidebarOpen(true)}
              style={{padding:"3px 6px"}}>
              ⇥
            </button>
          )}
        </div>

        {/* Collapsed: vertical chip stack — count + first letter of element */}
        {!sidebarOpen && (
          <div style={{display:"flex", flexDirection:"column", alignItems:"center", gap:6, padding:"10px 0"}}>
            {PR_CONFLICTS.map(c => {
              const isActive = c.id === activeId;
              const done = resolutions[c.id];
              const letter = c.el.replace(/^#/, "")[0]?.toUpperCase() || "?";
              return (
                <button key={c.id} onClick={() => setActiveId(c.id)} title={c.el}
                  style={{
                    width:30, height:30, borderRadius:6,
                    border:`1.5px solid ${isActive ? "var(--rem)" : (done ? "var(--add)" : "var(--rule-strong)")}`,
                    background: isActive ? "#fef2f2" : (done ? "var(--add-bg)" : "var(--surface)"),
                    color: done ? "var(--add)" : "var(--ink-2)",
                    fontFamily:"var(--mono)", fontSize:13, fontWeight:600,
                    cursor:"pointer",
                  }}>
                  {done ? "✓" : letter}
                </button>
              );
            })}
          </div>
        )}

        {/* Expanded: full list */}
        {sidebarOpen && (
          <div style={{overflow:"auto"}}>
            {PR_CONFLICTS.map(c => {
              const isActive = c.id === activeId;
              const done = resolutions[c.id];
              return (
                <button key={c.id} onClick={() => setActiveId(c.id)}
                  style={{
                    width:"100%", textAlign:"left",
                    padding:"11px 14px", border:"none",
                    borderBottom:"1px solid var(--rule)",
                    borderLeft: isActive ? "3px solid var(--rem)" : "3px solid transparent",
                    background: isActive ? "#fef2f2" : "transparent",
                    cursor:"pointer", fontFamily:"var(--sans)",
                  }}>
                  <div style={{display:"flex", alignItems:"center", gap:8}}>
                    <span style={{width:8, height:8, borderRadius:"50%", background: done ? "var(--add)" : "var(--rem)"}}></span>
                    <span className="mono" style={{fontSize:12.5, fontWeight:500}}>{c.el}</span>
                    {done && <span className="mono" style={{fontSize:10, color:"var(--add)", marginLeft:"auto"}}>✓ {done}</span>}
                  </div>
                  <div style={{fontSize:11.5, color:"var(--ink-3)", marginTop:4, paddingLeft:16}}>{c.desc}</div>
                </button>
              );
            })}

            <div style={{padding:"10px 14px 6px", display:"flex", alignItems:"center"}}>
              <span className="mono" style={{fontSize:10, letterSpacing:"0.06em", textTransform:"uppercase", color:"var(--ink-3)"}}>
                Auto-merged
              </span>
              <span className="mono" style={{fontSize:10, color:"var(--ink-3)", marginLeft:"auto"}}>{PR_AUTOMERGED.length}</span>
            </div>
            {PR_AUTOMERGED.map(a => (
              <div key={a.el} style={{padding:"6px 14px 6px 22px", fontSize:12, color:"var(--ink-2)", display:"flex", gap:8}}>
                <span style={{color:"var(--add)"}}>✓</span>
                <span className="mono" style={{flex:1, fontSize:11.5}}>{a.el}</span>
                <span style={{color:"var(--ink-3)", fontSize:10.5}}>{a.note}</span>
              </div>
            ))}
          </div>
        )}
      </aside>

      {/* Main — the conflict */}
      <main style={{padding:"20px 24px 28px", display:"flex", flexDirection:"column", overflow:"auto"}}>

        {/* Owner / collaborator chip row */}
        <div style={{display:"flex", alignItems:"center", gap:10, marginBottom:14}}>
          {isOwner ? (
            <RoleChip name="alex" role="owner" you />
          ) : (
            <>
              <RoleChip name="alex" role="owner" />
              <RoleChip name="jane" role="collaborator" you />
            </>
          )}
          <span className="mono" style={{fontSize:11, color:"var(--ink-3)", marginLeft:8}}>
            base · a17b · {PR_CONFLICTS.length} conflict{PR_CONFLICTS.length !== 1 ? "s" : ""} · {resolved}/{PR_CONFLICTS.length} resolved
          </span>
          <span style={{marginLeft:"auto"}}>
            <button className="btn sm primary"
              disabled={remaining > 0 || !isOwner}
              title={!isOwner ? "Only the project owner can complete the merge" : undefined}
              style={{
                opacity: (remaining || !isOwner) ? 0.5 : 1,
                cursor: (remaining || !isOwner) ? "not-allowed" : "pointer",
              }}>
              ✓ Apply &amp; merge PR
            </button>
          </span>
        </div>

        {/* Owner-gated banner for non-owners */}
        {!isOwner && (
          <div style={{
            display:"flex", alignItems:"center", gap:10,
            padding:"8px 12px", marginBottom: 16,
            background:"#fff7ed", border:"1px solid #fed7aa", borderRadius: 6,
            fontSize: 12, color:"#9a3412", fontFamily:"var(--mono)",
          }}>
            <span style={{
              display:"inline-flex", alignItems:"center", justifyContent:"center",
              width:18, height:18, borderRadius:4,
              background:"#fed7aa", color:"#9a3412", fontSize:11, fontWeight:700, flex:"0 0 auto",
            }}>!</span>
            <span>
              ⚠ <b>Only the project owner can resolve these conflicts.</b>
              Controls below are <b>shown but disabled</b> for you.
            </span>
          </div>
        )}

        {/* Conflict header */}
        <div style={{display:"flex", alignItems:"baseline", gap:12, marginBottom:6}}>
          <span className="mono" style={{fontSize:11, color:"var(--ink-3)", textTransform:"uppercase", letterSpacing:"0.06em"}}>
            Conflict
          </span>
          <span style={{fontSize:18, fontWeight:600}} className="mono">{conflict.el}</span>
        </div>
        <div style={{fontSize:13, color:"var(--ink-3)", marginBottom:22}}>
          {conflict.desc} — choose one, or open in canvas for a manual fix.
        </div>

        {/* Theirs / Base / Mine three-panel preview */}
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14, marginBottom:18}}>
          {[
            { label:"Theirs · fix/moon",     state: conflict.optionA.state, accent:"var(--mov)" },
            { label:"Base · a17b",           state: "before",               accent:"var(--ink-4)" },
            { label:"Mine · feat/sunset",    state: conflict.optionB.state, accent:"var(--add)" },
          ].map((p, i) => (
            <div key={i} style={{
              border:"1px solid var(--rule)", borderTop:`3px solid ${p.accent}`,
              borderRadius:6, overflow:"hidden", background:"var(--surface)",
            }}>
              <div style={{padding:"8px 12px", borderBottom:"1px solid var(--rule)"}}>
                <span style={{fontSize:12, fontWeight:600}}>{p.label}</span>
              </div>
              <div style={{padding:12, background:"#fcfdff"}}>
                <svg viewBox="0 0 280 200" style={{display:"block", width:"100%"}}>
                  <SampleArt x={8} y={8} w={264} h={184} state={p.state} />
                </svg>
              </div>
            </div>
          ))}
        </div>

        {/* Resolution actions — disabled-but-visible for non-owners */}
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14, opacity: isOwner ? 1 : 0.55}}>
          {[
            { choice: "theirs", label: "Use theirs",  sub: conflict.optionA.subtitle, color: "var(--mov)" },
            { choice: "mine",   label: "Use mine",    sub: conflict.optionB.subtitle, color: "var(--add)" },
            { choice: "manual", label: "Manual fix",  sub: "Edit in canvas →",        color: "var(--ink)"  , dashed: true },
          ].map(b => {
            const on = resolutions[conflict.id] === b.choice;
            return (
              <button key={b.choice}
                onClick={() => resolve(conflict.id, b.choice)}
                disabled={!isOwner}
                title={!isOwner ? "Owner-only — only alex can resolve this conflict" : undefined}
                style={{
                  padding:"14px 16px",
                  border: `${b.dashed ? "1.5px dashed" : "1.5px solid"} ${on ? b.color : "var(--rule-strong)"}`,
                  borderRadius:6,
                  background: on
                    ? (b.choice === "theirs" ? "var(--mov-bg)" : b.choice === "mine" ? "var(--add-bg)" : "var(--hl)")
                    : "var(--surface)",
                  cursor: isOwner ? "pointer" : "not-allowed",
                  fontFamily:"var(--sans)", textAlign:"left",
                }}>
                <div style={{display:"flex", alignItems:"center", gap:8}}>
                  <div style={{fontSize:13, fontWeight:600}}>{b.label}</div>
                  {!isOwner && <span className="mono" style={{
                    marginLeft:"auto", fontSize:9, padding:"1px 5px",
                    border:"1px solid var(--rule-strong)", borderRadius:3, color:"var(--ink-3)",
                  }}>owner only</span>}
                  {on && isOwner && <span className="mono" style={{marginLeft:"auto", fontSize:10, color:b.color}}>✓ chosen</span>}
                </div>
                <div style={{fontSize:12, color:"var(--ink-3)", marginTop:3}}>{b.sub}</div>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}

function PRScreen({ goTo, context }) {
  const [filter, setFilter] = React.useState("all"); // all | mine | review
  const [selectedId, setSelectedId] = React.useState(12);
  const [tab, setTab] = React.useState("conversation"); // conversation | changes | commits | conflicts
  const [reply, setReply] = React.useState("");
  const [decision, setDecision] = React.useState(null); // approve | request | comment
  const [composeOpen, setComposeOpen] = React.useState(Boolean(context && context.compose));

  // Owner gating — alex owns starfield.svg.
  const isOwner = true;

  // Honour cross-screen hand-off (e.g. Sketch's "Open a PR →" link)
  React.useEffect(() => {
    if (context && context.compose) setComposeOpen(true);
  }, [context]);

  let visible = PRS;
  if (filter === "mine") visible = PRS.filter(p => p.me);
  if (filter === "review") visible = PRS.filter(p => !p.me && p.state === "open");

  const selected = PRS.find(p => p.id === selectedId) || visible[0];

  return (
    <div className="frame">
      <div className="frame-chrome">
        <span className="dots"><span></span><span></span><span></span></span>
        <span>graft · starfield.svg · pull requests</span>
      </div>

      <div style={{display:"grid", gridTemplateColumns:"340px 1fr", minHeight: 700}}>
        {/* List */}
        <aside style={{borderRight:"1px solid var(--rule)", background:"#fcfdff", display:"flex", flexDirection:"column"}}>
          <div style={{padding:"14px 16px 8px", display:"flex", alignItems:"baseline"}}>
            <span style={{fontSize:14, fontWeight:600}}>Pull requests</span>
            <span className="mono" style={{fontSize:11, color:"var(--ink-3)", marginLeft:8}}>{PRS.length}</span>
            <button className="btn primary sm" style={{marginLeft:"auto"}}
              onClick={() => setComposeOpen(true)}>+ New PR</button>
          </div>
          <div style={{padding:"0 16px 10px", display:"flex", gap:4}}>
            {[
              { id:"all",    label:"All" },
              { id:"mine",   label:"Mine" },
              { id:"review", label:"Needs review" },
            ].map(f => (
              <button key={f.id} onClick={() => setFilter(f.id)}
                style={{
                  padding:"4px 10px", border:"1px solid",
                  borderColor: filter === f.id ? "var(--accent)" : "var(--rule)",
                  background: filter === f.id ? "var(--hl)" : "transparent",
                  color: filter === f.id ? "var(--ink)" : "var(--ink-2)",
                  borderRadius:999, fontSize:11.5, fontFamily:"var(--sans)",
                  cursor:"pointer",
                }}>
                {f.label}
              </button>
            ))}
          </div>

          <div style={{overflow:"auto", flex:1}}>
            {visible.map(p => {
              const isSel = p.id === selectedId;
              return (
                <button key={p.id} onClick={() => setSelectedId(p.id)}
                  style={{
                    width:"100%", textAlign:"left", display:"block",
                    padding:"12px 16px", border:"none",
                    borderBottom:"1px solid var(--rule)",
                    borderLeft: isSel ? "3px solid var(--accent)" : "3px solid transparent",
                    background: isSel ? "var(--hl)" : "transparent",
                    cursor:"pointer", fontFamily:"var(--sans)",
                  }}>
                  <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:6}}>
                    <span className="mono" style={{fontSize:11, color:"var(--ink-3)"}}>#{p.id}</span>
                    <StateBadge state={p.state} reviewState={p.state === "merged" ? "merged" : p.reviewState} />
                    {p.me && <span className="mono" style={{fontSize:10, marginLeft:"auto", color:"var(--ink-3)"}}>you</span>}
                  </div>
                  <div style={{fontSize:13, fontWeight:500, lineHeight:1.35, marginBottom:6}}>{p.title}</div>
                  <div className="mono" style={{fontSize:11, color:"var(--ink-3)", display:"flex", gap:8, flexWrap:"wrap"}}>
                    <span>{p.author}</span>
                    <span>·</span>
                    <span>{p.branch} → {p.base}</span>
                    <span>·</span>
                    <span>{p.when}</span>
                  </div>
                  <div style={{display:"flex", gap:8, marginTop:6, fontFamily:"var(--mono)", fontSize:10.5, color:"var(--ink-3)"}}>
                    <span>{p.commits} commits</span>
                    <span>{p.changes} changes</span>
                    {p.conflicts > 0 && <span style={{color:"var(--rem)"}}>{p.conflicts} conflict</span>}
                    <span style={{marginLeft:"auto"}}>💬 {p.comments}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Detail OR New-PR composer */}
        {composeOpen ? (
          <NewPRComposer onClose={() => setComposeOpen(false)} goTo={goTo} />
        ) : (
          <main style={{display:"flex", flexDirection:"column"}}>
          {/* Header */}
          <div style={{padding:"18px 24px 14px", borderBottom:"1px solid var(--rule)"}}>
            <div style={{display:"flex", alignItems:"baseline", gap:10, marginBottom:6}}>
              <span className="mono" style={{fontSize:13, color:"var(--ink-3)"}}>#{selected.id}</span>
              <span style={{fontSize:20, fontWeight:600, letterSpacing:"-0.01em"}}>{selected.title}</span>
              <span style={{marginLeft:"auto"}}>
                <StateBadge state={selected.state} reviewState={selected.state === "merged" ? "merged" : selected.reviewState} />
              </span>
            </div>
            <div className="mono" style={{fontSize:12, color:"var(--ink-3)", display:"flex", gap:10, flexWrap:"wrap"}}>
              <span><b style={{color:"var(--ink)"}}>{selected.author}</b> wants to merge</span>
              <span style={{padding:"1px 8px", background:"#eff5ff", border:"1px solid var(--rule)", borderRadius:4, color:"var(--accent-2,#1d4ed8)"}}>{selected.branch}</span>
              <span>→</span>
              <span style={{padding:"1px 8px", background:"var(--surface-2)", border:"1px solid var(--rule)", borderRadius:4}}>{selected.base}</span>
              <span>·</span>
              <span>opened {selected.when}</span>
              <span>·</span>
              <span>reviewer: <b style={{color:"var(--ink)"}}>{selected.reviewer}</b></span>
            </div>
          </div>

          {/* Conflict callout — links to inline Conflicts tab */}
          {selected.conflicts > 0 && (
            <div style={{
              display:"flex", alignItems:"center", gap:12,
              padding:"10px 24px",
              background:"#fef2f2", borderBottom:"1px solid #fecaca",
              fontSize:12.5, color:"#7f1d1d",
            }}>
              <span style={{
                display:"inline-flex", alignItems:"center", justifyContent:"center",
                width:20, height:20, borderRadius:4,
                background:"var(--rem)", color:"#fff", fontWeight:700, fontSize:12,
              }}>!</span>
              <span style={{fontFamily:"var(--mono)"}}>
                <b>{selected.conflicts} conflict{selected.conflicts > 1 ? "s" : ""}</b>
                {" "}must be resolved before this PR can merge.
                {isOwner
                  ? <> You're the <b>owner</b> — resolve them in <b>Conflicts</b> below.</>
                  : <> Only <b>alex (owner)</b> can resolve them.</>}
              </span>
              <span style={{marginLeft:"auto"}}>
                <button className="btn sm"
                  style={{borderColor:"#fecaca", color:"#7f1d1d", background:"transparent"}}
                  onClick={() => setTab("conflicts")}>
                  Resolve conflicts ↓
                </button>
              </span>
            </div>
          )}

          {/* Tabs */}
          <div style={{display:"flex", gap:0, padding:"0 24px", borderBottom:"1px solid var(--rule)"}}>
            {[
              { id:"conversation", label:"Conversation", count: 4 },
              { id:"changes",      label:"Changes",      count: 4 },
              { id:"commits",      label:"Commits",      count: 3 },
              ...(selected.conflicts > 0
                ? [{ id:"conflicts", label:"Conflicts", count: selected.conflicts, urgent: true }]
                : []),
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{
                  padding:"12px 14px", border:"none", background:"transparent",
                  borderBottom: tab === t.id
                    ? (t.urgent ? "2px solid var(--rem)" : "2px solid var(--accent)")
                    : "2px solid transparent",
                  color: tab === t.id
                    ? (t.urgent ? "var(--rem)" : "var(--ink)")
                    : "var(--ink-3)",
                  fontSize:13, fontFamily:"var(--sans)", fontWeight:500,
                  cursor:"pointer", display:"flex", alignItems:"center", gap:6,
                }}>
                {t.label}
                <span className="mono" style={{
                  fontSize:10.5, padding:"1px 6px",
                  background: t.urgent ? "var(--rem-bg)" : "var(--surface-2)",
                  color: t.urgent ? "var(--rem)" : "var(--ink-3)",
                  borderRadius:999,
                  fontWeight: t.urgent ? 600 : 400,
                }}>{t.count}</span>
              </button>
            ))}
          </div>

          {/* Body */}
          <div style={{flex:1, display:"grid", gridTemplateColumns: tab === "changes" ? "1fr 320px" : "1fr"}}>
            {tab === "conversation" && (
              <div style={{padding:"20px 24px", overflow:"auto"}}>
                {/* Description */}
                <div style={{display:"flex", gap:12, marginBottom:18}}>
                  <div style={{width:32, height:32, borderRadius:"50%", background:"var(--accent)", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:600, fontSize:13}}>J</div>
                  <div style={{flex:1, border:"1px solid var(--rule)", borderRadius:8, padding:"12px 14px"}}>
                    <div style={{display:"flex", gap:8, alignItems:"baseline", marginBottom:6}}>
                      <b style={{fontSize:13}}>jane</b>
                      <span style={{fontSize:11.5, color:"var(--ink-3)"}}>opened this PR · 2d ago</span>
                    </div>
                    <div style={{fontSize:13.5, color:"var(--ink-2)", lineHeight:1.55}}>
                      Adds the warm sunset gradient behind the horizon, and moves the tree to the right third so it doesn't fight the new lighting. Open to feedback on the moon — happy to rework if it feels heavy.
                    </div>
                  </div>
                </div>

                {/* Threads */}
                {REVIEW_THREADS.map(t => (
                  <div key={t.id} style={{marginBottom:18}}>
                    <div className="mono" style={{fontSize:11, color:"var(--ink-3)", marginBottom:6, display:"flex", alignItems:"center", gap:8}}>
                      <span>thread on</span>
                      <span style={{padding:"1px 6px", background:"#eff5ff", border:"1px solid var(--rule)", borderRadius:3, color:"var(--accent-2,#1d4ed8)"}}>{t.anchorEl}</span>
                      {t.status === "resolved" && <span style={{color:"var(--add)", fontWeight:600}}>resolved ✓</span>}
                    </div>
                    <div style={{display:"flex", gap:12, marginBottom:8}}>
                      <div style={{width:32, height:32, borderRadius:"50%", background:"var(--ink)", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:600, fontSize:13}}>A</div>
                      <div style={{flex:1, border:"1px solid var(--rule)", borderRadius:8, padding:"10px 12px",
                        opacity: t.status === "resolved" ? 0.6 : 1}}>
                        <div style={{display:"flex", gap:8, alignItems:"baseline", marginBottom:4}}>
                          <b style={{fontSize:12.5}}>{t.author}</b>
                          <span style={{fontSize:11, color:"var(--ink-3)"}}>{t.when}</span>
                        </div>
                        <div style={{fontSize:13, color:"var(--ink-2)", lineHeight:1.5}}>{t.body}</div>
                      </div>
                    </div>
                    {t.replies.map((r, i) => (
                      <div key={i} style={{display:"flex", gap:12, marginLeft:32, marginBottom:8}}>
                        <div style={{width:26, height:26, borderRadius:"50%", background:"var(--accent)", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:600, fontSize:11}}>{r.author[0].toUpperCase()}</div>
                        <div style={{flex:1, border:"1px solid var(--rule)", borderRadius:8, padding:"8px 12px", background:"var(--surface-2)"}}>
                          <div style={{display:"flex", gap:8, alignItems:"baseline", marginBottom:2}}>
                            <b style={{fontSize:12}}>{r.author}</b>
                            <span style={{fontSize:11, color:"var(--ink-3)"}}>{r.when}</span>
                          </div>
                          <div style={{fontSize:12.5, color:"var(--ink-2)"}}>{r.body}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}

                {/* Review composer */}
                <div style={{marginTop:24, border:"1px solid var(--rule-strong)", borderRadius:8, overflow:"hidden", background:"#fcfdff"}}>
                  <div style={{padding:"10px 14px", borderBottom:"1px solid var(--rule)", display:"flex", alignItems:"center", gap:8}}>
                    <span style={{fontSize:13, fontWeight:600}}>Submit review</span>
                    <span className="mono" style={{fontSize:11, color:"var(--ink-3)"}}>as alex (owner)</span>
                  </div>
                  <textarea
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                    placeholder="Leave a comment, or attach to an element with @ in the canvas…"
                    style={{
                      width:"100%", padding:"12px 14px", border:"none", outline:"none",
                      resize:"vertical", minHeight:88,
                      fontFamily:"var(--sans)", fontSize:13.5,
                      background:"var(--surface)",
                    }} />
                  <div style={{display:"flex", gap:10, padding:"10px 14px", borderTop:"1px solid var(--rule)", background:"var(--surface-2)"}}>
                    {[
                      { id:"comment",  label:"Comment",          variant:"neutral" },
                      { id:"approve",  label:"Approve & merge",  variant:"primary" },
                      { id:"request",  label:"Request changes",  variant:"warn" },
                    ].map(d => {
                      const on = decision === d.id;
                      let style = { padding:"7px 14px", borderRadius:5, fontSize:12.5, fontFamily:"var(--sans)", fontWeight:500, cursor:"pointer", border:"1px solid" };
                      if (d.variant === "primary") {
                        style.background = on ? "var(--accent)" : "var(--surface)";
                        style.color = on ? "#fff" : "var(--accent-2, #1d4ed8)";
                        style.borderColor = "var(--accent)";
                      } else if (d.variant === "warn") {
                        style.background = on ? "var(--rem)" : "var(--surface)";
                        style.color = on ? "#fff" : "var(--rem)";
                        style.borderColor = "var(--rem)";
                      } else {
                        style.background = on ? "var(--ink)" : "var(--surface)";
                        style.color = on ? "#fff" : "var(--ink-2)";
                        style.borderColor = "var(--rule-strong)";
                      }
                      return (
                        <button key={d.id} onClick={() => setDecision(d.id)} style={style}>
                          {d.label}
                        </button>
                      );
                    })}
                    <span style={{marginLeft:"auto", fontFamily:"var(--mono)", fontSize:11, color:"var(--ink-3)", alignSelf:"center"}}>
                      {selected.conflicts > 0 ? <span style={{color:"var(--rem)"}}>⚠ {selected.conflicts} conflict — resolve before merge</span> : "✓ no conflicts"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {tab === "changes" && (
              <>
                <div style={{padding:"20px 24px", overflow:"auto"}}>
                  <div className="mono" style={{fontSize:11, color:"var(--ink-3)", marginBottom:10}}>
                    {selected.branch} (after) compared against {selected.base} (before)
                  </div>
                  <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14}}>
                    {[
                      { label:"Before · main", state:"before" },
                      { label:"After · " + selected.branch, state:"after" },
                      { label:"Diff overlay", overlay:true },
                    ].map((p, i) => (
                      <div key={i} style={{border:"1px solid var(--rule)", borderRadius:6, overflow:"hidden", background:"var(--surface)"}}>
                        <div style={{padding:"8px 12px", borderBottom:"1px solid var(--rule)", fontSize:11.5, fontWeight:500}}>{p.label}</div>
                        <div style={{padding:10, background:"#fcfdff"}}>
                          <svg viewBox="0 0 240 220" style={{display:"block", width:"100%"}}>
                            <SampleArt x={8} y={8} w={224} h={204} state={p.state || "after"} overlay={p.overlay} />
                          </svg>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className="btn sm" style={{marginTop:16}} onClick={() => goTo("history")}>
                    Compare commits in History →
                  </button>
                </div>
                <aside style={{borderLeft:"1px solid var(--rule)", padding:"16px 16px", background:"#fcfdff"}}>
                  <div className="mono" style={{fontSize:10, letterSpacing:"0.06em", textTransform:"uppercase", color:"var(--ink-3)", marginBottom:10}}>
                    Changed elements
                  </div>
                  {[
                    { kind:"add", el:"#moon",  note:"added" },
                    { kind:"rem", el:"#sun",   note:"removed" },
                    { kind:"mov", el:"#tree",  note:"moved x: 182 → 258" },
                    { kind:"sty", el:"#house", note:"fill #fff → #e9cfa0" },
                  ].map(c => (
                    <div key={c.el} style={{display:"flex", gap:10, alignItems:"flex-start", padding:"8px 0", borderBottom:"1px dashed var(--rule)"}}>
                      <span style={{width:8, height:8, marginTop:6, borderRadius:"50%", background:`var(--${c.kind})`, flex:"0 0 auto"}}></span>
                      <div>
                        <div className="mono" style={{fontSize:12, fontWeight:500}}>{c.el}</div>
                        <div style={{fontSize:11, color:"var(--ink-3)"}}>{c.note}</div>
                      </div>
                    </div>
                  ))}
                </aside>
              </>
            )}

            {tab === "conflicts" && (
              <ConflictsTab isOwner={isOwner} />
            )}

            {tab === "commits" && (
              <div style={{padding:"20px 24px"}}>
                {[
                  { sha:"c4f3a8", msg:"add sunset gradient",  who:"jane", when:"2d ago" },
                  { sha:"9b2e1c", msg:"tree position tweak",  who:"jane", when:"3d ago" },
                  { sha:"7d09f4", msg:"branch sunset",        who:"jane", when:"5d ago" },
                ].map((c, i) => (
                  <button key={i} onClick={() => goTo("history")}
                    style={{
                      width:"100%", textAlign:"left",
                      display:"flex", gap:14, alignItems:"center",
                      padding:"12px 14px", marginBottom:6,
                      border:"1px solid var(--rule)", borderRadius:6,
                      background:"var(--surface)", cursor:"pointer",
                      fontFamily:"var(--sans)",
                    }}>
                    <span style={{width:9, height:9, borderRadius:"50%", background:"var(--accent)"}}></span>
                    <span style={{flex:1, fontSize:13.5, fontWeight:500}}>{c.msg}</span>
                    <span className="mono" style={{fontSize:11.5, color:"var(--ink-3)"}}>{c.sha}</span>
                    <span style={{fontSize:11.5, color:"var(--ink-3)", width:90, textAlign:"right"}}>{c.who} · {c.when}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </main>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { PRScreen });
