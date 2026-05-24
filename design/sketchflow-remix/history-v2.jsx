/* History — the simplest possible branch-and-commit browser.
   Left rail: branch picker.
   Main: commit list for the selected branch (sha · message · author · time · change-type dots).
   Tick two commits and hit Compare → in-place before/after + changes list.
   No component view, no graph, no popups. */

const HIST_BRANCHES = [
  { id: "main",        color: "#16a34a", commits: ["merge1", "a17b", "44bd", "c0d3"] },
  { id: "feat/sunset", color: "#2563eb", commits: ["c4f3", "9b2e", "7d09"], head: true },
  { id: "fix/moon",    color: "#d97706", commits: ["11ab", "7d09"] },
  { id: "exp/grid",    color: "#dc2626", commits: ["5612", "ee01", "a17b"] },
];

const COMMIT_DETAILS = {
  "c0d3":   { msg: "init",                 author: "jane", when: "14d ago", changes: { add: 3 } },
  "44bd":   { msg: "first shapes",         author: "jane", when: "12d ago", changes: { add: 2, sty: 1 } },
  "a17b":   { msg: "background",           author: "alex", when: "8d ago",  changes: { add: 1, sty: 2 } },
  "merge1": { msg: "merge sunset → main",  author: "jane", when: "2d ago",  changes: { add: 2, mov: 1, sty: 1 }, merge: true },

  "7d09":   { msg: "branch sunset",        author: "jane", when: "5d ago",  changes: { add: 2 } },
  "9b2e":   { msg: "tree position",        author: "jane", when: "3d ago",  changes: { mov: 1, sty: 1 } },
  "c4f3":   { msg: "add sunset gradient",  author: "jane", when: "2d ago",  changes: { add: 1, rem: 1, sty: 1 } },

  "11ab":   { msg: "moon crescent",        author: "alex", when: "4d ago",  changes: { add: 1 } },

  "ee01":   { msg: "experiment grid",      author: "sam",  when: "6d ago",  changes: { add: 1 } },
  "5612":   { msg: "denser grid",          author: "sam",  when: "5d ago",  changes: { sty: 1, add: 1 } },
};

/* For the compare panel we lean on SampleArt's before/after, plus a tiny
   per-commit change-list so the comparison reads as more than just two pictures. */
const COMMIT_CHANGES = {
  "c4f3": [
    { kind: "add", el: "#sky-gradient",  note: "added"                  },
    { kind: "rem", el: "#sun",           note: "removed"                },
    { kind: "sty", el: "#house.fill",    note: "fill #fff → #e9cfa0"    },
  ],
  "9b2e": [
    { kind: "mov", el: "#tree",          note: "x: 182 → 258"           },
    { kind: "sty", el: "#tree.crown",    note: "darkened"               },
  ],
  "7d09": [
    { kind: "add", el: "#horizon",       note: "added"                  },
    { kind: "add", el: "#sun",           note: "added"                  },
  ],
  "a17b": [
    { kind: "add", el: "#background",    note: "added"                  },
    { kind: "sty", el: "#canvas.color",  note: "off-white → #fcfdff"    },
    { kind: "sty", el: "#border",        note: "thinner"                },
  ],
  "44bd": [
    { kind: "add", el: "#tree",          note: "added"                  },
    { kind: "add", el: "#house",         note: "added"                  },
    { kind: "sty", el: "#tree.crown",    note: "circular"               },
  ],
  "c0d3": [
    { kind: "add", el: "#canvas",        note: "initialised"            },
    { kind: "add", el: "#layer:bg",      note: "added"                  },
    { kind: "add", el: "#layer:fg",      note: "added"                  },
  ],
  "merge1": [
    { kind: "add", el: "#sky-gradient",  note: "from feat/sunset"       },
    { kind: "mov", el: "#tree",          note: "from feat/sunset"       },
    { kind: "sty", el: "#house.fill",    note: "from feat/sunset"       },
    { kind: "add", el: "#horizon",       note: "from feat/sunset"       },
  ],
  "11ab": [
    { kind: "add", el: "#moon",          note: "crescent, top-left"     },
  ],
  "ee01": [
    { kind: "add", el: "#grid",          note: "8×8 reference"          },
  ],
  "5612": [
    { kind: "add", el: "#grid.subdiv",   note: "16×16 reference"        },
    { kind: "sty", el: "#grid.color",    note: "lighter"                },
  ],
};

