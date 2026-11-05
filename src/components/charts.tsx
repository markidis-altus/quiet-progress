import { useEffect, useRef, useState } from "react";

/** Tracks an element's rendered width so SVG text is never stretched. */
function useWidth(fallback = 340) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setW(Math.max(200, Math.round(el.clientWidth)));
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

export interface Series {
  label: string;
  color: string;
  values: (number | null)[];
  kind?: "line" | "bar" | "area" | "dots";
  width?: number;
  dashed?: boolean;
}

/**
 * Responsive SVG chart with shared x axis. Values are in data units; y range
 * is computed from all series (or given). Touch/drag scrubs a tooltip.
 */
export function Chart({
  series, labels, height = 160, yMin, yMax, guide, fmtY = (v) => String(Math.round(v)), tickEvery, yTicks = true,
}: {
  series: Series[]; labels: string[]; height?: number; yMin?: number; yMax?: number;
  guide?: { value: number; label: string; color: string };
  fmtY?: (v: number) => string; tickEvery?: number; yTicks?: boolean;
}) {
  const [wrapRef, W] = useWidth();
  const H = height, padL = yTicks ? 30 : 6, padR = 6, padT = 10, padB = 20;
  const n = labels.length;
  const all = series.flatMap((s) => s.values.filter((v): v is number => v != null));
  if (guide) all.push(guide.value);
  let lo = yMin ?? (all.length ? Math.min(...all) : 0);
  let hi = yMax ?? (all.length ? Math.max(...all) : 1);
  if (hi - lo < 1e-9) { lo -= 1; hi += 1; }
  if (yMin == null && yMax == null) { const pad = (hi - lo) * 0.08; lo -= pad; hi += pad; }
  const hasBars = series.some((s) => s.kind === "bar");
  const slot = (W - padL - padR) / Math.max(n, 1);
  const x = (i: number) => (hasBars ? padL + slot * (i + 0.5) : padL + ((W - padL - padR) * i) / Math.max(n - 1, 1));
  const y = (v: number) => padT + (H - padT - padB) * (1 - (v - lo) / (hi - lo));
  const ref = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const onMove = (clientX: number) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const px = ((clientX - r.left) / r.width) * W;
    let best = 0, bd = Infinity;
    for (let i = 0; i < n; i++) { const d = Math.abs(x(i) - px); if (d < bd) { bd = d; best = i; } }
    setHover(best);
  };
  const every = tickEvery ?? Math.max(1, Math.ceil(n / 7));
  const ticks = [lo, (lo + hi) / 2, hi];

  return (
    <div className="chart" ref={wrapRef}>
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} width={W} height={H}
        onPointerMove={(e) => onMove(e.clientX)} onPointerDown={(e) => onMove(e.clientX)} onPointerLeave={() => setHover(null)}
        style={{ touchAction: "pan-y" }}>
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="var(--grid)" strokeDasharray="3 3" strokeWidth={0.6} vectorEffect="non-scaling-stroke" />
            {yTicks && <text x={padL - 4} y={y(t) + 3} textAnchor="end" className="axis">{fmtY(t)}</text>}
          </g>
        ))}
        {guide && (
          <g>
            <line x1={padL} x2={W - padR} y1={y(guide.value)} y2={y(guide.value)} stroke={guide.color} strokeDasharray="5 4" strokeWidth={1.4} vectorEffect="non-scaling-stroke" />
            <text x={W - padR - 2} y={y(guide.value) - 4} textAnchor="end" className="axis" style={{ fill: guide.color }}>{guide.label}</text>
          </g>
        )}
        {series.map((s, si) => {
          if (s.kind === "bar") {
            const bw = Math.max(2, slot * 0.62);
            const base = y(Math.max(lo, 0));
            return (
              <g key={si}>
                {s.values.map((v, i) => v == null ? null : (
                  <rect key={i} x={x(i) - bw / 2} y={Math.min(y(v), base)} width={bw} height={Math.max(0.5, Math.abs(base - y(v)))} rx={2}
                    fill={s.color} opacity={hover == null || hover === i ? 1 : 0.55} />
                ))}
              </g>
            );
          }
          const pts = s.values.map((v, i) => (v == null ? null : [x(i), y(v)] as const)).filter(Boolean) as [number, number][];
          if (!pts.length) return null;
          const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
          return (
            <g key={si}>
              {s.kind === "area" && (
                <path d={`${d} L${pts[pts.length - 1][0]} ${y(lo)} L${pts[0][0]} ${y(lo)} Z`} fill={s.color} opacity={0.18} />
              )}
              {s.kind !== "dots" && (
                <path d={d} fill="none" stroke={s.color} strokeWidth={s.width ?? 2} strokeDasharray={s.dashed ? "4 4" : undefined}
                  strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              )}
              {(s.kind === "dots" || pts.length < 40) && s.kind !== "area" && pts.map((p, i) => (
                <ellipse key={i} cx={p[0]} cy={p[1]} rx={s.kind === "dots" ? 2.2 : 1.6} ry={s.kind === "dots" ? 2.2 : 1.6} fill={s.color} />
              ))}
            </g>
          );
        })}
        {hover != null && <line x1={x(hover)} x2={x(hover)} y1={padT} y2={H - padB} stroke="var(--muted)" strokeWidth={1} vectorEffect="non-scaling-stroke" opacity={0.6} />}
        {labels.map((l, i) => ((i % every === 0 && (n - 1 - i >= every * 0.6 || every === 1)) || i === n - 1) && l ? (
          <text key={i} x={x(i)} y={H - 5} textAnchor={i === 0 && !hasBars ? "start" : i === n - 1 && !hasBars ? "end" : "middle"} className="axis">{l}</text>
        ) : null)}
      </svg>
      {hover != null && (
        <div className="tip" style={{ left: `${(x(hover) / W) * 100}%` }}>
          <b>{labels[hover]}</b>
          {series.map((s, i) => s.values[hover] != null && (
            <span key={i}><i style={{ background: s.color }} />{s.label} {fmtY(s.values[hover]!)}</span>
          ))}
        </div>
      )}
      <div className="legend">
        {series.map((s, i) => <span key={i}><i style={{ background: s.color }} />{s.label}</span>)}
      </div>
    </div>
  );
}

