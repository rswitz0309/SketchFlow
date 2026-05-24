/* Component Memory — split: force-directed graph + selected component detail.
   Accepts `context.commit` and `context.component` from History deep-link. */

const MEM_NODES = [
  { id: "sun",     x: 200, y: 110, kind: "sun",   label: "sun",      group: 0, uses: 8 },
  { id: "tree",    x: 130, y: 200, kind: "tree",  label: "tree",     group: 0, uses: 12 },
  { id: "house",   x: 250, y: 270, kind: "house", label: "house",    group: 0, uses: 5 },
  { id: "moon",    x: 340, y: 150, kind: "moon",  label: "moon",     group: 1, uses: 3 },
  { id: "cloud",   x: 100, y:  90, kind: "cloud", label: "cloud-a",  group: 1, uses: 2 },
  { id: "cloud2",  x:  70, y: 290, kind: "cloud", label: "cloud-b",  group: 1, uses: 2 },
  { id: "star1",   x: 400, y:  80, kind: "star",  label: "star-sm",  group: 2, uses: 9 },
  { id: "star2",   x: 460, y: 200, kind: "star",  label: "star-lg",  group: 2, uses: 4 },
  { id: "grid",    x: 380, y: 290, kind: "grid",  label: "ref-grid", group: 3, uses: 1 },
];
const MEM_EDGES = [
  ["sun","tree"], ["sun","cloud"], ["tree","house"], ["tree","cloud2"],
  ["moon","sun"], ["moon","star1"], ["star1","star2"], ["star2","house"],
  ["grid","house"], ["grid","star2"],
];
const MEM_GROUPS = [
  { name: "Scenery",   color: "#16a34a" },
  { name: "Celestial", color: "#2563eb" },
  { name: "Stars",     color: "#d97706" },
  { name: "Reference", color: "#71717a" },
];

