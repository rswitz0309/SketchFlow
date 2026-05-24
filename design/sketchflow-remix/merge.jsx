/* MERGE VIEW — 3 variations.
   Common shape: 3-way (theirs/base/mine) view, auto-merged shown as resolved,
   conflict list w/ per-conflict theirs|mine + manual fix, complete merge action.
*/

function MergePanelMini({ x, y, w, h, label, state, overlay, accent, footer }) {
  return (
    <g>
      <RBox x={x} y={y} w={w} h={h} fill="#fff" sw={1.3} />
      <text x={x + 8} y={y + 14} fontSize="9" fontFamily="IBM Plex Mono, monospace" fill={SK_INK3}>{label}</text>
      <SampleArt x={x + 6} y={y + 18} w={w - 12} h={h - 30} state={state} overlay={overlay} legend={{add:true,rem:true,mov:true,sty:true}} />
      {accent && (
        <rect x={x} y={y} width={w} height={h} fill="none" stroke={accent} strokeWidth="2" />
      )}
      {footer && (
        <text x={x + 8} y={y + h - 4} fontSize="8.5" fontFamily="IBM Plex Mono, monospace" fill={SK_INK3}>{footer}</text>
      )}
    </g>
  );
}

const CONFLICTS = [
  { id: "celest", el: "#celestial", a: "moon (theirs)", b: "sun (mine)", auto: false },
  { id: "house",  el: "#house.fill", a: "#3a3", b: "#e9cfa0", auto: false },
];
const AUTO_OK = [
  { el: "#sky-gradient", note: "added (no conflict)" },
  { el: "#tree.position", note: "moved (no conflict)" },
  { el: "#cloud", note: "removed (no conflict)" },
];

function MergeV1() {
  return (
    <VariationCard
      n="01"
      title="Three-pane top · conflict list below"
      caption="<b>Recommended baseline.</b> Theirs / Base / Mine stack horizontally with the resulting preview implicit below. Auto-resolved items collapse into a single confirmation row. Each conflict is its own expanded row with theirs/mine previews and a manual fix link."
    >
      <div style={{display:"flex", gap:8, margin:"2px 4px 8px", fontFamily:"var(--mono)", fontSize:11}}>
        <span style={{padding:"3px 8px", border:"1.25px solid var(--ink)", borderRadius:3, background:"#fff"}}>merge: <b>feat/sunset</b> ← <b>fix/moon</b></span>
        <span style={{padding:"3px 8px", border:"1.25px solid var(--ink)", borderRadius:3, background:"#fff"}}>base: <b>a17b</b></span>
        <span style={{marginLeft:"auto", padding:"3px 8px", border:"1.5px solid var(--ink)", borderRadius:3, background:"#d9e9d4", color:SK_INK3}}>
          ✓ complete merge <span style={{color:SK_INK3, marginLeft:4}}>(2 conflicts left)</span>
        </span>
      </div>

      {/* Three panels */}
      <svg viewBox="0 0 580 130" style={{display:"block", width:"100%", height:130, background:"#fbf6ea", border:"1.25px dashed var(--rule)", borderRadius:3}}>
        <MergePanelMini x={8}   y={6} w={184} h={118} label="THEIRS · fix/moon"   state="after"  accent={ChangeColor.mov.solid} />
        <MergePanelMini x={198} y={6} w={184} h={118} label="BASE · a17b"         state="before" />
        <MergePanelMini x={388} y={6} w={184} h={118} label="MINE · feat/sunset"  state="after"  accent={ChangeColor.add.solid} />
      </svg>

      {/* Auto-resolved row */}
      <div style={{margin:"10px 0 4px", padding:"6px 10px", border:"1.25px solid var(--ink)",
        borderRadius:3, background:"#e7efde", fontFamily:"var(--mono)", fontSize:11}}>
        ✓ <b>{AUTO_OK.length} changes auto-merged</b> &nbsp;
        <span style={{color:SK_INK3}}>{AUTO_OK.map(a => a.el).join(" · ")}</span>
        <span style={{float:"right", color:SK_INK3}}>expand ▾</span>
      </div>

      {/* Conflict rows */}
      {CONFLICTS.map((c, i) => (
        <div key={c.id} style={{margin:"8px 0", border:"1.5px solid var(--ink)", borderRadius:3, background:"#fff"}}>
          <div style={{padding:"5px 10px", borderBottom:"1px dashed var(--rule)", fontFamily:"var(--mono)", fontSize:11, display:"flex", gap:8, alignItems:"center"}}>
            <span style={{width:9, height:9, borderRadius:"50%", background: ChangeColor.rem.solid}}></span>
            <b>conflict on {c.el}</b>
            <span style={{color:SK_INK3}}>· {c.a} ↔ {c.b}</span>
            <span style={{marginLeft:"auto", color:SK_INK3}}>{i === 0 ? "unresolved" : "unresolved"}</span>
          </div>
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:0}}>
            <div style={{padding:8, borderRight:"1px dashed var(--rule)"}}>
              <div style={{fontFamily:"var(--mono)", fontSize:9, color:SK_INK3, marginBottom:4}}>USE THEIRS · {c.a}</div>
              <svg viewBox="0 0 220 80" style={{display:"block", width:"100%", height:78}}>
                <SampleArt x={4} y={4} w={212} h={72} state={i === 0 ? "after" : "before"} />
              </svg>
            </div>
            <div style={{padding:8}}>
              <div style={{fontFamily:"var(--mono)", fontSize:9, color:SK_INK3, marginBottom:4}}>USE MINE · {c.b}</div>
              <svg viewBox="0 0 220 80" style={{display:"block", width:"100%", height:78}}>
                <SampleArt x={4} y={4} w={212} h={72} state="after" />
              </svg>
            </div>
          </div>
          <div style={{padding:"5px 10px", borderTop:"1px dashed var(--rule)", display:"flex", gap:8, fontFamily:"var(--mono)", fontSize:11}}>
            <span style={{padding:"2px 8px", border:"1.25px solid var(--ink)", borderRadius:3, background:"#fff"}}>use theirs</span>
            <span style={{padding:"2px 8px", border:"1.25px solid var(--ink)", borderRadius:3, background:"#fff"}}>use mine</span>
            <span style={{padding:"2px 8px", border:"1.25px solid var(--ink)", borderRadius:3, background:"#fff", color:SK_INK3}}>open manual fix in editor →</span>
          </div>
        </div>
      ))}
    </VariationCard>
  );
}

