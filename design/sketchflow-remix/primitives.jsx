/* Clean v2 primitives — no sketch filter, no wobble.
   Crisp SVGs, real colors, consistent stroke weights.
*/

const INK     = "#18181b";
const INK2    = "#3f3f46";
const INK3    = "#71717a";
const INK4    = "#a1a1aa";
const RULE    = "#e4e4e7";
const RULE_S  = "#d4d4d8";
const SURFACE = "#ffffff";
const BG      = "#fafafa";

const ChangeColor = {
  add: { stroke: "#16a34a", fill: "rgba(22,163,74,0.12)",  solid: "#16a34a" },
  rem: { stroke: "#dc2626", fill: "rgba(220,38,38,0.12)",  solid: "#dc2626" },
  mov: { stroke: "#2563eb", fill: "rgba(37,99,235,0.10)",  solid: "#2563eb" },
  sty: { stroke: "#d97706", fill: "rgba(217,119,6,0.14)",  solid: "#d97706" },
};

/* Sample artwork. Crisp lines, real shapes — same model as v1.
   Elements: sun (removed), moon (added), tree (moved), house (restyled). */
function SampleArt({ x, y, w, h, state = "before", overlay = false, highlight = new Set(), legend = {add:true,rem:true,mov:true,sty:true} }) {
  const cx = x, cy = y;
  const minWH = Math.min(w, h);
  const sky = state === "after" ? "#fef9e7" : "#fbfbfb";
  const horizonY = cy + h * 0.68;
  return (
    <g>
      {/* canvas */}
      <rect x={cx} y={cy} width={w} height={h} fill={sky} stroke={RULE_S} strokeWidth="1" />
      {/* ground */}
      <rect x={cx} y={horizonY} width={w} height={h - h*0.68} fill="#f4f4f5" />
      <line x1={cx} y1={horizonY} x2={cx + w} y2={horizonY} stroke={RULE_S} strokeWidth="1" />

      {/* SUN — present in before; in overlay shown as REMOVED */}
      {(state === "before" || (overlay && legend.rem)) && (
        <g>
          <circle cx={cx + w*0.22} cy={cy + h*0.30} r={minWH*0.10}
            fill={overlay ? ChangeColor.rem.fill : "#fde68a"}
            stroke={overlay ? ChangeColor.rem.stroke : "#ca8a04"}
            strokeWidth="1.5"
            strokeDasharray={overlay ? "4 3" : undefined} />
          {highlight.has("sun") && (
            <circle cx={cx + w*0.22} cy={cy + h*0.30} r={minWH*0.14}
              fill="none" stroke={INK} strokeWidth="1.25" strokeDasharray="3 3" />
          )}
        </g>
      )}

      {/* MOON — added in after */}
      {(state === "after" || (overlay && legend.add)) && (
        <g>
          <path d={`M ${cx + w*0.78} ${cy + h*0.20}
                    a ${minWH*0.10} ${minWH*0.10} 0 1 0 0.1 ${minWH*0.20}
                    a ${minWH*0.08} ${minWH*0.08} 0 1 1 -0.1 -${minWH*0.20} z`}
            fill={overlay ? ChangeColor.add.fill : "#fef3c7"}
            stroke={overlay ? ChangeColor.add.stroke : "#a16207"}
            strokeWidth="1.5" />
          {highlight.has("moon") && (
            <circle cx={cx + w*0.78} cy={cy + h*0.30} r={minWH*0.16}
              fill="none" stroke={INK} strokeWidth="1.25" strokeDasharray="3 3" />
          )}
        </g>
      )}

      {/* TREE old position */}
      {(state === "before" || (overlay && legend.mov)) && (
        <g opacity={overlay ? 0.5 : 1}>
          <rect x={cx + w*0.40} y={cy + h*0.55} width={w*0.04} height={h*0.18}
            fill="#92400e"
            stroke={overlay ? ChangeColor.mov.stroke : "#78350f"} strokeWidth="1"
            strokeDasharray={overlay ? "3 3" : undefined} />
          <circle cx={cx + w*0.42} cy={cy + h*0.50} r={minWH*0.09}
            fill={overlay ? ChangeColor.mov.fill : "#65a30d"}
            stroke={overlay ? ChangeColor.mov.stroke : "#3f6212"} strokeWidth="1.25"
            strokeDasharray={overlay ? "3 3" : undefined} />
        </g>
      )}
      {/* TREE new position */}
      {(state === "after" || (overlay && legend.mov)) && (
        <g>
          <rect x={cx + w*0.58} y={cy + h*0.55} width={w*0.04} height={h*0.18}
            fill={overlay ? "none" : "#92400e"}
            stroke={overlay ? ChangeColor.mov.stroke : "#78350f"} strokeWidth="1.25" />
          <circle cx={cx + w*0.60} cy={cy + h*0.50} r={minWH*0.09}
            fill={overlay ? ChangeColor.mov.fill : "#65a30d"}
            stroke={overlay ? ChangeColor.mov.stroke : "#3f6212"} strokeWidth="1.25" />
          {overlay && legend.mov && (
            <g stroke={ChangeColor.mov.stroke} strokeWidth="1.25" fill="none">
              <path d={`M ${cx + w*0.46} ${cy + h*0.50} L ${cx + w*0.56} ${cy + h*0.50}`} />
              <path d={`M ${cx + w*0.555} ${cy + h*0.48} L ${cx + w*0.575} ${cy + h*0.50} L ${cx + w*0.555} ${cy + h*0.52}`} />
            </g>
          )}
          {highlight.has("tree") && (
            <circle cx={cx + w*0.60} cy={cy + h*0.52} r={minWH*0.16}
              fill="none" stroke={INK} strokeWidth="1.25" strokeDasharray="3 3" />
          )}
        </g>
      )}

      {/* HOUSE — restyled */}
      <g>
        <rect x={cx + w*0.32} y={cy + h*0.74} width={w*0.18} height={h*0.16}
          fill={
            overlay && legend.sty ? ChangeColor.sty.fill :
            state === "after" ? "#e9cfa0" : "#fef9e7"
          }
          stroke={overlay && legend.sty ? ChangeColor.sty.stroke : "#78350f"}
          strokeWidth="1.25" />
        <path d={`M ${cx + w*0.32} ${cy + h*0.74}
                  L ${cx + w*0.41} ${cy + h*0.66}
                  L ${cx + w*0.50} ${cy + h*0.74} Z`}
          fill={state === "after" ? "#b45309" : "#92400e"}
          stroke={overlay && legend.sty ? ChangeColor.sty.stroke : "#78350f"}
          strokeWidth="1.25" />
        {highlight.has("house") && (
          <rect x={cx + w*0.30} y={cy + h*0.64} width={w*0.22} height={h*0.28}
            fill="none" stroke={INK} strokeWidth="1.25" strokeDasharray="3 3" />
        )}
      </g>
    </g>
  );
}

