/* HISTORY GRAPH — 3 variations: vertical, horizontal, radial.
   Each shows: branches as colored lines, merge commits w/ 2 parents,
   commit preview, two-select to diff, merge action, NL search (stretch).
*/

const branchPalette = [
  ChangeColor.add.solid,   // main — green-ish
  ChangeColor.mov.solid,   // feat/sunset — blue
  ChangeColor.sty.solid,   // fix/moon — amber
  ChangeColor.rem.solid,   // exp/grid — red
];

function HistoryV1() {
  // Vertical, GitHub-style, with hover preview popover
  return (
    <VariationCard
      n="01"
      title="Vertical lanes · hover preview"
      caption="<b>Newest on top, branches as columns.</b> Familiar — reads like GitHub's network view. Click a commit to lock the preview popover; shift-click a second to enable the Diff button. Merge action lives next to the branch picker."
    >
      <div style={{display:"flex", gap:8, alignItems:"center", margin:"2px 4px 8px", fontFamily:"var(--mono)", fontSize:11}}>
        <span style={{padding:"2px 8px", border:"1.25px solid var(--ink)", borderRadius:3, background:"#fff"}}>branch: <b>feat/sunset</b> ▾</span>
        <span style={{padding:"2px 8px", border:"1.25px solid var(--ink)", borderRadius:3, background:"#fff"}}>show: all branches ▾</span>
        <span style={{marginLeft:"auto"}}>
          <span style={{padding:"2px 8px", border:"1.25px solid var(--ink)", borderRadius:3, background:"#fff4b8", marginRight:6}}>↗ open diff (2 selected)</span>
          <span style={{padding:"2px 8px", border:"1.25px solid var(--ink)", borderRadius:3, background:"#fff"}}>⤚ merge…</span>
        </span>
      </div>
      <svg viewBox="0 0 580 360" className="canvas" preserveAspectRatio="xMidYMid meet">
        {/* Lane headers */}
        {["main","feat/sunset","fix/moon","exp/grid"].map((b, i) => (
          <g key={b}>
            <line x1={60 + i*80} y1={20} x2={60 + i*80} y2={350} stroke={branchPalette[i]} strokeWidth="2" opacity="0.55" />
            <text x={60 + i*80} y={14} fontSize="9" fontFamily="IBM Plex Mono, monospace" fill={branchPalette[i]} textAnchor="middle" fontWeight="700">{b}</text>
          </g>
        ))}
        {/* Commits — y from top (newer) to bottom (older) */}
        {(() => {
          const commits = [
            { y: 36,  lane: 1, sha: "c4f3", msg: "sunset gradient",  head: true, selected: true },
            { y: 70,  lane: 1, sha: "9b2e", msg: "tree pos tweak" },
            { y: 104, lane: 2, sha: "11ab", msg: "moon crescent" },
            { y: 138, lane: 1, sha: "7d09", msg: "branch sunset" },
            { y: 138, lane: 2, sha: "7d09", invisible: true },
            { y: 172, lane: 0, sha: "a17b", msg: "background", selected: true },
            { y: 206, lane: 0, sha: "merged", merge: true, parents: [[1, 240],[3,240]] },
            { y: 240, lane: 1, sha: "ee01", msg: "exp grid branch" },
            { y: 240, lane: 3, sha: "ee01", invisible: true },
            { y: 274, lane: 0, sha: "44bd", msg: "first shapes" },
            { y: 308, lane: 0, sha: "c0d3", msg: "init" },
          ];
          // Edges (simple vertical along lanes plus the merge crossover at y=206)
          return (
            <>
              {/* parent edges drawn explicitly for forks/merges */}
              <path d={`M ${60 + 1*80} 70 L ${60 + 1*80} 138 Q ${60 + 1*80} 172 ${60 + 0*80} 172`}
                stroke={branchPalette[1]} strokeWidth="2" fill="none" />
              <path d={`M ${60 + 2*80} 104 Q ${60 + 2*80} 138 ${60 + 0*80} 172`}
                stroke={branchPalette[2]} strokeWidth="2" fill="none" />
              <path d={`M ${60 + 1*80} 240 Q ${60 + 1*80} 206 ${60 + 0*80} 206`}
                stroke={branchPalette[1]} strokeWidth="2" fill="none" />
              <path d={`M ${60 + 3*80} 240 Q ${60 + 3*80} 206 ${60 + 0*80} 206`}
                stroke={branchPalette[3]} strokeWidth="2" fill="none" />
              {commits.filter(c => !c.invisible).map((c, i) => (
                <g key={i}>
                  <circle cx={60 + c.lane*80} cy={c.y} r={c.merge ? 7 : 6}
                    fill={c.selected ? "#fff4b8" : (c.merge ? "#fff" : branchPalette[c.lane])}
                    stroke={SK_INK} strokeWidth={c.selected ? 2 : 1.4}
                    filter="url(#sketch)" />
                  {c.merge && <text x={60 + c.lane*80} y={c.y + 3} textAnchor="middle" fontSize="9">⤚</text>}
                  <text x={60 + c.lane*80 + 16} y={c.y + 4} fontFamily="IBM Plex Mono, monospace" fontSize="10" fill={SK_INK}>
                    {c.sha} {c.head && <tspan fill={ChangeColor.rem.solid} fontWeight="700">HEAD</tspan>}
                  </text>
                  {c.msg && (
                    <text x={60 + c.lane*80 + 16} y={c.y + 16} fontSize="9" fill={SK_INK3} fontFamily="IBM Plex Mono, monospace">
                      {c.msg}
                    </text>
                  )}
                  {c.selected && <rect x={60 + c.lane*80 - 14} y={c.y - 14} width={200} height={28} fill="none" stroke={SK_INK} strokeWidth="1.25" strokeDasharray="2 3" />}
                </g>
              ))}
            </>
          );
        })()}

        {/* Hover preview popover */}
        <g transform="translate(360, 30)">
          <RBox x={0} y={0} w={210} h={170} fill="#fff" sw={1.4} />
          <text x={10} y={16} fontSize="9" fill={SK_INK3} fontFamily="IBM Plex Mono, monospace">PREVIEW · c4f3 sunset</text>
          <SampleArt x={10} y={22} w={190} h={120} state="after" />
          <text x={10} y={158} fontSize="9" fill={SK_INK2} fontFamily="IBM Plex Mono, monospace">"sunset gradient" · jane · 2d ago</text>
        </g>
        <StickyNote x={388} y={206} w={170} h={26} text="popover follows the cursor" rot={-2} />
      </svg>
    </VariationCard>
  );
}

