/* AI Progress Report — a destination, not a sidebar.
   Takes the commit history + component graph and writes a narrative of the artist's journey.
   Same visual language as every other surface (.frame chrome, change-type dots, mono labels). */

const REPORTS = [
  { id: "r3", title: "Sunset arc · feat/sunset",         when: "today",   commits: 8,  selected: true },
  { id: "r2", title: "Composition pass · main",          when: "3d ago",  commits: 12, selected: false },
  { id: "r1", title: "Project warm-up · first 14d",      when: "2w ago",  commits: 22, selected: false },
];

/* Timeline entries — each one re-interprets a commit message as INTENT, not log.
   The verbatim message is kept on the right for provenance. */
const TIMELINE = [
  {
    sha: "7d09",
    msg: "branch sunset",
    when: "5d ago",
    author: "jane",
    title: "Committing to a warmer palette",
    body: "You broke off a branch the moment you decided the scene needed warmth — not after debating it. Branching early like this is a tell that you were already certain about the direction; the rest of the arc reads as conviction, not exploration.",
    activity: [
      { kind:"add", n: 2, label: "horizon glow · base gradient" },
    ],
    tone: "decision",
  },
  {
    sha: "9b2e",
    msg: "tree position",
    when: "3d ago",
    author: "jane",
    title: "Reading the composition out loud",
    body: "The tree moves twice in this session — first to the centre, then slightly right. The second move is the real one: you stopped balancing the canvas and started building tension. The sun on the left was already implicitly pushing the eye outward, so the tree had to follow.",
    activity: [
      { kind:"mov", n: 1, label: "tree · x: 182 → 258" },
      { kind:"sty", n: 1, label: "tree.crown · darkened" },
    ],
    tone: "reframe",
  },
  {
    sha: "c4f3",
    msg: "add sunset gradient",
    when: "2d ago",
    author: "jane",
    title: "Resolving the lighting all at once",
    body: "Three changes in a single commit suggests you finally saw the whole scene. The sky gradient and the house re-tint are the same idea, applied to two surfaces — that's the strongest commit on this branch by intent, even though the message is the most banal.",
    activity: [
      { kind:"add", n: 1, label: "sky.gradient" },
      { kind:"sty", n: 1, label: "house.fill #fff → #e9cfa0" },
      { kind:"rem", n: 1, label: "sun (replaced by moon later)" },
    ],
    tone: "synthesis",
  },
  {
    sha: "11ab",
    msg: "moon crescent",
    when: "1d ago",
    author: "alex",
    title: "Alex's counter-proposal",
    body: "While you were warming the scene, alex was cooling it from the other end — a thin crescent moon on a parallel branch. The two branches don't disagree about the time of day; they disagree about which light source carries the scene. That's what the upcoming merge is really about.",
    activity: [
      { kind:"add", n: 1, label: "moon (on fix/moon)" },
    ],
    tone: "tension",
    fromCollaborator: true,
  },
];

const COMPONENT_ACTIVITY = [
  { kind: "tree",  name: "tree",      changes: [{k:"mov",n:2},{k:"sty",n:1}], note: "Re-positioned, then darkened" },
  { kind: "moon",  name: "moon",      changes: [{k:"add",n:1}],               note: "Introduced on a parallel branch" },
  { kind: "sun",   name: "sun",       changes: [{k:"rem",n:1}],               note: "Removed once the gradient carried the warmth" },
  { kind: "house", name: "house",     changes: [{k:"sty",n:2}],               note: "Tinted twice to match the new sky" },
  { kind: "cloud", name: "cloud",     changes: [{k:"sty",n:1}],               note: "Lightly softened — quiet supporting move" },
  { kind: "grid",  name: "ref/grid",  changes: [{k:"add",n:1},{k:"rem",n:1}], note: "Used as scaffolding, then hidden" },
];

const CHANGE_DOT = { add: "var(--add)", rem: "var(--rem)", mov: "var(--mov)", sty: "var(--sty)" };

function ChangeDot({ kind, n }) {
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", gap:4,
      padding:"1px 7px 1px 5px",
      borderRadius: 999,
      background: `var(--${kind}-bg)`,
      color: `var(--${kind})`,
      fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 600,
    }}>
      <span style={{width:6, height:6, borderRadius:"50%", background:CHANGE_DOT[kind]}}></span>
      {kind} {n > 1 ? `×${n}` : ""}
    </span>
  );
}