/* Compact glyph for component memory nodes */
function ComponentGlyph({ x, y, r, kind, color = INK }) {
  switch (kind) {
    case "sun":
      return (
        <g stroke={color} strokeWidth="1.25" fill="none">
          <circle cx={x} cy={y} r={r*0.5} />
          <line x1={x-r} y1={y} x2={x-r*0.7} y2={y} />
          <line x1={x+r*0.7} y1={y} x2={x+r} y2={y} />
          <line x1={x} y1={y-r} x2={x} y2={y-r*0.7} />
          <line x1={x} y1={y+r*0.7} x2={x} y2={y+r} />
        </g>
      );
    case "tree":
      return (
        <g stroke={color} strokeWidth="1.25" fill="none">
          <circle cx={x} cy={y-r*0.25} r={r*0.55} />
          <line x1={x} y1={y+r*0.3} x2={x} y2={y+r*0.85} />
        </g>
      );
    case "house":
      return (
        <g stroke={color} strokeWidth="1.25" fill="none">
          <rect x={x-r*0.65} y={y-r*0.05} width={r*1.3} height={r*0.85} />
          <path d={`M ${x-r*0.75} ${y-r*0.05} L ${x} ${y-r*0.75} L ${x+r*0.75} ${y-r*0.05}`} />
        </g>
      );
    case "moon":
      return (
        <path d={`M ${x+r*0.3} ${y-r*0.65} a ${r*0.65} ${r*0.65} 0 1 0 0 ${r*1.3} a ${r*0.45} ${r*0.45} 0 1 1 0 -${r*1.3} z`}
          stroke={color} strokeWidth="1.25" fill="none" />
      );
    case "cloud":
      return (
        <path d={`M ${x-r*0.8} ${y+r*0.2}
                  q 0 -${r*0.5} ${r*0.45} -${r*0.45}
                  q ${r*0.05} -${r*0.45} ${r*0.55} -${r*0.25}
                  q ${r*0.45} -${r*0.05} ${r*0.45} ${r*0.4}
                  q ${r*0.3} ${r*0.1} 0 ${r*0.4}
                  L ${x-r*0.8} ${y+r*0.3}
                  q -${r*0.3} 0 0 -${r*0.1} z`}
          stroke={color} strokeWidth="1.25" fill="none" />
      );
    case "grid":
      return (
        <g stroke={color} strokeWidth="1.1" fill="none">
          <rect x={x-r*0.7} y={y-r*0.7} width={r*1.4} height={r*1.4} />
          <line x1={x} y1={y-r*0.7} x2={x} y2={y+r*0.7} />
          <line x1={x-r*0.7} y1={y} x2={x+r*0.7} y2={y} />
        </g>
      );
    case "star":
      return (
        <path d={`M ${x} ${y-r*0.8}
                  L ${x+r*0.22} ${y-r*0.22}
                  L ${x+r*0.8} ${y-r*0.22}
                  L ${x+r*0.32} ${y+r*0.12}
                  L ${x+r*0.5} ${y+r*0.7}
                  L ${x} ${y+r*0.32}
                  L ${x-r*0.5} ${y+r*0.7}
                  L ${x-r*0.32} ${y+r*0.12}
                  L ${x-r*0.8} ${y-r*0.22}
                  L ${x-r*0.22} ${y-r*0.22} Z`}
          stroke={color} strokeWidth="1.1" fill="none" />
      );
    default:
      return <circle cx={x} cy={y} r={r*0.5} fill="none" stroke={color} strokeWidth="1.25" />;
  }
}