function HistoryV2() {
  // Horizontal timeline, NL search prominent, preview side panel
  return (
    <VariationCard
      n="02"
      title="Horizontal timeline · NL search"
      caption="<b>Left → right time axis</b>, branches stacked as horizontal swimlanes. Preview docked on the right as a persistent panel. A prominent natural-language search bar (<i>'find where I added the sun'</i>) drops a pin on the matching commit."
    >
      <div style={{display:"flex", gap:8, margin:"2px 4px 8px"}}>
        <span style={{padding:"3px 10px", border:"1.25px solid var(--ink)", borderRadius:999, background:"#fff4b8", fontFamily:"var(--mono)", fontSize:11, flex:1}}>
          🔍 find where I added the sun…
          <span style={{float:"right", color:"var(--ink-3)"}}>↵</span>
        </span>
        <span style={{padding:"3px 8px", border:"1.25px solid var(--ink)", borderRadius:3, background:"#fff", fontFamily:"var(--mono)", fontSize:11}}>↗ diff (2)</span>
        <span style={{padding:"3px 8px", border:"1.25px solid var(--ink)", borderRadius:3, background:"#fff", fontFamily:"var(--mono)", fontSize:11}}>⤚ merge…</span>
      </div>
      <svg viewBox="0 0 580 320" className="canvas" preserveAspectRatio="xMidYMid meet">
        {/* Right preview panel area */}
        <RBox x={400} y={20} w={170} h={290} fill="#fff" sw={1.4} />
        <text x={410} y={36} fontSize="9" fill={SK_INK3} fontFamily="IBM Plex Mono, monospace">PREVIEW · c4f3</text>
        <SampleArt x={410} y={42} w={150} h={120} state="after" />
        <text x={410} y={178} fontSize="9" fill={SK_INK2} fontFamily="IBM Plex Mono, monospace">"sunset gradient"</text>
        <text x={410} y={192} fontSize="8" fill={SK_INK3} fontFamily="IBM Plex Mono, monospace">jane · 2d ago</text>
        <line x1={410} y1={210} x2={560} y2={210} stroke={SK_RULE} strokeDasharray="3 2" />
        <text x={410} y={224} fontSize="9" fill={SK_INK3} fontFamily="IBM Plex Mono, monospace">PINPOINT</text>
        <text x={410} y={240} fontSize="10" fill={SK_INK} fontFamily="Caveat, cursive">elements introduced</text>
        {["#sun","#sky-gradient","#cloud"].map((e, i) => (
          <text key={e} x={410} y={258 + i*14} fontSize="9.5" fontFamily="IBM Plex Mono, monospace" fill={SK_INK}>· {e}</text>
        ))}

        {/* Lane labels */}
        {["main","feat/sunset","fix/moon","exp/grid"].map((b, i) => (
          <g key={b}>
            <text x={14} y={48 + i*60} fontSize="9" fontFamily="IBM Plex Mono, monospace" fill={branchPalette[i]} fontWeight="700">{b}</text>
            <line x1={14} y1={56 + i*60} x2={390} y2={56 + i*60} stroke={branchPalette[i]} strokeWidth="2" opacity="0.55" />
          </g>
        ))}

        {/* Commits along each lane */}
        {(() => {
          const dots = [
            // [lane, x, sha, opts]
            [0, 50, "c0d3"], [0, 110, "44bd"], [0, 220, "merged", {merge:true}], [0, 320, "a17b"],
            [1, 170, "7d09"], [1, 250, "9b2e"], [1, 320, "c4f3", {head:true, selected:true, found:true}],
            [2, 200, "11ab", {selected:true}],
            [3, 220, "ee01"],
          ];
          // edges
          const edges = (
            <>
              <path d="M 170 56 Q 200 56 200 116" stroke={branchPalette[1]} strokeWidth="2" fill="none" />
              <path d="M 200 116 Q 200 56 220 56" stroke={branchPalette[1]} strokeWidth="2" fill="none" />
              <path d="M 220 56 L 220 176 220 56" stroke={branchPalette[2]} strokeWidth="2" fill="none" />
              <path d="M 200 176 Q 220 176 220 56" stroke={branchPalette[2]} strokeWidth="2" fill="none" />
              <path d="M 220 236 Q 220 56 220 56" stroke={branchPalette[3]} strokeWidth="2" fill="none" />
            </>
          );
          return (
            <>
              {edges}
              {dots.map(([lane, x, sha, opts={}], i) => (
                <g key={i}>
                  <circle cx={x} cy={56 + lane*60} r={opts.merge ? 7 : 6}
                    fill={opts.selected ? "#fff4b8" : (opts.merge ? "#fff" : branchPalette[lane])}
                    stroke={SK_INK} strokeWidth={opts.selected ? 2 : 1.4}
                    filter="url(#sketch)" />
                  {opts.merge && <text x={x} y={56 + lane*60 + 3} textAnchor="middle" fontSize="9">⤚</text>}
                  <text x={x} y={56 + lane*60 + 22} textAnchor="middle" fontSize="9" fontFamily="IBM Plex Mono, monospace" fill={SK_INK2}>{sha}</text>
                  {opts.head && <text x={x} y={56 + lane*60 - 12} textAnchor="middle" fontSize="9" fill={ChangeColor.rem.solid} fontWeight="700" fontFamily="IBM Plex Mono, monospace">HEAD</text>}
                  {opts.found && (
                    <>
                      <circle cx={x} cy={56 + lane*60} r="14" fill="none" stroke={ChangeColor.rem.solid} strokeWidth="1.5" strokeDasharray="3 3" />
                      <text x={x + 20} y={56 + lane*60 - 6} fontSize="11" fontFamily="Caveat, cursive" fill={ChangeColor.rem.solid}>match!</text>
                    </>
                  )}
                </g>
              ))}
              {/* Time axis */}
              <line x1={14} y1={296} x2={390} y2={296} stroke={SK_INK} strokeWidth="1" />
              <text x={14} y={310} fontSize="8" fontFamily="IBM Plex Mono, monospace" fill={SK_INK3}>2 weeks ago</text>
              <text x={390} y={310} textAnchor="end" fontSize="8" fontFamily="IBM Plex Mono, monospace" fill={SK_INK3}>now</text>
            </>
          );
        })()}
      </svg>
    </VariationCard>
  );
}

