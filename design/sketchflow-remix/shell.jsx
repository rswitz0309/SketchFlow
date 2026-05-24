/* APP SHELL — 3 variations of the left-sidebar IDE shell.
   Common requirement: branch switcher, currently-checked-out commit, surface nav.
*/

function ShellV1() {
  // Surfaces-first sidebar + branch picker at top + commit at bottom
  return (
    <VariationCard
      n="01"
      title="Surfaces-first sidebar"
      caption="<b>Recommended baseline.</b> Branch picker pinned at top of the rail. Big tap targets for the four surfaces. Currently-checked-out commit lives in the footer so it's always visible without taking screen real estate."
    >
      <svg viewBox="0 0 580 360" className="canvas" preserveAspectRatio="xMidYMid meet">
        {/* Window frame */}
        <RBox x={10} y={10} w={560} h={340} sw={1.5} />

        {/* Sidebar */}
        <RBox x={10} y={10} w={170} h={340} fill="#f1e7d2" sw={1.5} />

        {/* Wordmark */}
        <text x={26} y={36} fontFamily="Caveat, cursive" fontSize="22" fill={SK_INK} fontWeight="700">GRAFT.</text>

        {/* Repo */}
        <text x={26} y={62} fontSize="9" fill={SK_INK3}>REPO</text>
        <RBox x={26} y={66} w={138} h={20} fill="#fff" sw={1.1} />
        <text x={34} y={80} fontSize="10" fill={SK_INK}>starfield.svg ▾</text>

        {/* Branch picker */}
        <text x={26} y={104} fontSize="9" fill={SK_INK3}>BRANCH</text>
        <RBox x={26} y={108} w={138} h={22} fill="#fff" sw={1.2} />
        <circle cx={36} cy={119} r={3} fill={ChangeColor.add.solid} />
        <text x={44} y={123} fontSize="11" fill={SK_INK}>feat/sunset ▾</text>

        {/* Surfaces */}
        <text x={26} y={152} fontSize="9" fill={SK_INK3}>SURFACES</text>
        {[
          { label: "Diff", active: true },
          { label: "History" },
          { label: "Merge" },
          { label: "Components" },
        ].map((s, i) => (
          <g key={i}>
            <RBox x={26} y={158 + i*30} w={138} h={24}
                  fill={s.active ? "#fff4b8" : "transparent"}
                  sw={s.active ? 1.4 : 1.0}
                  dashed={!s.active} />
            <rect x={34} y={166 + i*30} width={10} height={10} fill="none" stroke={SK_INK} strokeWidth="1" />
            <text x={50} y={175 + i*30} fontSize="12" fill={SK_INK} fontFamily="Caveat, cursive" fontWeight={s.active?700:500}>{s.label}</text>
          </g>
        ))}

        {/* Footer: checked-out commit */}
        <line x1={20} y1={300} x2={170} y2={300} stroke={SK_RULE} strokeDasharray="3 2" />
        <text x={26} y={314} fontSize="9" fill={SK_INK3}>CHECKED OUT</text>
        <circle cx={30} cy={328} r={4} fill={SK_INK} />
        <text x={40} y={332} fontFamily="IBM Plex Mono, monospace" fontSize="10" fill={SK_INK}>c4f3a8</text>
        <text x={26} y={344} fontSize="9.5" fill={SK_INK2}>"add sunset gradient"</text>

        {/* Main content placeholder */}
        <ArtPlaceholder x={196} y={26} w={360} h={310} label="main surface — e.g. DIFF VIEW" />

        {/* Note */}
        <StickyNote x={400} y={28} w={140} h={26} text="branch ⇆ commit, always visible" rot={-3} />
      </svg>
    </VariationCard>
  );
}

