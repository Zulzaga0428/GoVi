"use client";

import { useState } from "react";
import { stationName } from "@/lib/stations";
import { niceMax } from "@/lib/format";
import type { Report } from "@/lib/types";

type Item = { name: string; v: number; n: number | null };

/**
 * Хэвтээ баганан график. Нэг цуваа тул тайлбар шаардахгүй — утга нь
 * багана бүрийн ард шууд бичигдэнэ. Олон жилийн дундаж байвал зураасаар.
 */
export function BarChart({
  rows,
  field,
  normField,
  unit,
  digits = 1
}: {
  rows: Report[];
  field: keyof Report;
  normField?: keyof Report;
  unit: string;
  digits?: number;
}) {
  const [hover, setHover] = useState<Item | null>(null);

  const items: Item[] = rows
    .map((r) => {
      const raw = r[field];
      const v = typeof raw === "number" && Number.isFinite(raw) ? raw : null;
      if (v === null) return null;
      const rawN = normField ? r[normField] : null;
      const n = typeof rawN === "number" && Number.isFinite(rawN) ? rawN : null;
      return { name: stationName(r.st), v, n };
    })
    .filter((x): x is Item => x !== null)
    .sort((a, b) => b.v - a.v);

  if (!items.length) {
    return <p className="empty-chart">Мэдээ ороогүй тул график зурагдаагүй байна</p>;
  }

  const W = 560;
  const GL = 108;
  const GR = 54;
  const rowH = 25;
  const barH = 12;
  const top = 20;
  const bot = 28;
  const plotW = W - GL - GR;
  const H = top + items.length * rowH + bot;

  const peak = Math.max(...items.map((d) => Math.max(d.v, d.n ?? 0)));
  const maxV = niceMax(peak);
  const x = (v: number) => GL + (v / maxV) * plotW;
  const ticks = [0, maxV / 4, maxV / 2, (maxV * 3) / 4, maxV];

  return (
    <div style={{ position: "relative" }}>
      <svg className="chart-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Станц тус бүрийн утга, ${unit}`}>
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={x(t)} y1={top} x2={x(t)} y2={H - bot} stroke="var(--rule)" strokeWidth={1} />
            <text x={x(t)} y={H - bot + 15} textAnchor="middle" fontSize={10} fill="var(--muted)">
              {Number(t.toFixed(1))}
            </text>
          </g>
        ))}

        {items.map((d, i) => {
          const y = top + i * rowH;
          const w = Math.max(2, x(d.v) - GL);
          return (
            <g
              key={d.name + i}
              onMouseEnter={() => setHover(d)}
              onMouseLeave={() => setHover(null)}
            >
              <rect x={0} y={y} width={W} height={rowH} fill="transparent" />
              <text x={GL - 10} y={y + rowH / 2 + 4} textAnchor="end" fontSize={11.5} fill="var(--ink-2)">
                {d.name}
              </text>
              <rect x={GL} y={y + (rowH - barH) / 2} width={w} height={barH} rx={4} fill="var(--bar)" />
              <text
                x={GL + w + 8}
                y={y + rowH / 2 + 4}
                fontSize={11.5}
                fill="var(--ink)"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {Number(d.v.toFixed(digits))}
              </text>
              {d.n !== null && d.n > 0 && d.n <= maxV && (
                <rect
                  x={x(d.n) - 1}
                  y={y + (rowH - barH) / 2 - 3}
                  width={2}
                  height={barH + 6}
                  fill="var(--ink-2)"
                />
              )}
            </g>
          );
        })}

        <line x1={GL} y1={top} x2={GL} y2={H - bot} stroke="var(--rule-strong)" strokeWidth={1} />
        <text x={W - GR + 4} y={H - bot + 15} fontSize={10} fill="var(--muted)">
          {unit}
        </text>
      </svg>

      {hover && (
        <div
          aria-hidden
          style={{
            position: "absolute", left: 18, top: 8, pointerEvents: "none",
            background: "var(--ink)", color: "var(--ground)", fontSize: 12,
            padding: "7px 10px", borderRadius: 3, whiteSpace: "nowrap",
            fontVariantNumeric: "tabular-nums", boxShadow: "0 4px 14px rgba(0,0,0,.25)"
          }}
        >
          <b style={{ display: "block", marginBottom: 2 }}>{hover.name}</b>
          {Number(hover.v.toFixed(2))} {unit}
          {hover.n !== null && hover.n > 0 && (
            <>
              <br />
              олон жилийн дундаж {Number(hover.n.toFixed(1))} {unit} ·{" "}
              {Math.round((hover.v / hover.n) * 100)}%
            </>
          )}
        </div>
      )}
    </div>
  );
}