function MergeV2() {
  return (
    <VariationCard
      n="02"
      title="Conflict list left · focused canvas"
      caption="<b>Master/detail.</b> Conflict list dominates the left; pick one and the right side becomes a big three-pane focused canvas just for that element, with theirs/mine swatches as toggleable options and a manual-fix slot. Better when conflicts are gnarly and each deserves attention."
    >
      <div style={{display:"flex", gap:8, margin:"2px 4px 8px", fontFamily:"var(--mono)", fontSize:11}}>
        <span style={{padding:"3px 8px", border:"1.25px solid var(--ink)", borderRadius:3, background:"#fff"}}>merge: <b>feat/sunset</b> ← <b>fix/moon</b></span>
        <span style={{marginLeft:"auto", padding:"3px 8px", border:"1.5px solid var(--ink)", borderRadius:3, background:"#d9e9d4", color:SK_INK3}}>✓ complete merge <span style={{color:SK_INK3, marginLeft:4}}>(2 left)</span></span>
      </div>
      <div style={{display:"grid", gridTemplateColumns:"180px 1fr", gap:8}}>
        {/* Left list */}
        <div style={{border:"1.25px solid var(--ink)", background:"#fff", borderRadius:3, padding:"6px 0"}}>
          <div style={{padding:"2px 10px", fontFamily:"var(--mono)", fontSize:9, color:SK_INK3}}>CONFLICTS · 2</div>
          {CONFLICTS.map((c, i) => (
            <div key={c.id} style={{padding:"6px 10px", borderTop:"1px dashed var(--rule)",
              background: i === 0 ? "var(--hl)" : "transparent", fontFamily:"var(--mono)", fontSize:10.5,
              borderLeft: i === 0 ? "3px solid var(--ink)" : "3px solid transparent"}}>
              <div style={{display:"flex", gap:6, alignItems:"center"}}>
                <span style={{width:8, height:8, borderRadius:"50%", background:ChangeColor.rem.solid}}></span>
                <b>{c.el}</b>
              </div>
              <div style={{color:SK_INK3, marginTop:2, fontSize:9.5}}>{c.a} ↔ {c.b}</div>
            </div>
          ))}
          <div style={{padding:"2px 10px", fontFamily:"var(--mono)", fontSize:9, color:SK_INK3, marginTop:10, borderTop:"1px solid var(--ink)"}}>AUTO-MERGED · 3</div>
          {AUTO_OK.map(a => (
            <div key={a.el} style={{padding:"4px 10px", fontFamily:"var(--mono)", fontSize:10, color:SK_INK3}}>
              ✓ {a.el}
            </div>
          ))}
        </div>
        {/* Right focused canvas */}
        <div style={{border:"1.25px solid var(--ink)", background:"#fff", borderRadius:3, padding:8}}>
          <div style={{fontFamily:"var(--mono)", fontSize:10, marginBottom:6}}>
            <b>conflict · #celestial</b>  <span style={{color:SK_INK3}}>moon (theirs) vs sun (mine)</span>
          </div>
          <svg viewBox="0 0 380 140" style={{display:"block", width:"100%", height:140}}>
            <MergePanelMini x={4}   y={4} w={120} h={130} label="THEIRS"  state="after"  accent={ChangeColor.mov.solid} />
            <MergePanelMini x={130} y={4} w={120} h={130} label="BASE"    state="before" />
            <MergePanelMini x={256} y={4} w={120} h={130} label="MINE"    state="after"  accent={ChangeColor.add.solid} />
          </svg>
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6, marginTop:8, fontFamily:"var(--mono)", fontSize:10.5}}>
            <div style={{padding:"5px 8px", border:"1.5px solid var(--mov, #4a6fc7)", borderRadius:3, background:"rgba(74,111,199,0.08)", textAlign:"center"}}>
              <b>use theirs</b><br/><span style={{color:SK_INK3}}>moon</span>
            </div>
            <div style={{padding:"5px 8px", border:"1.5px solid var(--add)", borderRadius:3, background:"rgba(120,170,90,0.12)", textAlign:"center"}}>
              <b>use mine</b><br/><span style={{color:SK_INK3}}>sun</span>
            </div>
            <div style={{padding:"5px 8px", border:"1.25px dashed var(--ink)", borderRadius:3, background:"#fff4b8", textAlign:"center"}}>
              <b>manual fix</b><br/><span style={{color:SK_INK3}}>edit in canvas →</span>
            </div>
          </div>
        </div>
      </div>
    </VariationCard>
  );
}