function AIReportScreen({ goTo }) {
  const [activeReport, setActiveReport] = React.useState("r3");
  const [generating, setGenerating] = React.useState(false);
  const [tone, setTone] = React.useState("studio"); // studio | terse | poetic
  const [focus, setFocus] = React.useState("arc");  // arc | components | collaboration

  function regenerate() {
    setGenerating(true);
    setTimeout(() => setGenerating(false), 1100);
  }

  return (
    <div className="frame">
      <div className="frame-chrome">
        <span className="dots"><span></span><span></span><span></span></span>
        <span>graft · starfield.svg · ai report</span>
        <span style={{marginLeft:"auto", color:"var(--ink-3)"}}>haiku · model haiku-4.5</span>
      </div>

      <div style={{display:"grid", gridTemplateColumns:"260px 1fr", minHeight: 720}}>

        {/* Past reports rail */}
        <aside style={{borderRight:"1px solid var(--rule)", background:"#fcfdff", display:"flex", flexDirection:"column"}}>
          <div style={{padding:"14px 16px 10px", display:"flex", alignItems:"baseline"}}>
            <span style={{fontSize:14, fontWeight:600}}>Reports</span>
            <span className="mono" style={{fontSize:11, color:"var(--ink-3)", marginLeft:8}}>{REPORTS.length}</span>
          </div>

          <button onClick={regenerate} disabled={generating}
            style={{
              margin:"0 16px 14px",
              padding:"10px 12px",
              border:"none", borderRadius:6,
              background: generating ? "var(--ink-4)" : "var(--ink)",
              color:"#fff",
              fontFamily:"var(--sans)", fontSize:13, fontWeight:600,
              cursor: generating ? "wait" : "pointer",
              display:"flex", alignItems:"center", justifyContent:"center", gap:8,
              boxShadow:"0 1px 2px rgba(0,0,0,0.15)",
            }}>
            <span style={{
              display:"inline-flex", alignItems:"center", justifyContent:"center",
              width:18, height:18, borderRadius:4,
              background:"linear-gradient(135deg, var(--accent), #7c3aed)",
              color:"#fff", fontSize:10, fontWeight:700,
            }}>AI</span>
            {generating ? "Generating…" : "Generate new report"}
          </button>

          <div className="mono" style={{padding:"0 16px 6px", fontSize:10, letterSpacing:"0.06em", textTransform:"uppercase", color:"var(--ink-3)"}}>
            Past reports
          </div>
          <div style={{overflow:"auto", flex:1}}>
            {REPORTS.map(r => {
              const isSel = r.id === activeReport;
              return (
                <button key={r.id} onClick={() => setActiveReport(r.id)}
                  style={{
                    width:"100%", textAlign:"left", display:"block",
                    padding:"11px 16px", border:"none",
                    borderBottom:"1px solid var(--rule)",
                    borderLeft: isSel ? "3px solid var(--accent)" : "3px solid transparent",
                    background: isSel ? "var(--hl)" : "transparent",
                    cursor:"pointer", fontFamily:"var(--sans)",
                  }}>
                  <div style={{fontSize:13, fontWeight:500, lineHeight:1.35, marginBottom:4}}>{r.title}</div>
                  <div className="mono" style={{fontSize:10.5, color:"var(--ink-3)", display:"flex", gap:8}}>
                    <span>{r.when}</span>
                    <span>·</span>
                    <span>{r.commits} commits</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Settings */}
          <div style={{padding:"14px 16px", borderTop:"1px solid var(--rule)", background:"var(--surface-2)"}}>
            <div className="mono" style={{fontSize:10, letterSpacing:"0.06em", textTransform:"uppercase", color:"var(--ink-3)", marginBottom:8}}>
              Tone
            </div>
            <div style={{display:"flex", gap:4, marginBottom:12}}>
              {["studio","terse","poetic"].map(t => (
                <button key={t} onClick={() => setTone(t)}
                  style={{
                    flex:1, padding:"5px 8px",
                    border:"1px solid", borderColor: tone === t ? "var(--ink)" : "var(--rule-strong)",
                    background: tone === t ? "var(--ink)" : "var(--surface)",
                    color: tone === t ? "#fff" : "var(--ink-2)",
                    borderRadius:4, fontSize:11, fontFamily:"var(--sans)",
                    cursor:"pointer",
                  }}>{t}</button>
              ))}
            </div>
            <div className="mono" style={{fontSize:10, letterSpacing:"0.06em", textTransform:"uppercase", color:"var(--ink-3)", marginBottom:8}}>
              Focus
            </div>
            <div style={{display:"flex", flexDirection:"column", gap:4}}>
              {[
                { id:"arc",            label:"Creative arc" },
                { id:"components",     label:"Components" },
                { id:"collaboration",  label:"Collaboration" },
              ].map(f => (
                <button key={f.id} onClick={() => setFocus(f.id)}
                  style={{
                    padding:"5px 8px", textAlign:"left",
                    border:"1px solid", borderColor: focus === f.id ? "var(--accent)" : "var(--rule)",
                    background: focus === f.id ? "#eff5ff" : "var(--surface)",
                    color: focus === f.id ? "var(--accent-2,#1d4ed8)" : "var(--ink-2)",
                    borderRadius:4, fontSize:11.5, fontFamily:"var(--sans)",
                    cursor:"pointer",
                  }}>{f.label}</button>
              ))}
            </div>
          </div>
        </aside>

        {/* Report body */}
        <main style={{display:"flex", flexDirection:"column", overflow:"hidden"}}>

          {/* Report header */}
          <div style={{padding:"24px 32px 18px", borderBottom:"1px solid var(--rule)"}}>
            <div style={{display:"flex", alignItems:"center", gap:12, marginBottom:14}}>
              <Provenance commits={8} components={7} when="today · 14:32" />
              <span style={{marginLeft:"auto", display:"flex", gap:6}}>
                <button className="btn sm">↗ Share</button>
                <button className="btn sm">⤓ Export markdown</button>
                <button className="btn sm" onClick={regenerate}>↻ Regenerate</button>
              </span>
            </div>
            <div style={{fontSize:26, fontWeight:600, letterSpacing:"-0.02em", marginBottom:8, lineHeight:1.2}}>
              The sunset arc, in four moves
            </div>
            <div className="mono" style={{fontSize:12, color:"var(--ink-3)", display:"flex", gap:10, flexWrap:"wrap"}}>
              <span>branch: <b style={{color:"var(--accent-2,#1d4ed8)"}}>feat/sunset</b></span>
              <span>·</span>
              <span>range: 7d09 → c4f3 (and 11ab on fix/moon)</span>
              <span>·</span>
              <span>actors: <b style={{color:"var(--ink)"}}>jane</b>, <b style={{color:"var(--ink)"}}>alex</b></span>
            </div>
          </div>

          <div style={{overflow:"auto", padding:"24px 32px 40px"}}>
            {/* SUMMARY */}
            <section style={{marginBottom:32}}>
              <div className="mono" style={{fontSize:10, letterSpacing:"0.08em", textTransform:"uppercase", color:"var(--ink-3)", marginBottom:10}}>
                Summary
              </div>
              <div style={{
                fontSize:17, lineHeight:1.55, color:"var(--ink)",
                fontFamily:"var(--sans)",
                maxWidth: 760,
                letterSpacing:"-0.005em",
              }}>
                Over five days, <b>jane</b> moved <i>starfield.svg</i> from a flat,
                centred composition into a warmer, asymmetric sunset scene — but the more
                interesting decision is that she committed to the palette <i>before</i>
                committing to the lighting. The tree-and-house relocation in the middle
                of the arc is where this report's "moment of clarity" is: it's the only
                commit that touches three locked elements at once. Meanwhile <b>alex</b>
                has been quietly building a cooler counter-proposal on <i>fix/moon</i> —
                the upcoming merge isn't about technique, it's about which light source
                gets to carry the scene.
              </div>
            </section>

            {/* TIMELINE — intent, not changelog */}
            <section style={{marginBottom:36}}>
              <div style={{display:"flex", alignItems:"baseline", marginBottom:14}}>
                <div className="mono" style={{fontSize:10, letterSpacing:"0.08em", textTransform:"uppercase", color:"var(--ink-3)"}}>
                  Timeline · intent behind each commit
                </div>
                <span style={{marginLeft:"auto"}}>
                  <button className="btn sm ghost" onClick={() => goTo("history")}>open in history →</button>
                </span>
              </div>

              <div style={{position:"relative", paddingLeft: 28}}>
                {/* Vertical rail */}
                <div style={{
                  position:"absolute", left:9, top:6, bottom:6, width:2,
                  background:"linear-gradient(180deg, var(--accent) 0%, var(--accent) 70%, var(--sty) 100%)",
                  opacity:0.25,
                }}></div>

                {TIMELINE.map((t, i) => (
                  <div key={t.sha} style={{position:"relative", marginBottom: i === TIMELINE.length - 1 ? 0 : 22}}>
                    {/* Node */}
                    <div style={{
                      position:"absolute", left:-28, top:6,
                      width:20, height:20, borderRadius:"50%",
                      background:"var(--surface)",
                      border:`2px solid ${t.fromCollaborator ? "var(--sty)" : "var(--accent)"}`,
                      display:"flex", alignItems:"center", justifyContent:"center",
                    }}>
                      <span style={{
                        width:8, height:8, borderRadius:"50%",
                        background: t.fromCollaborator ? "var(--sty)" : "var(--accent)",
                      }}></span>
                    </div>

                    <div style={{
                      border:"1px solid var(--rule)", borderRadius:8,
                      padding:"14px 16px",
                      background: t.fromCollaborator ? "#fbfaff" : "var(--surface)",
                    }}>
                      <div style={{display:"flex", alignItems:"center", gap:10, marginBottom:8, flexWrap:"wrap"}}>
                        <span className="mono" style={{
                          fontSize:11, padding:"2px 7px",
                          background:"var(--surface-2)", border:"1px solid var(--rule)",
                          borderRadius:4, color:"var(--ink-2)",
                        }}>{t.sha}</span>
                        <span className="mono" style={{fontSize:11, color:"var(--ink-3)"}}>{t.author} · {t.when}</span>
                        <span className="mono" style={{
                          fontSize:10, padding:"1px 7px",
                          background:"transparent", border:"1px dashed var(--rule-strong)",
                          borderRadius:999, color:"var(--ink-3)",
                          textTransform:"uppercase", letterSpacing:"0.06em",
                        }}>{t.tone}</span>
                        <span style={{marginLeft:"auto", display:"flex", gap:6}}>
                          {t.activity.map((a, k) => <ChangeDot key={k} kind={a.kind} n={a.n} />)}
                        </span>
                      </div>

                      <div style={{fontSize:15, fontWeight:600, letterSpacing:"-0.01em", marginBottom:6}}>
                        {t.title}
                      </div>
                      <div style={{fontSize:13.5, color:"var(--ink-2)", lineHeight:1.6, marginBottom:10}}>
                        {t.body}
                      </div>

                      <div style={{
                        display:"flex", flexDirection:"column", gap:4,
                        paddingTop:10, borderTop:"1px dashed var(--rule)",
                      }}>
                        {t.activity.map((a, k) => (
                          <div key={k} className="mono" style={{fontSize:11, color:"var(--ink-3)", display:"flex", gap:8}}>
                            <span style={{width:8, height:8, borderRadius:"50%", background: CHANGE_DOT[a.kind], marginTop:5, flex:"0 0 auto"}}></span>
                            <span style={{flex:1}}>{a.label}</span>
                          </div>
                        ))}
                        <div style={{display:"flex", alignItems:"baseline", marginTop:4}}>
                          <span className="mono" style={{fontSize:10, color:"var(--ink-4)"}}>
                            commit message: "{t.msg}"
                          </span>
                          <span style={{marginLeft:"auto"}}>
                            <button className="btn sm ghost" onClick={() => goTo("diff")}>see diff</button>
                            <button className="btn sm ghost" onClick={() => goTo("memory")}>see components</button>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* COMPONENT ACTIVITY */}
            <section style={{marginBottom:36}}>
              <div style={{display:"flex", alignItems:"baseline", marginBottom:14}}>
                <div className="mono" style={{fontSize:10, letterSpacing:"0.08em", textTransform:"uppercase", color:"var(--ink-3)"}}>
                  Component activity · sourced from the component graph
                </div>
                <span style={{marginLeft:"auto"}}>
                  <button className="btn sm ghost" onClick={() => goTo("memory")}>open graph →</button>
                </span>
              </div>

              <div style={{
                display:"grid",
                gridTemplateColumns:"repeat(auto-fill, minmax(220px, 1fr))",
                gap:12,
              }}>
                {COMPONENT_ACTIVITY.map(c => (
                  <div key={c.name} style={{
                    border:"1px solid var(--rule)", borderRadius:8,
                    padding:"12px 14px", background:"var(--surface)",
                  }}>
                    <div style={{display:"flex", alignItems:"center", gap:10, marginBottom:8}}>
                      <div style={{
                        width:36, height:36, borderRadius:6,
                        background:"var(--surface-2)", border:"1px solid var(--rule)",
                        display:"flex", alignItems:"center", justifyContent:"center",
                      }}>
                        <svg width="32" height="32" viewBox="0 0 32 32">
                          <ComponentGlyph x={16} y={16} r={11} kind={c.kind} color="var(--ink-2)" />
                        </svg>
                      </div>
                      <div style={{flex:1}}>
                        <div className="mono" style={{fontSize:12.5, fontWeight:600}}>{c.name}</div>
                        <div style={{display:"flex", gap:4, marginTop:3, flexWrap:"wrap"}}>
                          {c.changes.map((ch, i) => <ChangeDot key={i} kind={ch.k} n={ch.n} />)}
                        </div>
                      </div>
                    </div>
                    <div style={{fontSize:12, color:"var(--ink-3)", lineHeight:1.45}}>
                      {c.note}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* THOUGHT PROCESS — short reflection */}
            <section style={{marginBottom:24}}>
              <div className="mono" style={{fontSize:10, letterSpacing:"0.08em", textTransform:"uppercase", color:"var(--ink-3)", marginBottom:10}}>
                Your thought process
              </div>
              <div style={{
                position:"relative",
                padding:"18px 22px 18px 24px",
                background:"#fbfaff",
                border:"1px solid #ede9fe",
                borderRadius:10,
                maxWidth: 760,
              }}>
                <div style={{
                  position:"absolute", left:0, top:14, bottom:14, width:3,
                  background:"linear-gradient(180deg, var(--accent), var(--sty))",
                  borderRadius:2,
                }}></div>
                <div style={{fontSize:14.5, color:"var(--ink)", lineHeight:1.6, fontStyle:"italic"}}>
                  You work in two-step rhythms: a structural change, then a colour change
                  to justify it. Every time the tree moves, the sky shifts within twelve
                  hours. That's not a bug — it's how you reason about scenes. The risk
                  this week is that your branch is now leaning entirely on warm light,
                  while alex's <span className="mono" style={{fontStyle:"normal", color:"var(--accent-2,#1d4ed8)"}}>fix/moon</span>
                  is leaning entirely on cool. Whichever side wins the merge will lock the
                  scene's mood for the rest of the project.
                </div>
                <div style={{display:"flex", gap:8, marginTop:14, alignItems:"center"}}>
                  <span className="mono" style={{fontSize:10.5, color:"var(--ink-3)"}}>
                    suggested next move
                  </span>
                  <button className="btn sm" onClick={() => goTo("merge")}>
                    Walk into Merge with alex →
                  </button>
                  <button className="btn sm ghost">
                    Ask: "what would a cooler sunset look like?"
                  </button>
                </div>
              </div>
            </section>

            {/* Footer provenance */}
            <div style={{
              display:"flex", alignItems:"center", gap:12,
              padding:"14px 16px",
              background:"var(--surface-2)",
              border:"1px solid var(--rule)",
              borderRadius:8,
              fontSize:11.5, color:"var(--ink-3)", fontFamily:"var(--mono)",
            }}>
              <span style={{
                width:16, height:16, borderRadius:3,
                background:"linear-gradient(135deg, var(--accent), #7c3aed)",
                display:"inline-flex", alignItems:"center", justifyContent:"center",
                color:"#fff", fontSize:9, fontWeight:700,
              }}>AI</span>
              <span>
                This report was written by a model that read only your commit history,
                file metadata, and the component graph for <b style={{color:"var(--ink-2)"}}>starfield.svg</b>.
                It did not see the canvas pixels.
              </span>
              <span style={{marginLeft:"auto"}}>
                <a style={{color:"var(--accent-2,#1d4ed8)", textDecoration:"none", cursor:"pointer"}}>What data was used?</a>
              </span>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

Object.assign(window, { AIReportScreen });
