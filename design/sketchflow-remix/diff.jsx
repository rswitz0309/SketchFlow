/* DIFF VIEW — the hero screen. 3 variations.
   Mild interactivity in V1: clicking a change-list entry highlights the matching
   element on the overlay panel.
*/

// Shared model for the change list — same items across variations
const CHANGES = [
  { id: "sun",   kind: "rem", el: "#sun",      note: "removed" },
  { id: "moon",  kind: "add", el: "#moon",     note: "added" },
  { id: "tree",  kind: "mov", el: "#tree",     note: "moved x:182→258" },
  { id: "house", kind: "sty", el: "#house",    note: "fill: #fff → #e9cfa0" },
];

function Legend({ legend, setLegend }) {
  const items = [
    { k: "add", label: "added"    },
    { k: "rem", label: "removed"  },
    { k: "mov", label: "moved"    },
    { k: "sty", label: "restyled" },
  ];
  return (
    <div className="legend-row">
      {items.map(it => (
        <div key={it.k} className={`chip ${it.k}`}
             data-on={legend[it.k] ? "true" : "false"}
             onClick={() => setLegend({ ...legend, [it.k]: !legend[it.k] })}>
          <span className="sw"></span> {it.label}
        </div>
      ))}
    </div>
  );
}

function CommitPickerRow() {
  return (
    <div style={{display:"flex", gap:8, margin:"4px 4px 8px", fontFamily:"var(--mono)", fontSize:11, color:"var(--ink-2)"}}>
      <span style={{padding:"3px 8px", border:"1.25px solid var(--ink)", borderRadius:3, background:"#fff"}}>base: <b>a17b · background</b> ▾</span>
      <span style={{color:"var(--ink-3)"}}>↔</span>
      <span style={{padding:"3px 8px", border:"1.25px solid var(--ink)", borderRadius:3, background:"#fff"}}>compare: <b>c4f3 · sunset</b> ▾</span>
      <span style={{marginLeft:"auto", color:"var(--ink-3)"}}>swap ⇄</span>
    </div>
  );
}

