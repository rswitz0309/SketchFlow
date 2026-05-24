/* Common sketchy primitives used across all wireframes.
   Everything is plain SVG so it renders crisply at any scale.
   The hand-drawn wobble comes from the global #sketch filter (applied where you want it).
*/

const SK_INK = "#1c1a17";
const SK_INK2 = "#3b3631";
const SK_INK3 = "#6a6258";
const SK_PAPER = "#fbf6ea";
const SK_RULE = "#c9bfae";
const SK_HL = "rgba(243, 209, 55, 0.42)";

// Color tokens for change types
const ChangeColor = {
  add:  { stroke: "oklch(0.55 0.12 145)", fill: "oklch(0.62 0.12 145 / 0.18)", solid: "oklch(0.55 0.12 145)" },
  rem:  { stroke: "oklch(0.50 0.16 25)",  fill: "oklch(0.56 0.16 25 / 0.18)",  solid: "oklch(0.50 0.16 25)" },
  mov:  { stroke: "oklch(0.48 0.13 255)", fill: "oklch(0.55 0.13 255 / 0.14)", solid: "oklch(0.48 0.13 255)" },
  sty:  { stroke: "oklch(0.55 0.13 75)",  fill: "oklch(0.72 0.13 75 / 0.22)",  solid: "oklch(0.55 0.13 75)" },
};

/* A rough rectangle — single rect with slight stroke jitter via filter */
function RBox({ x, y, w, h, stroke=SK_INK, fill="none", sw=1.5, dashed=false, rx=2, filter="url(#sketch)" }) {
  return (
    <rect x={x} y={y} width={w} height={h} rx={rx} ry={rx}
      stroke={stroke} fill={fill} strokeWidth={sw}
      strokeDasharray={dashed ? "5 4" : undefined}
      filter={filter}
      vectorEffect="non-scaling-stroke"
    />
  );
}

/* A small art placeholder — striped diagonal fill + label.
   Use for "this is where the rendered SVG goes". */
function ArtPlaceholder({ x, y, w, h, label, stroke=SK_INK, dim=false, accent=null }) {
  const id = React.useMemo(() => "stripe-" + Math.random().toString(36).slice(2,8), []);
  const op = dim ? 0.55 : 1;
  return (
    <g opacity={op}>
      <defs>
        <pattern id={id} width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <line x1="0" y1="0" x2="0" y2="10" stroke={stroke} strokeWidth="0.6" opacity="0.35" />
        </pattern>
      </defs>
      <rect x={x} y={y} width={w} height={h} fill={`url(#${id})`} stroke={stroke} strokeWidth="1.25"
            filter="url(#sketch)" vectorEffect="non-scaling-stroke" />
      {accent && <rect x={x} y={y} width={w} height={h} fill={accent} opacity="0.5" />}
      {label && (
        <text x={x + w/2} y={y + h/2 + 4} textAnchor="middle"
          fontSize="10" fontFamily="IBM Plex Mono, monospace" fill={SK_INK3}
          style={{ letterSpacing: "0.5px" }}>
          {label}
        </text>
      )}
    </g>
  );
}

/* Sample artwork composed inside a panel: sun + tree + house style.
   Each shape has an id so the diff overlay can highlight specific elements.
   `state` controls which version: 'before' or 'after'.
   `highlight` is a Set of element ids to fill with --hl. */
