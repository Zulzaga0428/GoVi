"use client";

import { useEffect, useRef, useState } from "react";
import { StationMap, UnplacedChips, MapLegend, mapRange } from "./StationMap";
import { STATIONS } from "@/lib/stations";
import type { Report } from "@/lib/types";

/** Зурагт ээлжлэн харуулах үзүүлэлтүүд. Бүгд магнитуд тул нэг өнгөний шат. */
const VIEWS = [
  { field: "pr" as const, label: "Хур тунадас", unit: "мм", digits: 1 },
  { field: "t_avg" as const, label: "Агаарын дундаж", unit: "°C", digits: 1 },
  { field: "pl_y" as const, label: "Ургамлын ургац", unit: "ц/га", digits: 1 },
  { field: "pl_c" as const, label: "Ургамлын бүрхэц", unit: "%", digits: 0 }
];

const CYCLE_MS = 7000;

export function MapCard({ rows, paused }: { rows: Report[]; paused?: boolean }) {
  const [i, setI] = useState(0);
  const [hover, setHover] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || hover || paused) return;

    timer.current = setInterval(() => setI((n) => (n + 1) % VIEWS.length), CYCLE_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [hover, paused]);

  const view = VIEWS[i];
  const { lo, hi } = mapRange(rows, view.field);
  const have = rows.filter((r) => {
    const v = r[view.field];
    return typeof v === "number" && Number.isFinite(v);
  }).length;

  return (
    <div
      className="hero-map"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
    >
      <div className="hero-map-head">
        <div>
          <h3>{view.label}</h3>
          <p className="sub">
            станцын схем зураг · {have}/{STATIONS.length} станцын мэдээгээр · {view.unit}
          </p>
        </div>
        <div className="map-nav">
          <button
            className="icon"
            aria-label="Өмнөх үзүүлэлт"
            onClick={() => setI((n) => (n - 1 + VIEWS.length) % VIEWS.length)}
          >
            ‹
          </button>
          <span className="map-dots">
            {VIEWS.map((v, k) => (
              <button
                key={v.field}
                className={k === i ? "on" : undefined}
                aria-label={v.label}
                title={v.label}
                onClick={() => setI(k)}
              />
            ))}
          </span>
          <button
            className="icon"
            aria-label="Дараагийн үзүүлэлт"
            onClick={() => setI((n) => (n + 1) % VIEWS.length)}
          >
            ›
          </button>
        </div>
      </div>

      <div className="map-box">
        <StationMap
          rows={rows}
          field={view.field}
          unit={view.unit}
          digits={view.digits}
          label={view.label}
        />
      </div>

      <UnplacedChips rows={rows} field={view.field} unit={view.unit} digits={view.digits} />
      <MapLegend lo={lo} hi={hi} unit={view.unit} digits={view.digits} />
    </div>
  );
}