const KIND_COLOR = { add: "var(--add)", rem: "var(--rem)", mov: "var(--mov)", sty: "var(--sty)" };
const KIND_LABEL = { add: "added", rem: "removed", mov: "moved", sty: "restyled" };

function ChangeDots({ changes }) {
  const order = ["add", "rem", "mov", "sty"];
  return (
    <span style={{display:"inline-flex", gap:4}}>
      {order.filter(k => changes[k]).map(k => (
        <span key={k} title={`${changes[k]} ${KIND_LABEL[k]}`} style={{
          display:"inline-flex", alignItems:"center", gap:3,
          padding:"1px 6px",
          borderRadius: 999,
          background: `var(--${k}-bg)`,
          color: KIND_COLOR[k],
          fontFamily:"var(--mono)", fontSize:10.5, fontWeight:600,
        }}>
          <span style={{width:5, height:5, borderRadius:"50%", background: KIND_COLOR[k]}}></span>
          {changes[k]}
        </span>
      ))}
    </span>
  );
}

function AvatarDot({ name, size = 22 }) {
  const map = { jane: "#2563eb", alex: "#0b1220", sam: "#d97706", kim: "#7c3aed" };
  return (
    <span title={name} style={{
      width: size, height: size, borderRadius:"50%",
      background: map[name] || "var(--ink-3)", color:"#fff",
      display:"inline-flex", alignItems:"center", justifyContent:"center",
      fontFamily:"var(--sans)", fontSize: Math.round(size*0.45), fontWeight:600,
      flex:"0 0 auto",
    }}>{name[0].toUpperCase()}</span>
  );
}

