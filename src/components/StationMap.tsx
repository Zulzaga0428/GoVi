import { STATIONS } from "@/lib/stations";
import type { Report } from "@/lib/types";

/**
 * Станцуудын СХЕМ зураг — захиргааны жинхэнэ хил БИШ.
 * Байрлалыг `STATIONS[].pos` дотор 0–1 координатаар хадгална.
 *
 * Hook хэрэглээгүй цэвэр компонент тул landing (сервер) болон
 * ажлын самбар (клиент) хоёуланд ижил ажиллана.
 */

const W = 560;
const H = 400;
const PX = 46;
const PY = 34;

function seqStep(v: number, lo: number, hi: number): number {
  if (hi <= lo) return 3;
  return Math.max(1, Math.min(5, Math.floor(((v - lo) / (hi - lo)) * 5) + 1));
}

export type MapProps = {
  rows: Report[];
  field: keyof Report;
  unit: string;
  digits: number;
  label: string;
  /** Landing дээрх жижиг хувилбар — нэрийг богиносгож, хүрээг нимгэлнэ. */
  compact?: boolean;
};

export function StationMap({ rows, field, unit, digits, label, compact }: MapProps) {
  const byIdx = new Map(rows.map((r) => [r.st, r]));

  const values: number[] = [];
  for (const s of STATIONS) {
    const v = byIdx.get(s.idx)?.[field];
    if (typeof v === "number" && Number.isFinite(v)) values.push(v);
  }
  const lo = values.length ? Math.min(...values) : 0;
  const hi = values.length ? Math.max(...values) : 0;

  const X = (u: number) => PX + u * (W - PX * 2);
  const Y = (u: number) => PY + u * (H - PY * 2);

  return (
    <svg
      className="map-svg"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`${label} — Өмнөговь аймгийн станцуудын схем зураг`}
    >
      <rect
        x={14} y={12} width={W - 28} height={H - 24} rx={10}
        fill="none" stroke="var(--rule)" strokeWidth={1} strokeDasharray="3 5"
      />
      {STATIONS.map((s) => {
        if (!s.pos) return null;
        const cx = X(s.pos[0]);
        const cy = Y(s.pos[1]);
        const raw = byIdx.get(s.idx)?.[field];
        const v = typeof raw === "number" && Number.isFinite(raw) ? raw : null;

        const step = v === null ? 0 : seqStep(v, lo, hi);
        const fill = v === null ? "none" : `var(--seq${step})`;
        const ink = v === null ? "var(--muted)" : `var(--seqi${step})`;
        const ring = v === null ? "var(--rule-strong)" : "var(--surface)";

        return (
          <g key={s.idx}>
            <circle
              cx={cx} cy={cy} r={compact ? 13 : 15}
              fill={fill} stroke={ring} strokeWidth={2}
              strokeDasharray={v === null ? "2 3" : undefined}
            >
              <title>{`${s.name} (${s.idx}) — ${v === null ? "мэдээ ирээгүй" : `${v.toFixed(digits)} ${unit}`}`}</title>
            </circle>
            {s.center && (
              <circle
                cx={cx} cy={cy} r={compact ? 18 : 20}
                fill="none" stroke="var(--ink-2)" strokeWidth={1} strokeDasharray="2 3"
              />
            )}
            {v !== null && (
              <text
                x={cx} y={cy + 3.5} textAnchor="middle"
                fontSize={compact ? 9 : 10} fontWeight={600} fill={ink}
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {Number(v.toFixed(digits))}
              </text>
            )}
            <text
              x={cx} y={cy + (compact ? 25 : 28)} textAnchor="middle"
              fontSize={compact ? 8.5 : 9.5} fill="var(--ink-2)"
            >
              {s.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Зурагт ороогүй — байрлал нь тодруулаагүй станцууд. */
export function UnplacedChips({
  rows, field, unit, digits
}: {
  rows: Report[];
  field: keyof Report;
  unit: string;
  digits: number;
}) {
  const byIdx = new Map(rows.map((r) => [r.st, r]));
  const unplaced = STATIONS.filter((s) => !s.pos);
  if (!unplaced.length) return null;

  return (
    <div className="unplaced">
      <span>Байрлал тодруулаагүй:</span>
      {unplaced.map((s) => {
        const raw = byIdx.get(s.idx)?.[field];
        const v = typeof raw === "number" && Number.isFinite(raw) ? raw : null;
        return (
          <span className="chip" key={s.idx}>
            <b>{s.idx}</b>
            {s.name}
            {v !== null && ` · ${Number(v.toFixed(digits))} ${unit}`}
          </span>
        );
      })}
    </div>
  );
}

export function MapLegend({
  lo, hi, unit, digits
}: {
  lo: number;
  hi: number;
  unit: string;
  digits: number;
}) {
  return (
    <div className="map-legend">
      <span>{Number(lo.toFixed(digits))}</span>
      <span className="ramp">
        {[1, 2, 3, 4, 5].map((i) => (
          <i key={i} style={{ background: `var(--seq${i})` }} />
        ))}
      </span>
      <span>
        {Number(hi.toFixed(digits))} {unit}
      </span>
      <span style={{ marginLeft: "auto" }}>
        Тойрог доторх тоо = утга · тасархай хүрээ = мэдээгүй
      </span>
    </div>
  );
}

export function mapRange(rows: Report[], field: keyof Report): { lo: number; hi: number } {
  const values: number[] = [];
  for (const r of rows) {
    const v = r[field];
    if (typeof v === "number" && Number.isFinite(v)) values.push(v);
  }
  return values.length ? { lo: Math.min(...values), hi: Math.max(...values) } : { lo: 0, hi: 0 };
}