function MergeV3() {
  return (
    <VariationCard
      n="03"
      title="Sequential wizard · one conflict at a time"
      caption="<b>Guided.</b> Strips merge to a series of decisions: full-canvas theirs/mine cards, big keys to pick, progress dots at the bottom. Slowest in raw clicks, but lowest cognitive load for new users and predictable for batch merges."
    >
      <div style={{display:"flex", gap:8, margin:"2px 4px 8px", fontFamily:"var(--mono)", fontSize:11, alignItems:"center"}}>
        <span style={{padding:"3px 8px", border:"1.25px solid var(--ink)", borderRadius:3, background:"#fff"}}>merge: <b>feat/sunset</b> ← <b>fix/moon</b></span>
        <span style={{marginLeft:"auto", fontFamily:"var(--hand)", fontSize:18}}>conflict 1 of 2 →</span>
      </div>
      <div style={{textAlign:"center", margin:"4px 0 10px", fontFamily:"var(--hand)", fontSize:22, color:SK_INK}}>
        what should <b style={{color:ChangeColor.rem.solid}}>#celestial</b> become?
      </div>
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10}}>
        {[
          { label: "THEIRS · fix/moon",   subtitle: "show the moon",  accent: ChangeColor.mov.solid, side: "theirs", state: "after" },
          { label: "MINE · feat/sunset",  subtitle: "show the sun",   accent: ChangeColor.add.solid, side: "mine",   state: "before" },
        ].map((p, i) => (
          <div key={i} style={{border:"1.5px solid var(--ink)", borderRadius:3, background:"#fff", padding:10, textAlign:"center", boxShadow: i === 0 ? "3px 4px 0 var(--ink)" : "none"}}>
            <div style={{fontFamily:"var(--mono)", fontSize:9, color:SK_INK3, marginBottom:6}}>{p.label}</div>
            <svg viewBox="0 0 260 130" style={{display:"block", width:"100%", height:130}}>
              <SampleArt x={6} y={6} w={248} h={118} state={p.state} />
              <rect x={2} y={2} width={256} height={126} fill="none" stroke={p.accent} strokeWidth="2" />
            </svg>
            <div style={{fontFamily:"var(--hand)", fontSize:18, margin:"8px 0 6px"}}>{p.subtitle}</div>
            <div style={{padding:"4px 10px", border:"1.5px solid var(--ink)", borderRadius:3, background:"#fff4b8", display:"inline-block", fontFamily:"var(--mono)", fontSize:11}}>
              keep {p.side}
            </div>
          </div>
        ))}
      </div>
      <div style={{display:"flex", gap:8, justifyContent:"center", alignItems:"center", marginTop:12, fontFamily:"var(--mono)", fontSize:11}}>
        <span style={{padding:"3px 8px", border:"1.25px dashed var(--ink)", borderRadius:3, color:SK_INK3}}>↻ manual fix</span>
        <span style={{flex:1, height:1, borderTop:"1px dashed var(--rule)"}}></span>
        {[1,2].map(n => (
          <span key={n} style={{width:14, height:14, borderRadius:"50%", border:"1.25px solid var(--ink)", background: n === 1 ? "var(--ink)" : "#fff", display:"inline-flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:8}}>{n}</span>
        ))}
        <span style={{flex:1, height:1, borderTop:"1px dashed var(--rule)"}}></span>
        <span style={{padding:"3px 8px", border:"1.5px solid var(--ink)", borderRadius:3, background:"#fff4b8"}}>next →</span>
      </div>
    </VariationCard>
  );
}

function MergeArea() {
  return (
    <div className="grid">
      <MergeV1 />
      <MergeV2 />
      <MergeV3 />
    </div>
  );
}

Object.assign(window, { MergeArea });
