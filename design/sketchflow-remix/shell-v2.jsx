/* Sketch Canvas — the actual drawing surface. Git is one click away on the left. */

function ShellScreen({ goTo }) {
  const [tool, setTool] = React.useState("pencil");
  const tools = [
    { id: "pencil",  glyph: "✎", label: "Pencil" },
    { id: "ink",     glyph: "✒", label: "Ink" },
    { id: "brush",   glyph: "❦", label: "Brush" },
    { id: "eraser",  glyph: "⌫", label: "Eraser" },
    { id: "fill",    glyph: "▣", label: "Fill" },
    { id: "select",  glyph: "◰", label: "Select" },
  ];
  const layers = [
    { id: 0, name: "sky",      visible: true,  locked: false, kind: "art" },
    { id: 1, name: "horizon",  visible: true,  locked: false, kind: "art" },
    { id: 2, name: "tree",     visible: true,  locked: false, kind: "art", dirty: true },
    { id: 3, name: "house",    visible: true,  locked: false, kind: "art" },
    { id: 4, name: "moon",     visible: true,  locked: false, kind: "art", dirty: true },
    { id: 5, name: "ref/grid", visible: false, locked: true,  kind: "ref" },
  ];

  return (
    <div className="frame">
      <div className="frame-chrome">
        <span className="dots"><span></span><span></span><span></span></span>
        <span>graft · starfield.svg · sketch</span>
        <span style={{marginLeft:"auto", color:"var(--ink-3)"}}>2 unsaved layers · last commit 2d ago</span>
      </div>

      <div className="frame-body" style={{display:"grid", gridTemplateColumns:"232px 56px 1fr 240px", minHeight: 620}}>
        {/* Git rail (left) */}
        <aside style={{borderRight:"1px solid var(--rule)", background:"#fcfdff", display:"flex", flexDirection:"column"}}>
          <div style={{padding:"14px 14px 8px"}}>
            <div style={{fontFamily:"var(--mono)", fontSize:9, color:"var(--ink-3)", letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:6}}>Project</div>
            <div style={{display:"flex", alignItems:"center", gap:8, padding:"7px 10px", border:"1px solid var(--rule-strong)", borderRadius:6, background:"var(--surface)", fontSize:12.5}}>
              <span style={{color:"var(--ink-3)"}}>▸</span> starfield.svg <span style={{marginLeft:"auto", color:"var(--ink-3)"}}>▾</span>
            </div>
          </div>

          <div style={{padding:"6px 14px 8px"}}>
            <div style={{fontFamily:"var(--mono)", fontSize:9, color:"var(--ink-3)", letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:6}}>Branch</div>
            <div style={{display:"flex", alignItems:"center", gap:8, padding:"7px 10px", border:"1px solid var(--rule-strong)", borderRadius:6, background:"var(--surface)", fontSize:12.5}}>
              <span style={{width:8, height:8, borderRadius:"50%", background:"var(--accent)"}}></span>
              feat/sunset
              <span style={{marginLeft:"auto", color:"var(--ink-3)"}}>▾</span>
            </div>
          </div>

          {/* Commit composer — the focal point */}
          <div style={{margin:"4px 14px 10px", padding:12, border:"1px solid var(--accent)", borderRadius:8, background:"#eff5ff"}}>
            <div style={{fontFamily:"var(--mono)", fontSize:9, color:"var(--accent-2, #1d4ed8)", letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:8}}>
              Uncommitted ●
            </div>
            <textarea placeholder="describe this checkpoint…"
              style={{
                width:"100%", height:48, resize:"vertical",
                fontFamily:"var(--sans)", fontSize:12.5,
                padding:"7px 9px",
                border:"1px solid var(--rule-strong)", borderRadius:5,
                background:"var(--surface)",
              }}
              defaultValue="add sunset gradient" />
            <div style={{display:"flex", gap:6, marginTop:8}}>
              <button className="btn primary sm" style={{flex:1, justifyContent:"center"}}>✓ Commit</button>
              <button className="btn sm" title="discard">↺</button>
            </div>
            <div style={{fontSize:11, color:"var(--ink-3)", marginTop:6}}>2 layers changed · tree, moon</div>
          </div>

          {/* Sync — explicit push / pull, separate from commit so the mental model stays legible */}
          <div style={{margin:"0 14px 12px", padding:"10px 12px", border:"1px solid var(--rule)", borderRadius:8, background:"var(--surface)"}}>
            <div style={{display:"flex", alignItems:"center", marginBottom:8}}>
              <div style={{fontFamily:"var(--mono)", fontSize:9, color:"var(--ink-3)", letterSpacing:"0.06em", textTransform:"uppercase"}}>
                Sync
              </div>
              <span className="mono" style={{marginLeft:"auto", fontSize:10.5, color:"var(--ink-3)"}}>
                <b style={{color:"var(--accent)"}}>↑ 2</b>&nbsp;·&nbsp;<b style={{color:"var(--ink-2)"}}>↓ 0</b>
              </span>
            </div>
            <div style={{fontFamily:"var(--mono)", fontSize:11, color:"var(--ink-3)", marginBottom:8, lineHeight:1.45}}>
              feat/sunset is <b style={{color:"var(--ink-2)"}}>2 commits</b> ahead of <b style={{color:"var(--ink-2)"}}>origin/feat/sunset</b>
            </div>
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:6}}>
              <button className="btn sm" style={{justifyContent:"center"}} title="Push to origin/feat/sunset">↑ Push</button>
              <button className="btn sm" style={{justifyContent:"center"}} title="Pull from main">↓ Pull</button>
            </div>
            <div style={{
              marginTop:8, padding:"6px 8px",
              background:"#fff7ed", border:"1px solid #fed7aa",
              borderRadius:4, fontSize:10.5, lineHeight:1.4,
              color:"#9a3412", fontFamily:"var(--mono)",
            }}>
              ⚠ <b>main is protected</b> — non-owners can't push direct.
              <a onClick={() => goTo("pr", { compose: true })}
                style={{color:"#9a3412", marginLeft:4, textDecoration:"underline", cursor:"pointer"}}>
                Open a PR →
              </a>
            </div>
          </div>

          {/* Quick git nav */}
          <div style={{padding:"4px 10px 14px", display:"flex", flexDirection:"column", gap:2}}>
            {[
              { id:"history", label:"History",       icon:"◇" },
              { id:"pr",      label:"Pull requests", icon:"⇪", badge: 3 },
            ].map(s => (
              <button key={s.id} onClick={() => goTo(s.id)}
                style={{
                  display:"flex", alignItems:"center", gap:10,
                  padding:"7px 10px", border:"none", borderRadius:5,
                  background:"transparent", color:"var(--ink-2)",
                  fontFamily:"var(--sans)", fontSize:12.5,
                  cursor:"pointer", textAlign:"left",
                }}>
                <span style={{width:18, textAlign:"center", color:"var(--ink-4)"}}>{s.icon}</span>
                <span style={{flex:1}}>{s.label}</span>
                {s.badge && <span style={{padding:"1px 7px", background: s.badge === "new" ? "#7c3aed" : "var(--accent)", color:"#fff", borderRadius:999, fontSize:10, fontFamily:"var(--mono)"}}>{s.badge}</span>}
              </button>
            ))}
          </div>

          {/* HEAD */}
          <div style={{marginTop:"auto", padding:14, borderTop:"1px solid var(--rule)", background:"var(--surface-2)"}}>
            <div style={{fontFamily:"var(--mono)", fontSize:9, color:"var(--ink-3)", letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:6}}>HEAD</div>
            <div style={{display:"flex", gap:8, alignItems:"center", fontFamily:"var(--mono)", fontSize:12}}>
              <span style={{width:8, height:8, borderRadius:"50%", background:"var(--ink)"}}></span>
              <span>c4f3a8</span>
              <span style={{marginLeft:"auto", padding:"1px 6px", border:"1px solid var(--rule-strong)", borderRadius:3, fontSize:10, color:"var(--ink-3)"}}>2d</span>
            </div>
            <div style={{fontSize:12, color:"var(--ink-3)", marginTop:4}}>add sunset gradient</div>
          </div>
        </aside>

        {/* Tool rail */}
        <div style={{borderRight:"1px solid var(--rule)", background:"#fcfdff", padding:"12px 0", display:"flex", flexDirection:"column", alignItems:"center", gap:4}}>
          {tools.map(t => {
            const on = t.id === tool;
            return (
              <button key={t.id} onClick={() => setTool(t.id)} title={t.label}
                style={{
                  width:40, height:40,
                  border:"1px solid", borderColor: on ? "var(--accent)" : "transparent",
                  borderRadius:6,
                  background: on ? "var(--accent)" : "transparent",
                  color: on ? "#fff" : "var(--ink-2)",
                  fontSize:18, cursor:"pointer",
                  display:"flex", alignItems:"center", justifyContent:"center",
                }}>
                {t.glyph}
              </button>
            );
          })}
          <div style={{height:1, width:24, background:"var(--rule)", margin:"6px 0"}}></div>
          {/* color swatches */}
          {["#0b1220","#2563eb","#e11d48","#0d9488","#d97706","#7c3aed","#ffffff"].map((c, i) => (
            <button key={i} title={c}
              style={{width:24, height:24, borderRadius:"50%",
                border: c === "#2563eb" ? "2px solid var(--ink)" : "1px solid var(--rule-strong)",
                background:c, cursor:"pointer", marginTop:2}}></button>
          ))}
        </div>

        {/* Canvas */}
        <main style={{padding:24, background:"#f3f6fb", display:"flex", flexDirection:"column"}}>
          <div style={{display:"flex", alignItems:"center", gap:10, marginBottom:14}}>
            <span className="mono" style={{fontSize:11, color:"var(--ink-3)"}}>1920 × 1200</span>
            <span style={{flex:1}}></span>
            <button className="btn sm">100% ▾</button>
            <button className="btn sm">⤢</button>
            <span style={{width:1, height:16, background:"var(--rule)"}}></span>
            <button className="btn sm">↶</button>
            <button className="btn sm">↷</button>
          </div>
          <div style={{flex:1, position:"relative",
              border:"1px solid var(--rule-strong)", borderRadius:6,
              background:"var(--surface)",
              boxShadow:"0 1px 3px rgba(11,18,32,0.06)",
              overflow:"hidden"}}>
            {/* paper grid */}
            <svg viewBox="0 0 800 460" preserveAspectRatio="xMidYMid meet" style={{display:"block", width:"100%", height:"100%"}}>
              <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#eef2f8" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="800" height="460" fill="url(#grid)" />
              <SampleArt x={120} y={50} w={560} h={380} state="after" />
              {/* a few visible sketch strokes for character */}
              <g stroke="#0b1220" strokeWidth="1.4" fill="none" strokeLinecap="round">
                <path d="M 200 360 Q 240 340 280 360 T 360 360" opacity="0.35" />
                <path d="M 480 380 Q 520 365 560 380" opacity="0.30" />
              </g>
              {/* cursor with brush hint */}
              <g>
                <circle cx="540" cy="200" r="8" fill="none" stroke="var(--accent)" strokeWidth="1.5" />
                <line x1="548" y1="200" x2="595" y2="180" stroke="var(--ink-3)" strokeWidth="1" strokeDasharray="3 2" />
                <rect x="595" y="170" width="86" height="20" fill="var(--ink)" rx="3" />
                <text x="638" y="184" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="10" fill="#fff">pencil · 2px</text>
              </g>
            </svg>
            {/* corner annotations */}
            <div style={{position:"absolute", left:12, top:10, fontFamily:"var(--mono)", fontSize:10.5, color:"var(--ink-3)"}}>
              feat/sunset · uncommitted
            </div>
          </div>
        </main>

        {/* Layers / info */}
        <aside style={{borderLeft:"1px solid var(--rule)", background:"#fcfdff", display:"flex", flexDirection:"column"}}>
          <div style={{padding:"12px 14px", borderBottom:"1px solid var(--rule)", display:"flex", alignItems:"baseline"}}>
            <span style={{fontSize:13, fontWeight:600}}>Layers</span>
            <span className="mono" style={{fontSize:11, color:"var(--ink-3)", marginLeft:8}}>{layers.length}</span>
            <button className="btn sm ghost" style={{marginLeft:"auto"}}>+ new</button>
          </div>
          {layers.map(l => (
            <div key={l.id} style={{
              display:"flex", alignItems:"center", gap:8,
              padding:"8px 14px", borderBottom:"1px solid var(--rule)",
              background: l.id === 2 ? "var(--hl)" : "transparent",
            }}>
              <span style={{width:16, textAlign:"center", color: l.visible ? "var(--ink-2)" : "var(--ink-4)"}}>{l.visible ? "◉" : "○"}</span>
              <span style={{width:16, textAlign:"center", color: l.locked ? "var(--ink-2)" : "var(--ink-4)"}}>{l.locked ? "🔒" : ""}</span>
              <span style={{flex:1, fontSize:12.5, color: l.visible ? "var(--ink)" : "var(--ink-3)"}}>{l.name}</span>
              {l.dirty && <span className="mono" style={{fontSize:9, color:"var(--accent)", fontWeight:600}}>●</span>}
              {l.kind === "ref" && <span className="mono" style={{fontSize:9, padding:"1px 5px", border:"1px solid var(--rule-strong)", borderRadius:3, color:"var(--ink-3)"}}>ref</span>}
            </div>
          ))}
          <div style={{padding:"14px", marginTop:"auto", borderTop:"1px solid var(--rule)", background:"var(--surface-2)"}}>
            <div className="mono" style={{fontSize:10, letterSpacing:"0.06em", textTransform:"uppercase", color:"var(--ink-3)", marginBottom:6}}>This session</div>
            <div style={{fontSize:12, color:"var(--ink-2)", lineHeight:1.5}}>
              48 min · 312 strokes<br/>
              <span style={{color:"var(--ink-3)"}}>2 layers changed since last commit</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

Object.assign(window, { ShellScreen });