function DiffV1() {
  const [legend, setLegend] = React.useState({ add:true, rem:true, mov:true, sty:true });
  const [selected, setSelected] = React.useState("tree");
  const hl = new Set([selected]);

  return (
    <VariationCard
      n="01"
      title="Three equal panels · right-rail inspector"
      caption="<b>Canonical layout.</b> Before / After / Diff overlay are equal-weight columns. Legend chips above act as filters — toggle a change-type to mute it in the overlay. Right rail is the change list; click an entry to focus that element in the overlay (try it →)."
    >
      <CommitPickerRow />
      <Legend legend={legend} setLegend={setLegend} />
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr 150px", gap:6, alignItems:"stretch"}}>
        {/* Three panels */}
        {[
          { state: "before", label: "BEFORE  ·  a17b" },
          { state: "after",  label: "AFTER  ·  c4f3" },
          { state: null,     label: "DIFF OVERLAY",   overlay: true },
        ].map((p, i) => (
          <div key={i} style={{border:"1.25px solid var(--ink)", background:"#fff", borderRadius:3, position:"relative", minHeight:230}}>
            <div style={{fontFamily:"var(--mono)", fontSize:9, color:"var(--ink-3)", padding:"3px 6px", borderBottom:"1px dashed var(--rule)"}}>{p.label}</div>
            <svg viewBox="0 0 240 200" style={{display:"block", width:"100%", height:200}}>
              <SampleArt x={8} y={8} w={224} h={184}
                state={p.state || "after"} overlay={p.overlay}
                highlight={p.overlay ? hl : new Set()}
                legend={legend} />
            </svg>
          </div>
        ))}
        {/* Right rail */}
        <div style={{border:"1.25px solid var(--ink)", background:"#fff", borderRadius:3, minHeight:230, display:"flex", flexDirection:"column"}}>
          <div style={{fontFamily:"var(--mono)", fontSize:9, color:"var(--ink-3)", padding:"3px 6px", borderBottom:"1px dashed var(--rule)"}}>
            CHANGES · {CHANGES.length}
          </div>
          <ul className="changelist" style={{flex:1}}>
            {CHANGES.map(c => (
              <li key={c.id} className={`${c.kind} ${selected === c.id ? "selected" : ""}`}
                  onClick={() => setSelected(c.id)}>
                <span className="dot"></span>
                <span>
                  <b style={{fontWeight:600}}>{c.el}</b><br/>
                  <span style={{color:"var(--ink-3)"}}>{c.note}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </VariationCard>
  );
}

function DiffV2() {
  const [legend, setLegend] = React.useState({ add:true, rem:true, mov:true, sty:true });
  return (
    <VariationCard
      n="02"
      title="Overlay-dominant · thumbnails + drawer"
      caption="The <b>diff overlay takes the full stage</b>, with Before/After as smaller reference thumbnails up top. Change list moves to a bottom drawer (expandable). Use when the diff IS the document and you only glance at the source states."
    >
      <CommitPickerRow />
      <Legend legend={legend} setLegend={setLegend} />
      <svg viewBox="0 0 580 280" className="canvas" preserveAspectRatio="xMidYMid meet"
           style={{height:280, background:"#fff"}}>
        {/* Thumbnails on top */}
        <text x={14} y={14} fontSize="8" fill={SK_INK3} fontFamily="IBM Plex Mono, monospace">BEFORE · a17b</text>
        <SampleArt x={10} y={20} w={120} h={80} state="before" />
        <text x={140} y={14} fontSize="8" fill={SK_INK3} fontFamily="IBM Plex Mono, monospace">AFTER · c4f3</text>
        <SampleArt x={136} y={20} w={120} h={80} state="after" />

        {/* Hero overlay panel */}
        <text x={270} y={14} fontSize="8" fill={SK_INK3} fontFamily="IBM Plex Mono, monospace">DIFF OVERLAY  (hero)</text>
        <SampleArt x={266} y={20} w={302} h={180} state="after" overlay legend={legend} />

        {/* Bottom drawer hint */}
        <RBox x={10} y={210} w={558} h={62} fill="#f7eccc" sw={1.25} />
        <text x={20} y={226} fontSize="9" fill={SK_INK3} fontFamily="IBM Plex Mono, monospace">CHANGES ▴ (drag up to expand)</text>
        {/* Change list as compact row */}
        {CHANGES.map((c, i) => (
          <g key={c.id} transform={`translate(${20 + i*135}, 238)`}>
            <circle cx={5} cy={6} r={4} fill={ChangeColor[c.kind].solid} />
            <text x={14} y={9} fontSize="10" fontFamily="IBM Plex Mono, monospace" fill={SK_INK}>{c.el}</text>
            <text x={14} y={22} fontSize="9" fill={SK_INK3} fontFamily="IBM Plex Mono, monospace">{c.note}</text>
          </g>
        ))}

        <StickyNote x={310} y={108} w={130} h={26} text="ghost = old position" rot={-3} />
      </svg>
    </VariationCard>
  );
}

function DiffV3() {
  const [legend, setLegend] = React.useState({ add:true, rem:true, mov:true, sty:true });
  const [scrub, setScrub] = React.useState(50);
  const [overlayOn, setOverlayOn] = React.useState(true);

  return (
    <VariationCard
      n="03"
      title="Scrubber · Before ↔ After + overlay toggle"
      caption="Two panels — <b>a single Before/After canvas with a scrubber handle</b> you drag across, plus a separate overlay panel that toggles on/off. Change list is a floating, dismissible card. Reads more like Figma's diff and feels good for spot-checks."
    >
      <CommitPickerRow />
      <div style={{display:"flex", gap:8, alignItems:"center", margin:"4px 4px 8px"}}>
        <Legend legend={legend} setLegend={setLegend} />
        <label style={{marginLeft:"auto", fontFamily:"var(--mono)", fontSize:11, display:"flex", alignItems:"center", gap:6, cursor:"pointer"}}
               onClick={() => setOverlayOn(!overlayOn)}>
          <span style={{display:"inline-block", width:12, height:12, border:"1.25px solid var(--ink)",
            background: overlayOn ? "var(--ink)" : "transparent"}}></span>
          show diff overlay
        </label>
      </div>
      <div style={{display:"grid", gridTemplateColumns:"1.4fr 1fr", gap:8, position:"relative"}}>
        {/* Scrubber panel */}
        <div style={{border:"1.25px solid var(--ink)", background:"#fff", borderRadius:3, position:"relative"}}>
          <div style={{fontFamily:"var(--mono)", fontSize:9, color:"var(--ink-3)", padding:"3px 6px", borderBottom:"1px dashed var(--rule)"}}>BEFORE ⇆ AFTER (scrub →)</div>
          <svg viewBox="0 0 320 200" style={{display:"block", width:"100%", height:200}}>
            <defs>
              <clipPath id="clip-before"><rect x="0" y="0" width={(scrub/100)*320} height="200" /></clipPath>
              <clipPath id="clip-after"><rect x={(scrub/100)*320} y="0" width={320 - (scrub/100)*320} height="200" /></clipPath>
            </defs>
            <g clipPath="url(#clip-before)">
              <SampleArt x={8} y={8} w={304} h={184} state="before" />
            </g>
            <g clipPath="url(#clip-after)">
              <SampleArt x={8} y={8} w={304} h={184} state="after" />
            </g>
            <line x1={(scrub/100)*320} y1={0} x2={(scrub/100)*320} y2={200}
              stroke={SK_INK} strokeWidth="1.5" strokeDasharray="4 3" />
            <circle cx={(scrub/100)*320} cy={100} r={9} fill="#fff4b8" stroke={SK_INK} strokeWidth="1.5" />
            <text x={(scrub/100)*320} y={104} textAnchor="middle" fontSize="10" fill={SK_INK} fontFamily="Caveat, cursive">⇄</text>
            <text x={10} y={196} fontSize="8" fill={SK_INK3} fontFamily="IBM Plex Mono, monospace">a17b</text>
            <text x={310} y={196} textAnchor="end" fontSize="8" fill={SK_INK3} fontFamily="IBM Plex Mono, monospace">c4f3</text>
          </svg>
          <input type="range" min="0" max="100" value={scrub}
            onChange={e => setScrub(+e.target.value)}
            style={{width:"94%", margin:"4px 3% 6px", display:"block", accentColor:SK_INK}} />
        </div>

        {/* Overlay panel */}
        <div style={{border:"1.25px solid var(--ink)", background:overlayOn ? "#fff" : "#f6efdb", borderRadius:3, position:"relative"}}>
          <div style={{fontFamily:"var(--mono)", fontSize:9, color:"var(--ink-3)", padding:"3px 6px", borderBottom:"1px dashed var(--rule)"}}>DIFF OVERLAY {!overlayOn && "(off)"}</div>
          <svg viewBox="0 0 240 200" style={{display:"block", width:"100%", height:200, opacity: overlayOn ? 1 : 0.25}}>
            <SampleArt x={8} y={8} w={224} h={184} state="after" overlay legend={legend} />
          </svg>
          {/* Floating changelist card */}
          <div style={{position:"absolute", right:8, bottom:8, width:138, background:"#fff4b8",
            border:"1.25px solid var(--ink)", borderRadius:3, padding:"6px 8px",
            boxShadow:"1.5px 2px 0 rgba(0,0,0,0.18)", fontFamily:"var(--mono)", fontSize:10}}>
            <div style={{fontFamily:"var(--hand)", fontSize:14, marginBottom:2}}>changes (4) <span style={{float:"right", color:SK_INK3}}>×</span></div>
            {CHANGES.map(c => (
              <div key={c.id} style={{display:"flex", gap:6, alignItems:"center", lineHeight:1.3}}>
                <span style={{width:7, height:7, borderRadius:"50%", background:ChangeColor[c.kind].solid, flex:"0 0 auto"}}></span>
                <span style={{whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{c.el}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </VariationCard>
  );
}

function DiffArea() {
  return (
    <div className="grid" style={{gridTemplateColumns:"repeat(3, minmax(580px, 1fr))"}}>
      <DiffV1 />
      <DiffV2 />
      <DiffV3 />
    </div>
  );
}

Object.assign(window, { DiffArea });