/** Whole-year heatmap that fits a phone: one row per month, one column per day of the month. */
export function YearHeat({ year, value, color = "var(--teal)" }: { year: number; value: (date: string) => number | null; color?: string }) {
  const [ref, w] = useWidth();
  const labelW = 26, gap = 2;
  const cell = Math.max(5, Math.min(14, Math.floor((w - labelW) / 31) - gap));
  const pad = (x: number) => String(x).padStart(2, "0");
  const H = 12 * (cell + gap);
  return (
    <div ref={ref} style={{ width: "100%" }}>
      <svg width={labelW + 31 * (cell + gap)} height={H} style={{ display: "block" }}>
        {Array.from({ length: 12 }, (_, m) => {
          const n = new Date(year, m + 1, 0).getDate();
          return (
            <g key={m}>
              <text x={0} y={m * (cell + gap) + cell - 1} className="axis">{"JFMAMJJASOND"[m]}</text>
              {Array.from({ length: n }, (_, d) => {
                const date = `${year}-${pad(m + 1)}-${pad(d + 1)}`;
                const v = value(date);
                return (
                  <rect key={d} x={labelW + d * (cell + gap)} y={m * (cell + gap)} width={cell} height={cell} rx={2}
                    fill={v == null ? "var(--heat-none)" : v <= 0 ? "var(--heat-zero)" : color} opacity={v == null || v <= 0 ? 1 : 0.28 + 0.72 * Math.min(1, v)}>
                    <title>{date} · {v == null ? "—" : Math.round(v * 100) + "%"}</title>
                  </rect>
                );
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** GitHub-style calendar heatmap: one column per week (Mon at top). */
export function Heatmap({ cells, color = "var(--purple)", cell = 11, gap = 3, onPick }: {
  cells: { date: string; v: number | null; title?: string }[]; color?: string; cell?: number; gap?: number; onPick?: (date: string) => void;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  useEffect(() => { if (wrap.current) wrap.current.scrollLeft = wrap.current.scrollWidth; }, [cells.length]);
  if (!cells.length) return null;
  const first = new Date(cells[0].date + "T00:00:00");
  const offset = (first.getDay() + 6) % 7;
  const cols = Math.ceil((cells.length + offset) / 7);
  const W = cols * (cell + gap), H = 7 * (cell + gap);
  return (
    <div className="heat-wrap" ref={wrap}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {cells.map((c, i) => {
          const k = i + offset, col = Math.floor(k / 7), row = k % 7;
          const v = c.v;
          return (
            <rect key={c.date} x={col * (cell + gap)} y={row * (cell + gap)} width={cell} height={cell} rx={2.5}
              fill={v == null ? "var(--heat-none)" : v <= 0 ? "var(--heat-zero)" : color}
              opacity={v == null || v <= 0 ? 1 : 0.28 + 0.72 * Math.min(1, v)} onClick={() => onPick?.(c.date)}>
              <title>{c.title ?? c.date}</title>
            </rect>
          );
        })}
      </svg>
    </div>
  );
}