function ShellV2() {
  // Branch tree as the sidebar; surface tabs across the top of the main area
  return (
    <VariationCard
      n="02"
      title="Branch tree + top tabs"
      caption="The sidebar becomes a <b>file-tree of branches and commits</b>; surface selection moves into a pill row above the workspace. Best when you live inside one branch and want commits one click away."
    >
      <svg viewBox="0 0 580 360" className="canvas" preserveAspectRatio="xMidYMid meet">
        <RBox x={10} y={10} w={560} h={340} sw={1.5} />
        {/* Sidebar — wider, tree */}
        <RBox x={10} y={10} w={190} h={340} fill="#f1e7d2" sw={1.5} />
        <text x={26} y={36} fontFamily="Caveat, cursive" fontSize="22" fontWeight="700">GRAFT.</text>
        <text x={26} y={56} fontSize="9" fill={SK_INK3}>starfield.svg</text>

        {/* Tree */}
        {(() => {
          const rows = [
            { d: 0, icon: "▾", label: "main",                                  meta: "",        bold: true },
            { d: 1, icon: "●", label: "c0d3 init",                              meta: "",        muted: true },
            { d: 1, icon: "●", label: "a17b background",                        meta: "",        muted: true },
            { d: 0, icon: "▾", label: "feat/sunset", branchDot: ChangeColor.add.solid,           bold: true },
            { d: 1, icon: "●", label: "c4f3 sunset",  meta: "HEAD",            active: true },
            { d: 1, icon: "●", label: "9b2e tree pos", muted: true },
            { d: 0, icon: "▸", label: "fix/moon", branchDot: ChangeColor.mov.solid },
            { d: 0, icon: "▸", label: "exp/grid", branchDot: ChangeColor.sty.solid },
          ];
          return rows.map((r, i) => {
            const y = 78 + i*22;
            const x0 = 26 + r.d*14;
            return (
              <g key={i}>
                {r.active && <RBox x={22} y={y - 12} w={166} h={20} fill="#fff4b8" sw={1.1} />}
                <text x={x0} y={y} fontFamily="IBM Plex Mono, monospace" fontSize="10"
                  fill={r.muted ? SK_INK3 : SK_INK}
                  fontWeight={r.bold ? 600 : 400}>
                  {r.icon} {r.branchDot && "■ "}{r.label}
                </text>
                {r.meta && (
                  <text x={186} y={y} textAnchor="end" fontSize="8" fill={ChangeColor.rem.solid} fontWeight="700">{r.meta}</text>
                )}
              </g>
            );
          });
        })()}

        {/* Top surface tabs above main */}
        {(() => {
          const tabs = ["Diff", "History", "Merge", "Components"];
          return tabs.map((t, i) => {
            const x = 214 + i*68;
            const on = i === 0;
            return (
              <g key={i}>
                <RBox x={x} y={22} w={62} h={22} fill={on ? "#fff4b8" : "#fff"} sw={on?1.4:1.0} dashed={!on} />
                <text x={x + 31} y={37} textAnchor="middle" fontSize="11" fontFamily="Caveat, cursive" fontWeight={on?700:500}>{t}</text>
              </g>
            );
          });
        })()}

        {/* Main */}
        <ArtPlaceholder x={210} y={54} w={350} h={282} label="main surface — DIFF VIEW" />

        <StickyNote x={32} y={304} w={150} h={26} text="commits live inside branches" rot={-2} />
      </svg>
    </VariationCard>
  );
}

function ShellV3() {
  // Icon rail + command palette
  return (
    <VariationCard
      n="03"
      title="Icon rail + command palette"
      caption="A skinny rail for surface switching plus a prominent <b>⌘K palette</b> in the topbar that handles branch switch, commit jump, and search. Maximises canvas room for the artwork."
    >
      <svg viewBox="0 0 580 360" className="canvas" preserveAspectRatio="xMidYMid meet">
        <RBox x={10} y={10} w={560} h={340} sw={1.5} />

        {/* Icon rail */}
        <RBox x={10} y={10} w={54} h={340} fill="#f1e7d2" sw={1.5} />
        <text x={37} y={32} textAnchor="middle" fontFamily="Caveat, cursive" fontSize="18" fontWeight="700">G.</text>
        {["◫","↯","◊","◉"].map((g, i) => (
          <g key={i}>
            <RBox x={20} y={56 + i*52} w={34} h={34} fill={i===0 ? "#fff4b8" : "transparent"} sw={i===0 ? 1.4 : 1.0} dashed={i!==0} />
            <text x={37} y={80 + i*52} textAnchor="middle" fontSize="18" fill={SK_INK}>{g}</text>
            <text x={37} y={96 + i*52} textAnchor="middle" fontSize="7" fill={SK_INK3}>
              {["DIFF","HIST","MRG","CMP"][i]}
            </text>
          </g>
        ))}

        {/* Top bar */}
        <RBox x={64} y={10} w={506} h={42} fill="#fbf6ea" sw={1.3} />
        <text x={80} y={36} fontFamily="Caveat, cursive" fontSize="20" fontWeight="700">starfield.svg</text>
        <text x={200} y={36} fontFamily="IBM Plex Mono, monospace" fontSize="10" fill={SK_INK2}>· feat/sunset</text>
        <text x={278} y={36} fontFamily="IBM Plex Mono, monospace" fontSize="10" fill={SK_INK3}>· c4f3a8</text>

        {/* Command palette pill */}
        <RBox x={372} y={20} w={184} h={22} fill="#fff" sw={1.2} />
        <text x={382} y={35} fontFamily="IBM Plex Mono, monospace" fontSize="10" fill={SK_INK3}>⌘K  switch branch / find…</text>

        {/* Main */}
        <ArtPlaceholder x={74} y={62} w={490} h={278} label="main surface — DIFF VIEW" />

        <StickyNote x={384} y={48} w={170} h={26} text="palette = power-user routing" rot={2} />
      </svg>
    </VariationCard>
  );
}

function ShellArea() {
  return (
    <div className="grid">
      <ShellV1 />
      <ShellV2 />
      <ShellV3 />
    </div>
  );
}

Object.assign(window, { ShellArea });