function HistoryV3() {
  // Radial / tree from root center
  return (
    <VariationCard
      n="03"
      title="Radial tree · zoomable canvas"
      caption="<b>Root at the center</b>, branches spread radially. Pan/zoom canvas — feels more like a map than a list. Selected commits get a connecting arc that doubles as the diff entry point. Best when 'this project has memory' is part of the pitch."
    >
      <div style={{display:"flex", gap:8, margin:"2px 4px 8px", fontFamily:"var(--mono)", fontSize:11}}>
        <span style={{padding:"3px 8px", border:"1.25px solid var(--ink)", borderRadius:3, background:"#fff"}}>zoom: 100% ▾</span>
        <span style={{padding:"3px 8px", border:"1.25px solid var(--ink)", borderRadius:3, background:"#fff"}}>filter: all branches ▾</span>
        <span style={{marginLeft:"auto", padding:"3px 8px", border:"1.25px solid var(--ink)", borderRadius:3, background:"#fff4b8"}}>↗ diff connected (2)</span>
        <span style={{padding:"3px 8px", border:"1.25px solid var(--ink)", borderRadius:3, background:"#fff"}}>⤚ merge…</span>
      </div>
      <svg viewBox="0 0 580 340" className="canvas" preserveAspectRatio="xMidYMid meet">
        {/* Center root */}
        {(() => {
          const cx = 290, cy = 170;
          // Define branches as angle ranges from the root
          const branches = [
            { color: branchPalette[0], angle: -1.0, count: 4, name: "main" },
            { color: branchPalette[1], angle: -0.2, count: 5, name: "feat/sunset" },
            { color: branchPalette[2], angle: 0.6,  count: 3, name: "fix/moon" },
            { color: branchPalette[3], angle: 1.5,  count: 4, name: "exp/grid" },
            { color: branchPalette[1], angle: -2.0, count: 3, name: "feat/sky" },
            { color: branchPalette[2], angle: 2.5,  count: 2, name: "fix/colors" },
          ];
          const els = [];
          // Concentric rings (subtle)
          [50, 90, 130, 170].forEach(r => {
            els.push(<circle key={"r"+r} cx={cx} cy={cy} r={r} fill="none" stroke={SK_RULE} strokeDasharray="2 4" strokeWidth="0.8" />);
          });
          // Root
          els.push(<circle key="root" cx={cx} cy={cy} r={9} fill={SK_INK} />);
          els.push(<text key="rootl" x={cx} y={cy + 4} textAnchor="middle" fontSize="9" fill="#fff" fontFamily="IBM Plex Mono, monospace">c0d3</text>);
          // Branches
          branches.forEach((b, bi) => {
            const a = b.angle;
            // Curved branch path
            const points = [];
            for (let i = 1; i <= b.count; i++) {
              const r = 40 + i * 28;
              // slight curve: jitter angle as it extends
              const ang = a + Math.sin(i * 0.3) * 0.15;
              points.push([cx + Math.cos(ang) * r, cy + Math.sin(ang) * r]);
            }
            // line from root through points
            const path = `M ${cx} ${cy} ` + points.map(p => `L ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
            els.push(<path key={"bl"+bi} d={path} stroke={b.color} strokeWidth="2" fill="none" opacity="0.7" />);
            points.forEach((p, i) => {
              const isLast = i === points.length - 1;
              const selected = (bi === 1 && i === 3) || (bi === 0 && i === 1);
              els.push(
                <g key={`b${bi}c${i}`}>
                  <circle cx={p[0]} cy={p[1]} r={isLast ? 6 : 4.5}
                    fill={selected ? "#fff4b8" : b.color}
                    stroke={SK_INK} strokeWidth={selected ? 1.8 : 1.2}
                    filter="url(#sketch)" />
                </g>
              );
            });
            // branch label at tip
            const tip = points[points.length - 1];
            const tipLabelX = tip[0] + Math.cos(a) * 24;
            const tipLabelY = tip[1] + Math.sin(a) * 24;
            els.push(
              <text key={"bn"+bi} x={tipLabelX} y={tipLabelY} fontSize="9.5" fontFamily="IBM Plex Mono, monospace" fill={b.color} textAnchor="middle" fontWeight="700">{b.name}</text>
            );
          });
          // Diff arc between two selected commits
          const sel1 = [cx + Math.cos(-1.0 + Math.sin(2*0.3)*0.15) * (40 + 2*28),
                        cy + Math.sin(-1.0 + Math.sin(2*0.3)*0.15) * (40 + 2*28)];
          const sel2 = [cx + Math.cos(-0.2 + Math.sin(4*0.3)*0.15) * (40 + 4*28),
                        cy + Math.sin(-0.2 + Math.sin(4*0.3)*0.15) * (40 + 4*28)];
          const midX = (sel1[0] + sel2[0]) / 2;
          const midY = (sel1[1] + sel2[1]) / 2 - 40;
          els.push(<path key="diffarc" d={`M ${sel1[0]} ${sel1[1]} Q ${midX} ${midY} ${sel2[0]} ${sel2[1]}`}
            stroke={SK_INK} strokeWidth="1.5" fill="none" strokeDasharray="4 3" />);
          els.push(<text key="diffl" x={midX} y={midY + 16} textAnchor="middle" fontSize="13" fontFamily="Caveat, cursive" fill={SK_INK}>diff these →</text>);

          return els;
        })()}

        {/* Preview overlay */}
        <g transform="translate(20, 20)">
          <RBox x={0} y={0} w={140} h={120} fill="#fff" sw={1.3} />
          <text x={8} y={14} fontSize="8" fontFamily="IBM Plex Mono, monospace" fill={SK_INK3}>PREVIEW · c4f3</text>
          <SampleArt x={8} y={20} w={124} h={92} state="after" />
        </g>
        <StickyNote x={415} y={300} w={142} h={26} text="pan + zoom · drag to roam" rot={2} />
      </svg>
    </VariationCard>
  );
}

function HistoryArea() {
  return (
    <div className="grid">
      <HistoryV1 />
      <HistoryV2 />
      <HistoryV3 />
    </div>
  );
}

Object.assign(window, { HistoryArea });
