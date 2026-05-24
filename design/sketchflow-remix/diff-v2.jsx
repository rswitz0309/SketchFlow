/* Diff Screen — three equal panels + right-rail inspector. Hero. */

const CHANGES = [
  { id: "moon",  kind: "add", el: "#moon",     summary: "added",            detail: "new <path>, fill #fef3c7" },
  { id: "sun",   kind: "rem", el: "#sun",      summary: "removed",          detail: "was <circle r=42>" },
  { id: "tree",  kind: "mov", el: "#tree",     summary: "moved",            detail: "x: 182 → 258" },
  { id: "house", kind: "sty", el: "#house",    summary: "fill changed",     detail: "#fff → #e9cfa0" },
];

function DiffScreen() {
  const [legend, setLegend] = React.useState({ add:true, rem:true, mov:true, sty:true });
  const [selected, setSelected] = React.useState("tree");
  const hl = new Set([selected]);
  const visible = CHANGES.filter(c => legend[c.kind]);

  return (
    <div className="frame">
      <div className="frame-chrome">
        <span className="dots"><span></span><span></span><span></span></span>
        <span>graft · starfield.svg · diff</span>
      </div>

      {/* Toolbar */}
      <div style={{display:"flex", alignItems:"center", gap:12, padding:"12px 20px", borderBottom:"1px solid var(--rule)"}}>
        <span style={{fontFamily:"var(--mono)", fontSize:11, color:"var(--ink-3)"}}>Compare</span>
        <button className="btn sm">a17b · background <span style={{color:"var(--ink-3)", marginLeft:4}}>▾</span></button>
        <span style={{color:"var(--ink-4)"}}>→</span>
        <button className="btn sm">c4f3 · sunset <span style={{color:"var(--ink-3)", marginLeft:4}}>▾</span></button>
        <button className="btn sm ghost" title="swap">⇄</button>

        <div style={{width:1, height:18, background:"var(--rule)"}}></div>

        <span style={{fontFamily:"var(--mono)", fontSize:11, color:"var(--ink-3)"}}>Show</span>
        {[
          { k:"add", label:"added" },
          { k:"rem", label:"removed" },
          { k:"mov", label:"moved" },
          { k:"sty", label:"restyled" },
        ].map(it => (
          <button key={it.k} className={`pill ${it.k}`}
            data-on={legend[it.k] ? "true" : "false"}
            onClick={() => setLegend({ ...legend, [it.k]: !legend[it.k] })}>
            <span className="sw"></span> {it.label}
          </button>
        ))}

        <div style={{marginLeft:"auto", display:"flex", gap:8, alignItems:"center"}}>
          <span className="mono" style={{fontSize:11, color:"var(--ink-3)"}}>{visible.length} of {CHANGES.length} changes</span>
          <button className="btn sm">Export ⤓</button>
        </div>
      </div>

      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr 280px"}}>
        {/* Three canvas panels */}
        {[
          { label: "Before", commit: "a17b · background", state: "before" },
          { label: "After",  commit: "c4f3 · sunset",     state: "after"  },
          { label: "Diff overlay", commit: "ghost = old position", overlay: true },
        ].map((p, i) => (
          <div key={i} style={{borderRight: i < 3 ? "1px solid var(--rule)" : "none", display:"flex", flexDirection:"column"}}>
            <div style={{padding:"10px 14px", borderBottom:"1px solid var(--rule)", display:"flex", alignItems:"baseline", gap:8}}>
              <span style={{fontSize:12, fontWeight:600}}>{p.label}</span>
              <span className="mono" style={{fontSize:10.5, color:"var(--ink-3)", marginLeft:"auto"}}>{p.commit}</span>
            </div>
            <div style={{flex:1, background:"#fcfcfd", padding:14, minHeight:380}}>
              <svg viewBox="0 0 280 280" style={{display:"block", width:"100%", height:"100%", maxHeight:380, background:"var(--surface)", border:"1px solid var(--rule)", borderRadius:4}}>
                <SampleArt x={14} y={14} w={252} h={252}
                  state={p.state || "after"} overlay={p.overlay}
                  highlight={p.overlay ? hl : new Set()}
                  legend={legend} />
              </svg>
            </div>
          </div>
        ))}

        {/* Right rail */}
        <aside style={{borderLeft:"1px solid var(--rule)", background:"#fcfcfc", display:"flex", flexDirection:"column"}}>
          <div style={{padding:"10px 14px", borderBottom:"1px solid var(--rule)", display:"flex", alignItems:"baseline"}}>
            <span style={{fontSize:12, fontWeight:600}}>Changes</span>
            <span className="mono" style={{fontSize:10.5, color:"var(--ink-3)", marginLeft:"auto"}}>{visible.length}</span>
          </div>

          <div style={{padding:"10px 14px 6px"}}>
            <input type="text" placeholder="Filter by element…"
              style={{width:"100%", padding:"6px 10px", border:"1px solid var(--rule-strong)", borderRadius:4, fontSize:12, fontFamily:"var(--sans)", background:"var(--surface)"}} />
          </div>

          <div style={{overflow:"auto", flex:1}}>
            {visible.map(c => {
              const isSel = c.id === selected;
              return (
                <button key={c.id}
                  onClick={() => setSelected(c.id)}
                  style={{
                    width:"100%", textAlign:"left", display:"flex", gap:10, alignItems:"flex-start",
                    padding:"10px 14px", border:"none",
                    borderBottom:"1px solid var(--rule)",
                    background: isSel ? "#eef2ff" : "transparent",
                    borderLeft: isSel ? "3px solid var(--accent)" : "3px solid transparent",
                    cursor:"pointer",
                  }}>
                  <span style={{width:8, height:8, marginTop:6, borderRadius:"50%", background: `var(--${c.kind === "add" ? "add" : c.kind === "rem" ? "rem" : c.kind === "mov" ? "mov" : "sty"})`, flex:"0 0 auto"}}></span>
                  <div style={{minWidth:0, flex:1}}>
                    <div className="mono" style={{fontSize:12, fontWeight:500, color:"var(--ink)"}}>{c.el}</div>
                    <div style={{fontSize:11, color:"var(--ink-3)", marginTop:2}}>
                      {c.summary} · <span className="mono">{c.detail}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Inspector */}
          <div style={{borderTop:"1px solid var(--rule)", padding:"12px 14px", background:"var(--surface-2)"}}>
            <div className="mono" style={{fontSize:10, letterSpacing:"0.06em", textTransform:"uppercase", color:"var(--ink-3)", marginBottom:6}}>
              Inspector
            </div>
            <div className="mono" style={{fontSize:12, marginBottom:4}}>{CHANGES.find(c => c.id === selected)?.el}</div>
            <div style={{fontSize:11.5, color:"var(--ink-2)"}}>
              {CHANGES.find(c => c.id === selected)?.summary} — {CHANGES.find(c => c.id === selected)?.detail}
            </div>
            <div style={{display:"flex", gap:6, marginTop:10}}>
              <button className="btn sm">Open in canvas</button>
              <button className="btn sm ghost">Discard change</button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

Object.assign(window, { DiffScreen, CHANGES });