/* Role chip — tiny pill that surfaces who's acting and what they're allowed to do.
   Use `role="owner"` for the project owner (resolves conflicts, merges, etc.).
   Anything else renders as a quiet "collaborator" chip. */
function RoleChip({ name, role = "collaborator", you = false, size = "sm" }) {
  const isOwner = role === "owner";
  const pad = size === "md" ? "3px 10px" : "2px 8px";
  const fz  = size === "md" ? 11.5 : 10.5;
  return (
    <span className="mono" style={{
      display:"inline-flex", alignItems:"center", gap:6,
      padding: pad, fontSize: fz,
      borderRadius: 999,
      background: isOwner ? "#eff5ff" : "var(--surface-2)",
      border: `1px solid ${isOwner ? "var(--accent)" : "var(--rule-strong)"}`,
      color: isOwner ? "var(--accent-2,#1d4ed8)" : "var(--ink-2)",
      fontWeight: 500,
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: "50%",
        background: isOwner ? "var(--accent)" : "var(--ink-4)",
      }}></span>
      {name}{you ? " · you" : ""}
      <span style={{
        textTransform:"uppercase", letterSpacing:"0.06em",
        fontSize: 9, color: isOwner ? "var(--accent-2,#1d4ed8)" : "var(--ink-3)",
        paddingLeft: 6, marginLeft: 4,
        borderLeft: `1px solid ${isOwner ? "var(--accent)" : "var(--rule-strong)"}`,
      }}>{role}</span>
    </span>
  );
}

/* Provenance line — used by the AI Report and any AI-generated artefact. */
function Provenance({ commits = 0, components = 0, when = "just now" }) {
  return (
    <div className="mono" style={{
      display:"inline-flex", alignItems:"center", gap:8,
      fontSize: 11, color:"var(--ink-3)",
      padding:"4px 10px",
      border:"1px dashed var(--rule-strong)",
      borderRadius: 999,
      background:"var(--surface-2)",
    }}>
      <span style={{
        width:14, height:14, borderRadius: 3,
        background:"linear-gradient(135deg, var(--accent), #7c3aed)",
        display:"inline-flex", alignItems:"center", justifyContent:"center",
        color:"#fff", fontSize:9, fontWeight:700,
      }}>AI</span>
      <span>AI-generated · based on <b style={{color:"var(--ink-2)"}}>{commits}</b> commits + component graph ({components})</span>
      <span style={{color:"var(--ink-4)"}}>·</span>
      <span>{when}</span>
    </div>
  );
}

/* Section header inside a frame body */
function Section({ title, right, children, style }) {
  return (
    <div style={{padding:"16px 20px", borderBottom: "1px solid var(--rule)", ...style}}>
      <div style={{display:"flex", alignItems:"center", marginBottom: title ? 12 : 0}}>
        {title && <div style={{fontFamily:"var(--mono)", fontSize:10, letterSpacing:"0.06em", textTransform:"uppercase", color:"var(--ink-3)"}}>{title}</div>}
        <div style={{marginLeft:"auto", display:"flex", gap:6}}>{right}</div>
      </div>
      {children}
    </div>
  );
}

Object.assign(window, {
  INK, INK2, INK3, INK4, RULE, RULE_S, SURFACE, BG,
  ChangeColor, SampleArt, ComponentGlyph, Section,
  RoleChip, Provenance,
});
