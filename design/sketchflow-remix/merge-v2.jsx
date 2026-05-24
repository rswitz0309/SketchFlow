/* Merge — conflict list left, with a collapse button that hides it and gives the
   conflict canvas the entire page. Click the floating button to reopen. */

const MERGE_AUTO = [
  { el: "#sky-gradient", note: "added (no conflict)" },
  { el: "#tree.position", note: "moved (no conflict)" },
  { el: "#cloud", note: "removed (no conflict)" },
  { el: "#horizon.stroke", note: "restyled (no conflict)" },
];

const MERGE_CONFLICTS = [
  {
    id: "celest",
    el: "#celestial",
    desc: "moon (theirs · fix/moon) vs sun (mine · feat/sunset)",
    optionA: { name: "Use theirs", subtitle: "moon", state: "after" },
    optionB: { name: "Use mine",   subtitle: "sun",  state: "before" },
  },
  {
    id: "house",
    el: "#house.fill",
    desc: "tan (theirs) vs cream (mine)",
    optionA: { name: "Use theirs", subtitle: "#3a3", state: "before" },
    optionB: { name: "Use mine",   subtitle: "#e9cfa0", state: "after" },
  },
];

function MergeScreen() {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [activeConflict, setActiveConflict] = React.useState("celest");
  const [resolutions, setResolutions] = React.useState({}); // id -> 'theirs' | 'mine' | 'manual'
  // Active actor is jane (collaborator); alex owns starfield.svg.
  // Only the owner may resolve conflicts.
  const isOwner = false;

  const conflict = MERGE_CONFLICTS.find(c => c.id === activeConflict);
  const remaining = MERGE_CONFLICTS.length - Object.keys(resolutions).length;

  function resolve(id, choice) {
    setResolutions(r => ({ ...r, [id]: choice }));
    // auto-advance to next unresolved
    const next = MERGE_CONFLICTS.find(c => !({ ...resolutions, [id]: choice })[c.id]);
    if (next) setActiveConflict(next.id);
  }

  return (
    <div className="frame">
      <div className="frame-chrome">
        <span className="dots"><span></span><span></span><span></span></span>
        <span>graft · starfield.svg · merge</span>
      </div>

      {/* Toolbar */}
      <div style={{display:"flex", alignItems:"center", gap:10, padding:"12px 20px", borderBottom:"1px solid var(--rule)"}}>
        {!sidebarOpen && (
          <button className="btn sm" onClick={() => setSidebarOpen(true)} title="Show conflict list">
            ☰ Conflicts
          </button>
        )}
        <span style={{fontFamily:"var(--mono)", fontSize:11, color:"var(--ink-3)"}}>Merge</span>
        <button className="btn sm">fix/moon <span style={{color:"var(--ink-3)", marginLeft:4}}>▾</span></button>
        <span style={{color:"var(--ink-4)"}}>→</span>
        <button className="btn sm">feat/sunset <span style={{color:"var(--ink-3)", marginLeft:4}}>▾</span></button>
        <span style={{fontFamily:"var(--mono)", fontSize:11, color:"var(--ink-3)", marginLeft:8}}>base · a17b</span>

        <span style={{width:1, height:18, background:"var(--rule)", marginLeft:6}}></span>
        <RoleChip name="alex" role="owner" />
        <RoleChip name="jane" role="collaborator" you />

        <div style={{marginLeft:"auto", display:"flex", gap:10, alignItems:"center"}}>
          <span className="mono" style={{fontSize:11, color:"var(--ink-3)"}}>
            {MERGE_AUTO.length} auto-merged · <b style={{color: remaining ? "var(--rem)" : "var(--add)"}}>{remaining}</b> remaining
          </span>
          <button className="btn sm">Abort</button>
          <button className="btn sm primary"
            disabled={remaining > 0 || !isOwner}
            title={!isOwner ? "Only the project owner can complete the merge" : undefined}
            style={{opacity: (remaining || !isOwner) ? 0.5 : 1, cursor: (remaining || !isOwner) ? "not-allowed" : "pointer"}}>
            ✓ Complete merge
          </button>
          <button className="btn sm" onClick={() => alert("Open PR composer for this merge")}>
            Open as PR…
          </button>
        </div>
      </div>

      {/* Ownership policy banner */}
      {!isOwner && (
        <div style={{
          display:"flex", alignItems:"center", gap:10,
          padding:"8px 20px",
          background:"#fff7ed", borderBottom:"1px solid #fed7aa",
          fontSize:12, color:"#9a3412", fontFamily:"var(--mono)",
        }}>
          <span style={{
            display:"inline-flex", alignItems:"center", justifyContent:"center",
            width:18, height:18, borderRadius:4,
            background:"#fed7aa", color:"#9a3412", fontSize:11, fontWeight:700,
          }}>!</span>
          <span>
            Only <b>alex</b> (owner) can resolve conflicts on <b>starfield.svg</b>.
            You can review each conflict and leave a recommendation —
            controls below are <b>shown but disabled</b> for you.
          </span>
          <span style={{marginLeft:"auto"}}>
            <button className="btn sm" style={{background:"transparent", borderColor:"#fed7aa", color:"#9a3412"}}
              onClick={() => alert("Ping alex on this merge")}>
              ✉ Notify owner
            </button>
          </span>
        </div>
      )}

      <div style={{display:"grid", gridTemplateColumns: sidebarOpen ? "300px 1fr" : "1fr", minHeight: 620, position:"relative", transition:"grid-template-columns .25s ease"}}>
        {/* Sidebar */}
        {sidebarOpen && (
          <aside style={{borderRight:"1px solid var(--rule)", background:"#fcfcfc", display:"flex", flexDirection:"column"}}>
            <div style={{padding:"12px 14px", borderBottom:"1px solid var(--rule)", display:"flex", alignItems:"center"}}>
              <span style={{fontSize:13, fontWeight:600}}>Conflicts</span>
              <span className="mono" style={{fontSize:11, color:"var(--ink-3)", marginLeft:8}}>{MERGE_CONFLICTS.length}</span>
              <button className="btn sm ghost" style={{marginLeft:"auto"}}
                onClick={() => setSidebarOpen(false)} title="Hide list">
                ⇤
              </button>
            </div>

            <div style={{overflow:"auto"}}>
              {MERGE_CONFLICTS.map(c => {
                const isActive = c.id === activeConflict;
                const resolved = resolutions[c.id];
                return (
                  <button key={c.id}
                    onClick={() => setActiveConflict(c.id)}
                    style={{
                      width:"100%", textAlign:"left",
                      padding:"12px 14px", border:"none",
                      borderBottom:"1px solid var(--rule)",
                      borderLeft: isActive ? "3px solid var(--rem)" : "3px solid transparent",
                      background: isActive ? "#fef2f2" : "transparent",
                      cursor:"pointer",
                    }}>
                    <div style={{display:"flex", alignItems:"center", gap:8}}>
                      <span style={{
                        width:8, height:8, borderRadius:"50%",
                        background: resolved ? "var(--add)" : "var(--rem)"
                      }}></span>
                      <span className="mono" style={{fontSize:12.5, fontWeight:500}}>{c.el}</span>
                      {resolved && <span className="mono" style={{fontSize:10, color:"var(--add)", marginLeft:"auto"}}>✓ {resolved}</span>}
                    </div>
                    <div style={{fontSize:11.5, color:"var(--ink-3)", marginTop:4, paddingLeft:16}}>{c.desc}</div>
                  </button>
                );
              })}

              <div style={{padding:"10px 14px 6px", display:"flex", alignItems:"center"}}>
                <span className="mono" style={{fontSize:10, letterSpacing:"0.06em", textTransform:"uppercase", color:"var(--ink-3)"}}>
                  Auto-merged
                </span>
                <span className="mono" style={{fontSize:10, color:"var(--ink-3)", marginLeft:"auto"}}>{MERGE_AUTO.length}</span>
              </div>
              {MERGE_AUTO.map(a => (
                <div key={a.el} style={{padding:"6px 14px 6px 30px", fontSize:12, color:"var(--ink-2)", display:"flex", gap:8}}>
                  <span style={{color:"var(--add)"}}>✓</span>
                  <span className="mono" style={{flex:1}}>{a.el}</span>
                  <span style={{color:"var(--ink-3)", fontSize:11}}>{a.note}</span>
                </div>
              ))}
            </div>
          </aside>
        )}

        {/* Conflict canvas */}
        <main style={{padding: sidebarOpen ? "24px 28px" : "32px 80px", display:"flex", flexDirection:"column"}}>
          {/* Floating reopen button when collapsed */}
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              style={{
                position:"absolute", left:16, top:78,
                padding:"8px 12px", border:"1px solid var(--rule-strong)",
                borderRadius:6, background:"var(--surface)", cursor:"pointer",
                fontFamily:"var(--sans)", fontSize:12, fontWeight:500,
                boxShadow:"0 2px 8px rgba(0,0,0,0.04)",
                display:"flex", alignItems:"center", gap:8,
              }}>
              ⇥ Show conflicts ({MERGE_CONFLICTS.length})
            </button>
          )}

          <div style={{display:"flex", alignItems:"baseline", gap:12, marginBottom:6}}>
            <span className="mono" style={{fontSize:11, color:"var(--ink-3)", textTransform:"uppercase", letterSpacing:"0.06em"}}>
              Conflict
            </span>
            <span style={{fontSize:18, fontWeight:600}} className="mono">{conflict.el}</span>
          </div>
          <div style={{fontSize:13, color:"var(--ink-3)", marginBottom:24}}>
            {conflict.desc} — choose one, or open in canvas for a manual fix.
          </div>

          {/* Three panels */}
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:16, marginBottom:20}}>
            {[
              { label:"Theirs · fix/moon",    state: conflict.optionA.state, accent:"var(--mov)" },
              { label:"Base · a17b",          state: "before",               accent:"var(--ink-4)" },
              { label:"Mine · feat/sunset",   state: conflict.optionB.state, accent:"var(--add)" },
            ].map((p, i) => (
              <div key={i} style={{
                border:"1px solid var(--rule)", borderTop:`3px solid ${p.accent}`,
                borderRadius:6, overflow:"hidden", background:"var(--surface)",
              }}>
                <div style={{padding:"10px 14px", borderBottom:"1px solid var(--rule)", display:"flex"}}>
                  <span style={{fontSize:12, fontWeight:600}}>{p.label}</span>
                </div>
                <div style={{padding:16, background:"#fcfcfd"}}>
                  <svg viewBox="0 0 300 220" style={{display:"block", width:"100%"}}>
                    <SampleArt x={10} y={10} w={280} h={200} state={p.state} />
                  </svg>
                </div>
              </div>
            ))}
          </div>

          {/* Resolution actions */}
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:16, opacity: isOwner ? 1 : 0.6, position:"relative"}}>
            <button onClick={() => isOwner && resolve(conflict.id, "theirs")}
              disabled={!isOwner}
              title={!isOwner ? "Owner-only — only alex can resolve this conflict" : undefined}
              style={{
                padding:"14px 16px",
                border:`1.5px solid ${resolutions[conflict.id] === "theirs" ? "var(--mov)" : "var(--rule-strong)"}`,
                borderRadius:6,
                background: resolutions[conflict.id] === "theirs" ? "var(--mov-bg)" : "var(--surface)",
                cursor: isOwner ? "pointer" : "not-allowed", fontFamily:"var(--sans)",
                textAlign:"left",
              }}>
              <div style={{display:"flex", alignItems:"center", gap:8}}>
                <div style={{fontSize:13, fontWeight:600}}>Use theirs</div>
                {!isOwner && <span className="mono" style={{marginLeft:"auto", fontSize:9, padding:"1px 5px", border:"1px solid var(--rule-strong)", borderRadius:3, color:"var(--ink-3)"}}>owner only</span>}
              </div>
              <div style={{fontSize:12, color:"var(--ink-3)", marginTop:2}}>{conflict.optionA.subtitle}</div>
            </button>
            <button onClick={() => isOwner && resolve(conflict.id, "mine")}
              disabled={!isOwner}
              title={!isOwner ? "Owner-only — only alex can resolve this conflict" : undefined}
              style={{
                padding:"14px 16px",
                border:`1.5px solid ${resolutions[conflict.id] === "mine" ? "var(--add)" : "var(--rule-strong)"}`,
                borderRadius:6,
                background: resolutions[conflict.id] === "mine" ? "var(--add-bg)" : "var(--surface)",
                cursor: isOwner ? "pointer" : "not-allowed", fontFamily:"var(--sans)",
                textAlign:"left",
              }}>
              <div style={{display:"flex", alignItems:"center", gap:8}}>
                <div style={{fontSize:13, fontWeight:600}}>Use mine</div>
                {!isOwner && <span className="mono" style={{marginLeft:"auto", fontSize:9, padding:"1px 5px", border:"1px solid var(--rule-strong)", borderRadius:3, color:"var(--ink-3)"}}>owner only</span>}
              </div>
              <div style={{fontSize:12, color:"var(--ink-3)", marginTop:2}}>{conflict.optionB.subtitle}</div>
            </button>
            <button onClick={() => isOwner && resolve(conflict.id, "manual")}
              disabled={!isOwner}
              title={!isOwner ? "Owner-only — only alex can resolve this conflict" : undefined}
              style={{
                padding:"14px 16px",
                border:`1.5px dashed ${resolutions[conflict.id] === "manual" ? "var(--ink)" : "var(--ink-4)"}`,
                borderRadius:6,
                background: resolutions[conflict.id] === "manual" ? "var(--hl)" : "var(--surface)",
                cursor: isOwner ? "pointer" : "not-allowed", fontFamily:"var(--sans)",
                textAlign:"left",
              }}>
              <div style={{display:"flex", alignItems:"center", gap:8}}>
                <div style={{fontSize:13, fontWeight:600}}>Manual fix</div>
                {!isOwner && <span className="mono" style={{marginLeft:"auto", fontSize:9, padding:"1px 5px", border:"1px solid var(--rule-strong)", borderRadius:3, color:"var(--ink-3)"}}>owner only</span>}
              </div>
              <div style={{fontSize:12, color:"var(--ink-3)", marginTop:2}}>Edit in canvas →</div>
            </button>
          </div>

          {/* Collaborator affordance — recommend a resolution without being able to apply it */}
          {!isOwner && (
            <div style={{
              marginTop:16, padding:"12px 14px",
              border:"1px dashed var(--rule-strong)", borderRadius:6,
              background:"var(--surface-2)",
              display:"flex", alignItems:"center", gap:10,
            }}>
              <span className="mono" style={{fontSize:10, letterSpacing:"0.06em", textTransform:"uppercase", color:"var(--ink-3)"}}>
                Your recommendation
              </span>
              <button className="btn sm" style={{borderStyle:"dashed"}}>Recommend theirs</button>
              <button className="btn sm" style={{borderStyle:"dashed"}}>Recommend mine</button>
              <button className="btn sm ghost">Leave a comment</button>
              <span style={{marginLeft:"auto", fontSize:11.5, color:"var(--ink-3)"}}>
                Recommendations are visible to <b>alex</b> in the resolution thread.
              </span>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

Object.assign(window, { MergeScreen });