function HistoryScreen({ goTo }) {
  const [branchId, setBranchId] = React.useState("feat/sunset");
  const [selected, setSelected] = React.useState([]); // up to 2 sha, same branch
  const [hover,    setHover]    = React.useState(null);
  const [comparing, setComparing] = React.useState(false);

  const branch  = HIST_BRANCHES.find(b => b.id === branchId);
  const commits = branch.commits.map(sha => ({ sha, ...COMMIT_DETAILS[sha] }));

  function toggle(sha) {
    setSelected(prev => {
      if (prev.includes(sha)) return prev.filter(s => s !== sha);
      if (prev.length >= 2)   return [prev[1], sha];
      return [...prev, sha];
    });
  }
  function switchBranch(id) {
    setBranchId(id);
    setSelected([]);
    setComparing(false);
  }

  // For Compare, sort selected commits oldest → newest using the branch order
  const order = branch.commits;
  const [a, b] = [...selected].sort((x, y) => order.indexOf(y) - order.indexOf(x));
  const before = a ? { sha: a, ...COMMIT_DETAILS[a] } : null;
  const after  = b ? { sha: b, ...COMMIT_DETAILS[b] } : null;

  // Derive changes between two commits: union of intermediate commit changes,
  // collapsed by element. Last-writer-wins for kind.
  function deriveChanges(fromSha, toSha) {
    const fromIdx = order.indexOf(fromSha);
    const toIdx   = order.indexOf(toSha);
    if (fromIdx < 0 || toIdx < 0) return [];
    // order is newest-first; intermediate = commits with idx in (toIdx, fromIdx]
    const span = order.slice(toIdx, fromIdx); // commits AFTER 'before', up to and including 'after'
    const seen = {};
    span.forEach(sha => {
      (COMMIT_CHANGES[sha] || []).forEach(ch => {
        seen[ch.el] = { ...ch };
      });
    });
    return Object.values(seen);
  }

  const compareChanges = (before && after) ? deriveChanges(before.sha, after.sha) : [];

  return (
    <div className="frame">
      <div className="frame-chrome">
        <span className="dots"><span></span><span></span><span></span></span>
        <span>graft · starfield.svg · history</span>
      </div>

      <div style={{display:"grid", gridTemplateColumns:"240px 1fr", minHeight: 640}}>

        {/* LEFT RAIL — branch picker only */}
        <aside style={{borderRight:"1px solid var(--rule)", background:"#fcfdff", display:"flex", flexDirection:"column"}}>
          <div style={{padding:"14px 16px 8px", display:"flex", alignItems:"baseline"}}>
            <span style={{fontSize:14, fontWeight:600}}>Branches</span>
            <span className="mono" style={{fontSize:11, color:"var(--ink-3)", marginLeft:8}}>{HIST_BRANCHES.length}</span>
          </div>
          <div style={{padding:"0 8px"}}>
            {HIST_BRANCHES.map(br => {
              const on = br.id === branchId;
              return (
                <button key={br.id} onClick={() => switchBranch(br.id)}
                  style={{
                    width:"100%", display:"flex", alignItems:"center", gap:10,
                    padding:"9px 10px", margin:"2px 0",
                    border:"1px solid", borderColor: on ? "var(--accent)" : "transparent",
                    background: on ? "var(--hl)" : "transparent",
                    borderRadius: 6,
                    cursor:"pointer", textAlign:"left",
                    fontFamily:"var(--sans)",
                  }}>
                  <span style={{
                    width:10, height:10, borderRadius:"50%",
                    background: br.color, flex:"0 0 auto",
                  }}></span>
                  <span className="mono" style={{
                    fontSize: 12.5, fontWeight: on ? 600 : 500,
                    color: on ? "var(--ink)" : "var(--ink-2)",
                    flex:1, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
                  }}>{br.id}</span>
                  {br.head && (
                    <span className="mono" style={{
                      fontSize: 9, padding:"1px 6px",
                      background:"var(--accent)", color:"#fff",
                      borderRadius: 3, letterSpacing:"0.06em",
                    }}>HEAD</span>
                  )}
                  <span className="mono" style={{fontSize:10.5, color:"var(--ink-3)"}}>{br.commits.length}</span>
                </button>
              );
            })}
          </div>

          <div style={{padding:"14px 16px", marginTop:"auto", borderTop:"1px solid var(--rule)", background:"var(--surface-2)"}}>
            <div className="mono" style={{fontSize:10, letterSpacing:"0.06em", textTransform:"uppercase", color:"var(--ink-3)", marginBottom:6}}>
              Tip
            </div>
            <div style={{fontSize:12, color:"var(--ink-2)", lineHeight:1.5}}>
              Tick two commits in the list, then <b>Compare</b> to see the before / after side-by-side.
            </div>
          </div>
        </aside>

        {/* MAIN — commit list (default) OR compare panel */}
        <main style={{display:"flex", flexDirection:"column"}}>

          {/* Header */}
          <div style={{display:"flex", alignItems:"center", gap:10, padding:"14px 22px", borderBottom:"1px solid var(--rule)"}}>
            <span style={{
              width:10, height:10, borderRadius:"50%",
              background: branch.color,
            }}></span>
            <span className="mono" style={{fontSize:14, fontWeight:600}}>{branch.id}</span>
            <span className="mono" style={{fontSize:11.5, color:"var(--ink-3)"}}>
              · {branch.commits.length} commits
            </span>
            {branch.head && (
              <span className="mono" style={{
                fontSize: 10, padding:"1px 7px",
                background:"var(--accent)", color:"#fff",
                borderRadius: 3, letterSpacing:"0.06em",
              }}>HEAD</span>
            )}

            <div style={{marginLeft:"auto", display:"flex", alignItems:"center", gap:10}}>
              {!comparing && (
                <>
                  <span className="mono" style={{
                    fontSize:11, color: selected.length === 2 ? "var(--ink)" : "var(--ink-3)",
                    padding:"3px 9px",
                    border:`1px solid ${selected.length === 2 ? "var(--accent)" : "var(--rule-strong)"}`,
                    borderRadius:999,
                    background: selected.length === 2 ? "var(--hl)" : "transparent",
                  }}>
                    {selected.length}/2 selected
                  </span>
                  {selected.length > 0 && (
                    <button className="btn sm ghost" onClick={() => setSelected([])}>Clear</button>
                  )}
                  <button className="btn sm primary"
                    disabled={selected.length !== 2}
                    style={{opacity: selected.length === 2 ? 1 : 0.5, cursor: selected.length === 2 ? "pointer" : "not-allowed"}}
                    onClick={() => setComparing(true)}>
                    ⇄ Compare
                  </button>
                </>
              )}
              {comparing && (
                <button className="btn sm" onClick={() => setComparing(false)}>
                  ← Back to commits
                </button>
              )}
            </div>
          </div>

          {/* Body */}
          {!comparing && (
            <div style={{position:"relative", padding:"6px 0 22px", overflow:"auto"}}>
              {/* Vertical rail */}
              <div style={{
                position:"absolute", left: 28 + 18, top: 18, bottom: 18, width: 2,
                background: branch.color, opacity: 0.18,
              }}></div>

              {commits.map((c, i) => {
                const isSel    = selected.includes(c.sha);
                const isHover  = hover === c.sha;
                const reachedMax = selected.length >= 2 && !isSel;
                return (
                  <div key={c.sha}
                    onMouseEnter={() => setHover(c.sha)}
                    onMouseLeave={() => setHover(null)}
                    style={{
                      position:"relative",
                      display:"flex", alignItems:"center", gap:14,
                      padding:"12px 22px 12px 22px",
                      borderTop: i === 0 ? "none" : "1px solid var(--rule)",
                      background: isSel ? "var(--hl)" : (isHover ? "#f8fafc" : "transparent"),
                      cursor: reachedMax ? "not-allowed" : "pointer",
                      transition: "background .12s",
                    }}
                    onClick={() => !reachedMax && toggle(c.sha)}>
                    {/* gutter checkbox */}
                    <span style={{
                      width: 18, height: 18, borderRadius: 4,
                      border: `1.5px solid ${isSel ? "var(--accent)" : "var(--rule-strong)"}`,
                      background: isSel ? "var(--accent)" : "var(--surface)",
                      display:"inline-flex", alignItems:"center", justifyContent:"center",
                      color:"#fff", fontSize:11, fontWeight:700,
                      flex:"0 0 auto",
                      opacity: reachedMax ? 0.4 : 1,
                    }}>{isSel ? "✓" : ""}</span>

                    {/* node */}
                    <span style={{
                      width:14, height:14, borderRadius:"50%",
                      background: c.merge ? "var(--surface)" : branch.color,
                      border: `2px solid ${branch.color}`,
                      flex:"0 0 auto",
                      boxShadow: i === 0 ? `0 0 0 4px ${branch.color}1a` : "none",
                    }}></span>

                    {/* sha */}
                    <span className="mono" style={{
                      fontSize:11.5, color:"var(--ink-3)",
                      padding:"2px 7px",
                      background:"var(--surface-2)", border:"1px solid var(--rule)",
                      borderRadius:4,
                      flex:"0 0 auto",
                    }}>{c.sha}</span>

                    {/* message */}
                    <div style={{flex:1, minWidth:0}}>
                      <div style={{display:"flex", alignItems:"baseline", gap:8}}>
                        <span style={{
                          fontSize:13.5, fontWeight:500,
                          whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
                          letterSpacing:"-0.005em",
                        }}>{c.msg}</span>
                        {c.merge && (
                          <span className="mono" style={{
                            fontSize:10, padding:"1px 6px",
                            background:"var(--sty-bg)", color:"var(--sty)",
                            borderRadius:3, letterSpacing:"0.04em",
                          }}>merge</span>
                        )}
                        {i === 0 && (
                          <span className="mono" style={{
                            fontSize:10, padding:"1px 6px",
                            background:"var(--surface-2)", color:"var(--ink-3)",
                            border:"1px solid var(--rule)", borderRadius:3,
                            letterSpacing:"0.04em",
                          }}>tip</span>
                        )}
                      </div>
                    </div>

                    {/* change dots */}
                    <ChangeDots changes={c.changes || {}} />

                    {/* author */}
                    <AvatarDot name={c.author} />

                    {/* time */}
                    <span className="mono" style={{
                      fontSize:11, color:"var(--ink-3)",
                      width: 70, textAlign:"right", flex:"0 0 auto",
                    }}>{c.when}</span>
                  </div>
                );
              })}

              {/* End-of-history marker */}
              <div style={{
                display:"flex", alignItems:"center", gap:12,
                padding:"14px 22px 4px 22px",
                color:"var(--ink-4)", fontFamily:"var(--mono)", fontSize:11,
              }}>
                <span style={{
                  width:14, height:14, borderRadius:"50%",
                  background:"var(--surface)", border:"1px dashed var(--ink-4)",
                  marginLeft: 32,
                }}></span>
                <span>root of {branch.id}</span>
              </div>
            </div>
          )}

          {/* COMPARE PANEL — in-place, dismissible */}
          {comparing && before && after && (
            <div style={{padding:"22px 24px 28px", overflow:"auto"}}>
              <div style={{
                display:"flex", alignItems:"center", gap:10, marginBottom:18,
                padding:"10px 14px",
                background:"#eff5ff", border:"1px solid var(--rule)",
                borderRadius: 8,
              }}>
                <span className="mono" style={{fontSize:11, color:"var(--ink-3)", letterSpacing:"0.06em", textTransform:"uppercase"}}>
                  Compare
                </span>
                <span className="mono" style={{
                  fontSize:12, padding:"2px 8px",
                  background:"var(--surface)", border:"1px solid var(--rule)", borderRadius:4,
                  color:"var(--ink-2)",
                }}>{before.sha}</span>
                <span className="mono" style={{fontSize:13, color:"var(--ink-3)"}}>{before.msg}</span>
                <span style={{color:"var(--ink-4)"}}>→</span>
                <span className="mono" style={{
                  fontSize:12, padding:"2px 8px",
                  background:"var(--surface)", border:"1px solid var(--accent)", borderRadius:4,
                  color:"var(--accent-2,#1d4ed8)",
                }}>{after.sha}</span>
                <span className="mono" style={{fontSize:13, color:"var(--ink-3)"}}>{after.msg}</span>
                <span style={{marginLeft:"auto"}}>
                  <span className="mono" style={{fontSize:11, color:"var(--ink-3)"}}>
                    branch: <b style={{color:"var(--ink)"}}>{branch.id}</b>
                  </span>
                </span>
              </div>

              <div style={{
                display:"grid", gridTemplateColumns:"1fr 1fr", gap:14,
                marginBottom: 22,
              }}>
                <div style={{border:"1px solid var(--rule)", borderRadius:8, overflow:"hidden", background:"var(--surface)"}}>
                  <div style={{
                    padding:"10px 14px", borderBottom:"1px solid var(--rule)",
                    display:"flex", alignItems:"baseline", gap:8,
                    background:"var(--surface-2)",
                  }}>
                    <span className="mono" style={{fontSize:10, letterSpacing:"0.06em", textTransform:"uppercase", color:"var(--ink-3)"}}>
                      Before
                    </span>
                    <span className="mono" style={{fontSize:12, color:"var(--ink-2)"}}>{before.sha}</span>
                    <span style={{marginLeft:"auto", display:"inline-flex", gap:8, alignItems:"center"}}>
                      <AvatarDot name={before.author} size={18} />
                      <span className="mono" style={{fontSize:11, color:"var(--ink-3)"}}>{before.when}</span>
                    </span>
                  </div>
                  <div style={{padding:18, background:"#fcfdff"}}>
                    <svg viewBox="0 0 300 200" style={{display:"block", width:"100%"}}>
                      <SampleArt x={10} y={10} w={280} h={180} state="before" />
                    </svg>
                  </div>
                </div>
                <div style={{border:"1px solid var(--accent)", borderRadius:8, overflow:"hidden", background:"var(--surface)"}}>
                  <div style={{
                    padding:"10px 14px", borderBottom:"1px solid var(--rule)",
                    display:"flex", alignItems:"baseline", gap:8,
                    background:"#eff5ff",
                  }}>
                    <span className="mono" style={{fontSize:10, letterSpacing:"0.06em", textTransform:"uppercase", color:"var(--accent-2,#1d4ed8)"}}>
                      After
                    </span>
                    <span className="mono" style={{fontSize:12, color:"var(--ink-2)"}}>{after.sha}</span>
                    <span style={{marginLeft:"auto", display:"inline-flex", gap:8, alignItems:"center"}}>
                      <AvatarDot name={after.author} size={18} />
                      <span className="mono" style={{fontSize:11, color:"var(--ink-3)"}}>{after.when}</span>
                    </span>
                  </div>
                  <div style={{padding:18, background:"#fcfdff"}}>
                    <svg viewBox="0 0 300 200" style={{display:"block", width:"100%"}}>
                      <SampleArt x={10} y={10} w={280} h={180} state="after" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="mono" style={{
                fontSize:10, letterSpacing:"0.06em", textTransform:"uppercase",
                color:"var(--ink-3)", marginBottom: 10,
              }}>
                Changes ({compareChanges.length})
              </div>
              <div style={{
                border:"1px solid var(--rule)", borderRadius:8,
                background:"var(--surface)", overflow:"hidden",
              }}>
                {compareChanges.length === 0 && (
                  <div style={{padding:"14px 16px", fontSize:12.5, color:"var(--ink-3)"}}>
                    No detected changes between these commits.
                  </div>
                )}
                {compareChanges.map((c, i) => (
                  <div key={c.el} style={{
                    display:"flex", alignItems:"center", gap:12,
                    padding:"10px 16px",
                    borderTop: i === 0 ? "none" : "1px solid var(--rule)",
                  }}>
                    <span style={{
                      width:10, height:10, borderRadius:"50%",
                      background: KIND_COLOR[c.kind], flex:"0 0 auto",
                    }}></span>
                    <span className="mono" style={{
                      fontSize:10.5, padding:"1px 7px",
                      background:`var(--${c.kind}-bg)`, color: KIND_COLOR[c.kind],
                      borderRadius: 999, fontWeight:600,
                      width: 64, textAlign:"center", flex:"0 0 auto",
                    }}>{KIND_LABEL[c.kind]}</span>
                    <span className="mono" style={{fontSize:12.5, color:"var(--ink)", flex:"0 0 auto"}}>
                      {c.el}
                    </span>
                    <span style={{fontSize:12.5, color:"var(--ink-3)", flex:1}}>
                      {c.note}
                    </span>
                  </div>
                ))}
              </div>

              <div style={{marginTop:18, display:"flex", gap:8}}>
                <button className="btn" onClick={() => setComparing(false)}>← Back to commits</button>
                <button className="btn" onClick={() => setSelected([])}>Clear selection</button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

Object.assign(window, { HistoryScreen, HIST_BRANCHES, COMMIT_DETAILS });
