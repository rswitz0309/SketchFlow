/* COMPONENT MEMORY (stretch) — Obsidian-style node graph of components
   reused across the project. Browseable + re-insertable.
*/

/* A small placeholder thumbnail for a component */
function ComponentGlyph({ x, y, r, kind = "sun", color = SK_INK }) {
  switch (kind) {
    case "sun":
      return <g><circle cx={x} cy={y} r={r*0.55} fill="none" stroke={color} strokeWidth="1.3" /><line x1={x-r} y1={y} x2={x+r} y2={y} stroke={color} strokeWidth="1" /><line x1={x} y1={y-r} x2={x} y2={y+r} stroke={color} strokeWidth="1" /></g>;
    case "tree":
      return <g><circle cx={x} cy={y-r*0.3} r={r*0.6} fill="none" stroke={color} strokeWidth="1.3" /><line x1={x} y1={y} x2={x} y2={y+r*0.7} stroke={color} strokeWidth="1.5" /></g>;
    case "house":
      return <g><rect x={x-r*0.7} y={y} width={r*1.4} height={r*0.9} fill="none" stroke={color} strokeWidth="1.3" /><path d={`M ${x-r*0.7} ${y} L ${x} ${y-r*0.7} L ${x+r*0.7} ${y}`} fill="none" stroke={color} strokeWidth="1.3" /></g>;
    case "moon":
      return <path d={`M ${x+r*0.3} ${y-r*0.7} a ${r*0.7} ${r*0.7} 0 1 0 0 ${r*1.4} a ${r*0.5} ${r*0.5} 0 1 1 0 -${r*1.4} z`} fill="none" stroke={color} strokeWidth="1.3" />;
    case "cloud":
      return <path d={`M ${x-r*0.7} ${y+r*0.3} q ${r*0.2} -${r*0.8} ${r*0.7} -${r*0.3} q ${r*0.2} -${r*0.6} ${r*0.7} -${r*0.1} q ${r*0.5} ${r*0.2} 0 ${r*0.5} z`} fill="none" stroke={color} strokeWidth="1.3" />;
    case "grid":
      return <g><rect x={x-r*0.7} y={y-r*0.7} width={r*1.4} height={r*1.4} fill="none" stroke={color} strokeWidth="1.2" /><line x1={x} y1={y-r*0.7} x2={x} y2={y+r*0.7} stroke={color} strokeWidth="1" /><line x1={x-r*0.7} y1={y} x2={x+r*0.7} y2={y} stroke={color} strokeWidth="1" /></g>;
    case "star":
      return <path d={`M ${x} ${y-r*0.8} L ${x+r*0.25} ${y-r*0.25} L ${x+r*0.8} ${y-r*0.25} L ${x+r*0.35} ${y+r*0.1} L ${x+r*0.5} ${y+r*0.7} L ${x} ${y+r*0.35} L ${x-r*0.5} ${y+r*0.7} L ${x-r*0.35} ${y+r*0.1} L ${x-r*0.8} ${y-r*0.25} L ${x-r*0.25} ${y-r*0.25} Z`} fill="none" stroke={color} strokeWidth="1.1" />;
    default:
      return <circle cx={x} cy={y} r={r*0.55} fill="none" stroke={color} strokeWidth="1.3" />;
  }
}

// Shared graph spec used in all variations
const NODES = [
  { id: "sun",     x: 200, y:  90, kind: "sun",   label: "sun",       group: 0, uses: 8, big: true },
  { id: "tree",    x: 130, y: 180, kind: "tree",  label: "tree",      group: 0, uses: 12, big: true },
  { id: "house",   x: 250, y: 240, kind: "house", label: "house",     group: 0, uses: 5 },
  { id: "moon",    x: 340, y: 130, kind: "moon",  label: "moon",      group: 1, uses: 3 },
  { id: "cloud",   x: 100, y:  80, kind: "cloud", label: "cloud-a",   group: 1, uses: 2 },
  { id: "cloud2",  x:  60, y: 250, kind: "cloud", label: "cloud-b",   group: 1, uses: 2 },
  { id: "star1",   x: 400, y:  70, kind: "star",  label: "star-sm",   group: 2, uses: 9 },
  { id: "star2",   x: 450, y: 180, kind: "star",  label: "star-lg",   group: 2, uses: 4 },
  { id: "grid",    x: 380, y: 260, kind: "grid",  label: "ref-grid",  group: 3, uses: 1 },
];
const EDGES = [
  ["sun","tree"], ["sun","cloud"], ["tree","house"], ["tree","cloud2"],
  ["moon","sun"], ["moon","star1"], ["star1","star2"], ["star2","house"],
  ["grid","house"], ["grid","star2"],
];
const groupColor = [ChangeColor.add.solid, ChangeColor.mov.solid, ChangeColor.sty.solid, SK_INK3];

