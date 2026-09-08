import { FIELD_KEYS, type FieldKey } from "./fields";

/** Нэг станцын нэг 10 хоногийн мэдээ. */
export type Report = {
  /** "2026-08-1" — он-сар-10 хоног */
  period: string;
  year: number;
  month: number;
  /** 1 | 2 | 3 */
  decade: number;
  /** Станцын индекс: "339", "385" … */
  st: string;

  /** Маягтын хэмжигдэхүүнүүд. Бөглөөгүй бол null. */
  t_avg: number | null; t_max: number | null; t_min: number | null; t_d30: number | null;
  s_avg: number | null; s_max: number | null; s_min: number | null; s_d40: number | null;
  rh: number | null;
  w_max: number | null; w_d10: number | null;
  pr: number | null; pr_d: number | null;
  pl_h: number | null; pl_c: number | null; pl_y: number | null;
  sn_d: number | null; sn_b: number | null;

  /** Нэмэлт үнэлгээ — маягт дээр байхгүй. */
  pr_norm: number | null;
  phase: string;
  cond: string;
  risk: string;

  obs: string;
  note: string;
  /** ISO хугацаа */
  at: string;
};

export const NUMERIC_KEYS: (keyof Report)[] = [
  "year", "month", "decade", ...FIELD_KEYS, "pr_norm"
];

export const TEXT_KEYS: (keyof Report)[] = ["period", "st", "phase", "cond", "risk", "obs", "note", "at"];

export function emptyReport(period: string, year: number, month: number, decade: number, st: string): Report {
  const r: Record<string, unknown> = {
    period, year, month, decade, st,
    pr_norm: null, phase: "", cond: "", risk: "", obs: "", note: "",
    at: new Date().toISOString()
  };
  for (const k of FIELD_KEYS) r[k] = null;
  return r as Report;
}

export function fieldValue(r: Report | undefined, key: FieldKey): number | null {
  if (!r) return null;
  const v = r[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}