function MemoryScreen({ context, goTo }) {
  const initialId = context?.component || "tree";
  const [selectedId, setSelectedId] = React.useState(initialId);
  const [hover, setHover] = React.useState(null);

  React.useEffect(() => {
    if (context?.component) setSelectedId(context.component);
  }, [context?.component]);

  const byId = Object.fromEntries(MEM_NODES.map(n => [n.id, n]));
  const selected = byId[selectedId] || MEM_NODES[0];
  const fromCommit = context?.commit;

  return (
    <div className="frame">
      <div className="frame-chrome">
        <span className="dots"><span></span><span></span><span></span></span>
        <span>graft · starfield.svg · components</span>
      </div>

      {/* Context bar if we arrived from history */}
      {fromCommit && (
        <div style={{display:"flex", alignItems:"center", gap:10, padding:"10px 20px", background:"#eef2ff", borderBottom:"1px solid var(--rule)", fontSize:12.5}}>
          <span style={{color:"var(--ink-3)"}}>From History →</span>
          <span style={{fontWeight:600}}>commit <span className="mono">{fromCommit}</span></span>
          <span style={{color:"var(--ink-3)"}}>showing components used in this commit</span>
          <button className="btn sm ghost" style={{marginLeft:"auto"}} onClick={() => goTo("history")}>← Back to graph</button>
        </div>
      )}

      <div style={{display:"grid", gridTemplateColumns:"1.4fr 1fr", minHeight: 620}}>
        {/* Graph */}
        <div style={{position:"relative", background:"#fcfcfd", borderRight:"1px solid var(--rule)"}}>
          {/* Toolbar floating */}
          <div style={{position:"absolute", top:14, left:14, display:"flex", gap:6, zIndex:2}}>
            <input placeholder="Find a component…"
              style={{padding:"6px 10px", border:"1px solid var(--rule-strong)", borderRadius:4, fontSize:12, fontFamily:"var(--sans)", background:"var(--surface)", width:180}} />
            <button className="btn sm">All branches ▾</button>
          </div>
          <div style={{position:"absolute", top:14, right:14, display:"flex", gap:6}}>
            <button className="btn sm">−</button>
            <button className="btn sm">+</button>
            <button className="btn sm">⤢ Fit</button>
          </div>

          <svg viewBox="0 0 560 420" style={{display:"block", width:"100%", height:"100%"}}>
            {/* Edges */}
            {MEM_EDGES.map(([a, b], i) => {
              const A = byId[a], B = byId[b];
              const isHL = a === selectedId || b === selectedId;
              return (
                <line key={i} x1={A.x} y1={A.y} x2={B.x} y2={B.y}
                  stroke={isHL ? INK2 : "#d4d4d8"}
                  strokeWidth={isHL ? 1.5 : 1}
                  opacity={isHL ? 0.85 : 0.55} />
              );
            })}
            {/* Nodes */}
            {MEM_NODES.map(n => {
              const r = 12 + Math.sqrt(n.uses) * 2.6;
              const isSel = n.id === selectedId;
              const isHov = n.id === hover;
              return (
                <g key={n.id}
                  onMouseEnter={() => setHover(n.id)}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => setSelectedId(n.id)}
                  style={{cursor:"pointer"}}>
                  <circle cx={n.x} cy={n.y} r={r}
                    fill={isSel ? "#eef2ff" : (isHov ? "#f4f4f5" : SURFACE)}
                    stroke={MEM_GROUPS[n.group].color}
                    strokeWidth={isSel ? 2.5 : 1.5} />
                  <ComponentGlyph x={n.x} y={n.y} r={r * 0.6} kind={n.kind} color={INK2} />
                  <text x={n.x} y={n.y + r + 12} textAnchor="middle"
                    fontSize={isSel ? 12 : 11} fontFamily="JetBrains Mono, monospace"
                    fontWeight={isSel ? 600 : 400}
                    fill={isSel ? INK : INK2}>
                    {n.label}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Legend bottom-left */}
          <div style={{position:"absolute", bottom:14, left:14, display:"flex", gap:6, flexWrap:"wrap"}}>
            {MEM_GROUPS.map(g => (
              <span key={g.name} style={{display:"inline-flex", alignItems:"center", gap:6, padding:"3px 10px", background:"var(--surface)", border:"1px solid var(--rule-strong)", borderRadius:999, fontFamily:"var(--mono)", fontSize:11}}>
                <span style={{width:8, height:8, borderRadius:"50%", background:g.color}}></span>
                {g.name}
              </span>
            ))}
          </div>
          <div style={{position:"absolute", bottom:14, right:14, fontFamily:"var(--mono)", fontSize:10.5, color:"var(--ink-4)"}}>
            node size = usage count
          </div>
        </div>

        {/* Detail */}
        <aside style={{display:"flex", flexDirection:"column", background:SURFACE}}>
          <div style={{padding:"18px 22px", borderBottom:"1px solid var(--rule)"}}>
            <div className="mono" style={{fontSize:10, letterSpacing:"0.06em", textTransform:"uppercase", color:"var(--ink-3)", marginBottom:10}}>
              Component
            </div>
            <div style={{display:"flex", gap:12, alignItems:"center"}}>
              <div style={{width:48, height:48, border:"1px solid var(--rule-strong)", borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", background:"#fcfcfd"}}>
                <svg width="34" height="34" viewBox="-17 -17 34 34">
                  <ComponentGlyph x={0} y={0} r={14} kind={selected.kind} color={MEM_GROUPS[selected.group].color} />
                </svg>
              </div>
              <div>
                <div style={{fontSize:18, fontWeight:600, letterSpacing:"-0.01em"}}>{selected.label}</div>
                <div style={{fontSize:12, color:"var(--ink-3)", marginTop:2}}>
                  {MEM_GROUPS[selected.group].name} · used {selected.uses}× across 4 branches
                </div>
              </div>
            </div>
            <div style={{display:"flex", gap:8, marginTop:14}}>
              <button className="btn primary sm">↘ Re-insert into canvas</button>
              <button className="btn sm">Open in Diff</button>
              <button className="btn sm ghost">⋯</button>
            </div>
          </div>

          <div style={{padding:"18px 22px", borderBottom:"1px solid var(--rule)"}}>
            <div className="mono" style={{fontSize:10, letterSpacing:"0.06em", textTransform:"uppercase", color:"var(--ink-3)", marginBottom:10}}>
              Appears in
            </div>
            {[
              { branch:"main",        commit:"a17b", when:"8d ago" },
              { branch:"feat/sunset", commit:"c4f3", when:"2d ago", current: true },
              { branch:"fix/moon",    commit:"11ab", when:"4d ago" },
              { branch:"exp/grid",    commit:"ee01", when:"6d ago" },
            ].map(a => {
              const isFromCtx = a.commit === fromCommit;
              return (
                <div key={a.branch} style={{
                  display:"flex", gap:8, alignItems:"center",
                  padding:"8px 10px", marginBottom:4,
                  border:"1px solid", borderColor: isFromCtx ? "var(--accent)" : "var(--rule)",
                  borderRadius:4,
                  background: isFromCtx ? "#eef2ff" : "transparent",
                }}>
                  <span style={{width:8, height:8, borderRadius:"50%", background:"var(--mov)"}}></span>
                  <span style={{fontSize:12.5, fontWeight:500, flex:1}}>{a.branch}</span>
                  <span className="mono" style={{fontSize:11.5, color:"var(--ink-3)"}}>{a.commit}</span>
                  <span style={{fontSize:11, color:"var(--ink-4)", width:64, textAlign:"right"}}>{a.when}</span>
                  {a.current && <span className="mono" style={{fontSize:9, padding:"1px 5px", background:"var(--ink)", color:"#fff", borderRadius:3}}>HEAD</span>}
                </div>
              );
            })}
          </div>

          <div style={{padding:"18px 22px"}}>
            <div className="mono" style={{fontSize:10, letterSpacing:"0.06em", textTransform:"uppercase", color:"var(--ink-3)", marginBottom:10}}>
              Last edit
            </div>
            <div style={{border:"1px solid var(--rule)", borderRadius:6, overflow:"hidden", background:"#fcfcfd"}}>
              <svg viewBox="0 0 360 200" style={{display:"block", width:"100%"}}>
                <SampleArt x={10} y={10} w={340} h={180} state="after" overlay legend={{add:true,rem:true,mov:true,sty:true}} />
              </svg>
            </div>
            <div style={{fontSize:12, color:"var(--ink-3)", marginTop:8}}>
              <span className="mono">c4f3</span> · jane · 2d ago — <i>"add sunset gradient"</i>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

Object.assign(window, { MemoryScreen });