function NodeGraph({ w = 540, h = 320, highlightId = "tree", showLabels = true }) {
  const byId = Object.fromEntries(NODES.map(n => [n.id, n]));
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{display:"block", width:"100%", height:h, background:"#fbf6ea", border:"1.25px dashed var(--rule)", borderRadius:3}}>
      {/* Edges */}
      {EDGES.map(([a, b], i) => {
        const A = byId[a], B = byId[b];
        const isHL = a === highlightId || b === highlightId;
        return (
          <line key={i} x1={A.x} y1={A.y} x2={B.x} y2={B.y}
            stroke={isHL ? SK_INK : SK_RULE}
            strokeWidth={isHL ? 1.5 : 1}
            opacity={isHL ? 0.85 : 0.55} />
        );
      })}
      {/* Nodes */}
      {NODES.map(n => {
        const r = 8 + Math.sqrt(n.uses) * 2.4;
        const isHL = n.id === highlightId;
        return (
          <g key={n.id}>
            <circle cx={n.x} cy={n.y} r={r}
              fill={isHL ? "#fff4b8" : "#fff"}
              stroke={groupColor[n.group]}
              strokeWidth={isHL ? 2 : 1.4}
              filter="url(#sketch)" />
            <ComponentGlyph x={n.x} y={n.y} r={r * 0.65} kind={n.kind} color={SK_INK} />
            {showLabels && (
              <text x={n.x} y={n.y + r + 12} textAnchor="middle"
                fontSize={isHL ? 11 : 10} fontFamily="IBM Plex Mono, monospace"
                fill={isHL ? SK_INK : SK_INK2}
                fontWeight={isHL ? 600 : 400}>
                {n.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function MemoryV1() {
  return (
    <VariationCard
      n="01"
      title="Full canvas · component sidebar"
      caption="<b>Most obsidian-like.</b> Big force-directed canvas of every component the project has seen. Left rail lists them in alphabetical/usage order with thumbnails. Click in list = zoom to node; click on node = highlight in list."
    >
      <div style={{display:"grid", gridTemplateColumns:"148px 1fr", gap:8}}>
        {/* Left sidebar */}
        <div style={{border:"1.25px solid var(--ink)", borderRadius:3, background:"#fff", padding:"6px 0", maxHeight:340, overflow:"hidden"}}>
          <div style={{padding:"2px 10px", fontFamily:"var(--mono)", fontSize:9, color:SK_INK3}}>COMPONENTS · {NODES.length}</div>
          <div style={{padding:"4px 10px"}}>
            <div style={{border:"1.25px solid var(--ink)", borderRadius:999, padding:"2px 8px", fontFamily:"var(--mono)", fontSize:10, background:"#fff"}}>
              🔍 filter…
            </div>
          </div>
          {NODES.slice().sort((a,b)=>b.uses-a.uses).map((n, i) => (
            <div key={n.id} style={{
              padding:"4px 10px", display:"flex", alignItems:"center", gap:8,
              background: n.id === "tree" ? "var(--hl)" : "transparent",
              fontFamily:"var(--mono)", fontSize:10.5,
              borderLeft: n.id === "tree" ? "3px solid var(--ink)" : "3px solid transparent",
            }}>
              <svg width="20" height="20" viewBox="-12 -12 24 24"><ComponentGlyph x={0} y={0} r={9} kind={n.kind} color={groupColor[n.group]} /></svg>
              <span style={{flex:1}}>{n.label}</span>
              <span style={{color:SK_INK3, fontSize:9.5}}>×{n.uses}</span>
            </div>
          ))}
        </div>
        {/* Canvas */}
        <div style={{position:"relative"}}>
          <NodeGraph h={340} />
          {/* Floating zoom + filter chips */}
          <div style={{position:"absolute", top:8, right:8, display:"flex", gap:4, fontFamily:"var(--mono)", fontSize:10}}>
            <span style={{padding:"2px 6px", background:"#fff", border:"1.25px solid var(--ink)", borderRadius:3}}>−</span>
            <span style={{padding:"2px 6px", background:"#fff", border:"1.25px solid var(--ink)", borderRadius:3}}>+</span>
            <span style={{padding:"2px 6px", background:"#fff", border:"1.25px solid var(--ink)", borderRadius:3}}>fit ⤢</span>
          </div>
          <div style={{position:"absolute", left:8, bottom:8, display:"flex", gap:6, fontFamily:"var(--mono)", fontSize:10}}>
            {["scenery","celestial","grids","stars"].map((g, i) => (
              <span key={g} style={{padding:"2px 8px", background:"#fff", border:"1.25px solid var(--ink)", borderRadius:999, display:"inline-flex", gap:5, alignItems:"center"}}>
                <span style={{width:7, height:7, borderRadius:"50%", background:groupColor[i % groupColor.length]}}></span>
                {g}
              </span>
            ))}
          </div>
        </div>
      </div>
    </VariationCard>
  );
}

function MemoryV2() {
  return (
    <VariationCard
      n="02"
      title="Split · graph + selected component detail"
      caption="Right panel becomes the <b>memory inspector</b>: where this component appears across branches/commits, last-edited diff, who touched it, and a one-click <b>re-insert into current canvas</b>. Treats the graph as navigation, the detail as the work."
    >
      <div style={{display:"grid", gridTemplateColumns:"1.4fr 1fr", gap:8}}>
        <div style={{position:"relative"}}>
          <NodeGraph h={340} highlightId="tree" />
        </div>
        <div style={{border:"1.25px solid var(--ink)", borderRadius:3, background:"#fff", padding:10, fontFamily:"var(--mono)", fontSize:11}}>
          <div style={{display:"flex", alignItems:"center", gap:8}}>
            <svg width="32" height="32" viewBox="-16 -16 32 32"><ComponentGlyph x={0} y={0} r={14} kind="tree" color={groupColor[0]} /></svg>
            <div>
              <div style={{fontFamily:"var(--hand)", fontSize:22, lineHeight:1}}>tree</div>
              <div style={{color:SK_INK3, fontSize:10}}>group: scenery · used 12× across 4 branches</div>
            </div>
          </div>
          <div style={{margin:"10px 0 6px", color:SK_INK3, fontSize:9}}>APPEARS IN</div>
          {[
            { b: "main",        when: "12d ago", s:"a17b"},
            { b: "feat/sunset", when: "2d ago",  s:"c4f3" },
            { b: "fix/moon",    when: "5d ago",  s:"11ab" },
            { b: "exp/grid",    when: "9d ago",  s:"ee01" },
          ].map(a => (
            <div key={a.b} style={{display:"flex", gap:8, padding:"3px 0", borderBottom:"1px dashed var(--rule)"}}>
              <span style={{flex:1}}><span style={{color:groupColor[0]}}>●</span> {a.b}</span>
              <span style={{color:SK_INK3}}>{a.s}</span>
              <span style={{color:SK_INK3, width:60, textAlign:"right"}}>{a.when}</span>
            </div>
          ))}
          <div style={{margin:"10px 0 6px", color:SK_INK3, fontSize:9}}>LAST EDIT</div>
          <svg viewBox="0 0 240 100" style={{display:"block", width:"100%", height:96, background:"#fbf6ea", border:"1px dashed var(--rule)"}}>
            <SampleArt x={4} y={4} w={232} h={92} state="after" overlay legend={{add:true,rem:true,mov:true,sty:true}} />
          </svg>
          <div style={{display:"flex", gap:6, marginTop:10}}>
            <span style={{flex:1, padding:"5px 8px", border:"1.5px solid var(--ink)", borderRadius:3, background:"#fff4b8", textAlign:"center"}}>
              ↘ re-insert into canvas
            </span>
            <span style={{padding:"5px 8px", border:"1.25px solid var(--ink)", borderRadius:3, background:"#fff"}}>↗ diff</span>
          </div>
        </div>
      </div>
    </VariationCard>
  );
}

function MemoryV3() {
  return (
    <VariationCard
      n="03"
      title="Canvas-first · hover preview, floating filters"
      caption="The graph IS the workspace. <b>Pan/zoom map</b>, filter chips float as a HUD, hovering a node pops a thumbnail with quick actions (re-insert / open in diff / jump to commit). Cleanest read; expects familiarity with graph UIs."
    >
      <div style={{position:"relative"}}>
        <NodeGraph h={380} highlightId="tree" />
        {/* Floating filter cluster */}
        <div style={{position:"absolute", top:10, left:10, display:"flex", gap:6, flexWrap:"wrap", fontFamily:"var(--mono)", fontSize:10}}>
          <span style={{padding:"3px 10px", border:"1.25px solid var(--ink)", borderRadius:999, background:"#fff4b8"}}>all components</span>
          {["used in main","this branch only","unused in 30d","by jane"].map(t => (
            <span key={t} style={{padding:"3px 10px", border:"1.25px solid var(--ink)", borderRadius:999, background:"#fff"}}>{t}</span>
          ))}
        </div>
        {/* Floating search */}
        <div style={{position:"absolute", top:10, right:10, padding:"3px 10px", border:"1.25px solid var(--ink)", borderRadius:999, background:"#fff", fontFamily:"var(--mono)", fontSize:10, width:180, textAlign:"center"}}>
          🔍 find a component…
        </div>
        {/* Hover preview card (anchored to "tree") */}
        <div style={{position:"absolute", left:180, top:215, width:160,
          background:"#fff", border:"1.5px solid var(--ink)", borderRadius:3,
          boxShadow:"3px 4px 0 rgba(0,0,0,0.18)", padding:8, fontFamily:"var(--mono)", fontSize:10}}>
          <div style={{fontFamily:"var(--hand)", fontSize:18, lineHeight:1, marginBottom:4}}>tree</div>
          <svg viewBox="0 0 140 60" style={{display:"block", width:"100%", height:54, background:"#fbf6ea", border:"1px dashed var(--rule)"}}>
            <ComponentGlyph x={70} y={30} r={20} kind="tree" color={SK_INK} />
          </svg>
          <div style={{color:SK_INK3, marginTop:4, fontSize:9.5}}>×12 · 4 branches</div>
          <div style={{display:"flex", gap:4, marginTop:6}}>
            <span style={{flex:1, padding:"2px 4px", border:"1.25px solid var(--ink)", borderRadius:3, background:"#fff4b8", fontSize:9.5, textAlign:"center"}}>insert</span>
            <span style={{flex:1, padding:"2px 4px", border:"1.25px solid var(--ink)", borderRadius:3, background:"#fff", fontSize:9.5, textAlign:"center"}}>diff</span>
            <span style={{padding:"2px 4px", border:"1.25px solid var(--ink)", borderRadius:3, background:"#fff", fontSize:9.5}}>⋯</span>
          </div>
        </div>
        {/* Bottom legend / scale */}
        <div style={{position:"absolute", bottom:10, left:10, fontFamily:"var(--mono)", fontSize:9.5, color:SK_INK3}}>
          node size = usage count · edge = co-used in same artwork
        </div>
      </div>
    </VariationCard>
  );
}

function MemoryArea() {
  return (
    <div className="grid">
      <MemoryV1 />
      <MemoryV2 />
      <MemoryV3 />
    </div>
  );
}

Object.assign(window, { MemoryArea });