function SampleArt({ x, y, w, h, state="before", overlay=false, highlight=new Set(), legend={add:true,rem:true,mov:true,sty:true} }) {
  // Coordinate system: sub-svg
  const cx = x, cy = y;
  // Frame
  return (
    <g>
      {/* frame */}
      <RBox x={cx} y={cy} w={w} h={h} stroke={SK_INK} fill="#fff" sw={1.5} />
      {/* horizon line */}
      <line x1={cx+8} y1={cy + h*0.66} x2={cx + w - 8} y2={cy + h*0.66}
        stroke={SK_INK2} strokeWidth="1" filter="url(#sketch)" vectorEffect="non-scaling-stroke" />

      {/* SUN — present in BEFORE; removed in AFTER. In overlay shown as removed. */}
      {(state === "before" || (overlay && legend.rem)) && (
        <g opacity={state === "before" ? 1 : (overlay ? 0.85 : 0)}>
          <circle cx={cx + w*0.22} cy={cy + h*0.30} r={Math.min(w,h)*0.10}
            fill={overlay ? ChangeColor.rem.fill : "none"}
            stroke={overlay ? ChangeColor.rem.stroke : SK_INK}
            strokeWidth="1.6"
            strokeDasharray={overlay ? "4 3" : undefined}
            filter="url(#sketch)" vectorEffect="non-scaling-stroke" />
          {highlight.has("sun") && <circle cx={cx + w*0.22} cy={cy + h*0.30} r={Math.min(w,h)*0.135}
            fill="none" stroke={SK_INK} strokeWidth="1.25" strokeDasharray="2 3" />}
        </g>
      )}

      {/* MOON — added in AFTER. Appears in overlay as add. */}
      {(state === "after" || (overlay && legend.add)) && (
        <g opacity={state === "after" ? 1 : (overlay ? 0.95 : 0)}>
          <path d={`M ${cx + w*0.78} ${cy + h*0.22}
                    a ${Math.min(w,h)*0.10} ${Math.min(w,h)*0.10} 0 1 0 0.1 ${Math.min(w,h)*0.20}
                    a ${Math.min(w,h)*0.08} ${Math.min(w,h)*0.08} 0 1 1 -0.1 -${Math.min(w,h)*0.20} z`}
            fill={overlay ? ChangeColor.add.fill : "#f9efc8"}
            stroke={overlay ? ChangeColor.add.stroke : SK_INK}
            strokeWidth="1.6"
            filter="url(#sketch)" vectorEffect="non-scaling-stroke" />
          {highlight.has("moon") && <circle cx={cx + w*0.78} cy={cy + h*0.30} r={Math.min(w,h)*0.16}
            fill="none" stroke={SK_INK} strokeWidth="1.25" strokeDasharray="2 3" />}
        </g>
      )}

      {/* TREE — moved between before/after. */}
      {/* Old position (before) */}
      {(state === "before" || (overlay && legend.mov)) && (
        <g opacity={state === "before" ? 1 : (overlay ? 0.55 : 0)}>
          {/* trunk */}
          <rect x={cx + w*0.40} y={cy + h*0.55} width={w*0.05} height={h*0.18}
            fill={overlay ? "none" : "#fff"}
            stroke={overlay ? ChangeColor.mov.stroke : SK_INK} strokeWidth="1.4"
            strokeDasharray={overlay ? "3 3" : undefined}
            filter="url(#sketch)" vectorEffect="non-scaling-stroke" />
          {/* canopy */}
          <circle cx={cx + w*0.425} cy={cy + h*0.50} r={Math.min(w,h)*0.10}
            fill={overlay ? ChangeColor.mov.fill : "#fff"}
            stroke={overlay ? ChangeColor.mov.stroke : SK_INK} strokeWidth="1.4"
            strokeDasharray={overlay ? "3 3" : undefined}
            filter="url(#sketch)" vectorEffect="non-scaling-stroke" />
        </g>
      )}
      {/* New position (after) */}
      {(state === "after" || (overlay && legend.mov)) && (
        <g opacity={state === "after" ? 1 : (overlay ? 1 : 0)}>
          <rect x={cx + w*0.58} y={cy + h*0.55} width={w*0.05} height={h*0.18}
            fill={overlay ? "none" : "#fff"}
            stroke={overlay ? ChangeColor.mov.stroke : SK_INK} strokeWidth="1.5"
            filter="url(#sketch)" vectorEffect="non-scaling-stroke" />
          <circle cx={cx + w*0.605} cy={cy + h*0.50} r={Math.min(w,h)*0.10}
            fill={overlay ? ChangeColor.mov.fill : "#fff"}
            stroke={overlay ? ChangeColor.mov.stroke : SK_INK} strokeWidth="1.5"
            filter="url(#sketch)" vectorEffect="non-scaling-stroke" />
          {/* arrow from old to new in overlay */}
          {overlay && legend.mov && (
            <g stroke={ChangeColor.mov.stroke} strokeWidth="1.25" fill="none" filter="url(#sketch)" vectorEffect="non-scaling-stroke">
              <path d={`M ${cx + w*0.46} ${cy + h*0.50} L ${cx + w*0.56} ${cy + h*0.50}`} />
              <path d={`M ${cx + w*0.555} ${cy + h*0.48} L ${cx + w*0.575} ${cy + h*0.50} L ${cx + w*0.555} ${cy + h*0.52}`} />
            </g>
          )}
          {highlight.has("tree") && <circle cx={cx + w*0.605} cy={cy + h*0.52} r={Math.min(w,h)*0.18}
            fill="none" stroke={SK_INK} strokeWidth="1.25" strokeDasharray="2 3" />}
        </g>
      )}

      {/* HOUSE — restyled (fill change). Same position both states. */}
      <g>
        <rect x={cx + w*0.32} y={cy + h*0.74} width={w*0.18} height={h*0.16}
          fill={
            overlay && legend.sty ? ChangeColor.sty.fill :
            state === "after" ? "#e9cfa0" : "#fff"
          }
          stroke={overlay && legend.sty ? ChangeColor.sty.stroke : SK_INK} strokeWidth="1.5"
          filter="url(#sketch)" vectorEffect="non-scaling-stroke" />
        <path d={`M ${cx + w*0.32} ${cy + h*0.74}
                  L ${cx + w*0.41} ${cy + h*0.66}
                  L ${cx + w*0.50} ${cy + h*0.74}`}
          fill="none"
          stroke={overlay && legend.sty ? ChangeColor.sty.stroke : SK_INK}
          strokeWidth="1.5" filter="url(#sketch)" vectorEffect="non-scaling-stroke" />
        {highlight.has("house") && <rect x={cx + w*0.30} y={cy + h*0.64} width={w*0.22} height={h*0.28}
          fill="none" stroke={SK_INK} strokeWidth="1.25" strokeDasharray="2 3" />}
      </g>
    </g>
  );
}

/* Sticky-note pointer with optional arrow leg.
   Position in SVG coords. */
function StickyNote({ x, y, w=120, h=32, text, leg=null, rot=-2 }) {
  return (
    <g transform={`rotate(${rot} ${x + w/2} ${y + h/2})`}>
      <rect x={x} y={y} width={w} height={h} fill="#fff4b8" stroke={SK_INK} strokeWidth="1.1"
        filter="url(#sketch)" vectorEffect="non-scaling-stroke" />
      <text x={x + 6} y={y + h/2 + 4}
        fontFamily="Caveat, cursive" fontSize="15" fill={SK_INK}>
        {text}
      </text>
      {leg && (
        <path d={`M ${leg.fx} ${leg.fy} Q ${(leg.fx+leg.tx)/2} ${(leg.fy+leg.ty)/2 - 10} ${leg.tx} ${leg.ty}`}
          stroke={SK_INK} strokeWidth="1" fill="none" strokeDasharray="2 3" />
      )}
    </g>
  );
}

/* Card title + caption helpers used in JSX */
function VariationCard({ n, title, caption, children }) {
  return (
    <div className="card">
      <div className="badge"><span className="n">{n}</span> · variation</div>
      <h3>{title}</h3>
      {children}
      <p className="caption" dangerouslySetInnerHTML={{ __html: caption }} />
    </div>
  );
}

/* Tab strip (rendered by app.jsx). The active-class logic is there. */

Object.assign(window, {
  RBox, ArtPlaceholder, SampleArt, StickyNote, VariationCard,
  ChangeColor, SK_INK, SK_INK2, SK_INK3, SK_PAPER, SK_RULE, SK_HL,
});
