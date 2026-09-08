/** Тоог хүснэгтэд бичих. null бол зураас. */
export function fmt(v: number | null | undefined, digits = 1): string {
  return v === null || v === undefined || !Number.isFinite(v) ? "—" : v.toFixed(digits);
}

/**
 * Хэрэглэгчийн бичсэн тоог уншина.
 * Монголд бутархайг таслалаар бичдэг тул "4,8" хэлбэрийг ч хүлээж авна.
 */
export function parseNum(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim().replace(/\s+/g, "").replace(",", ".");
  if (s === "" || s === "-" || s === "—") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function mean(values: (number | null)[]): number | null {
  const xs = values.filter((v): v is number => v !== null && Number.isFinite(v));
  if (!xs.length) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export function maxOf(values: (number | null)[]): number | null {
  const xs = values.filter((v): v is number => v !== null && Number.isFinite(v));
  return xs.length ? Math.max(...xs) : null;
}

/** Графикийн тэнхлэгт тохирох дугуй дээд хязгаар. */
export function niceMax(v: number): number {
  if (!(v > 0)) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  const s = v / mag;
  const step = s <= 1 ? 1 : s <= 2 ? 2 : s <= 2.5 ? 2.5 : s <= 5 ? 5 : 10;
  return step * mag;
}

/** Хувиар харьцуулсан хазайлт: 84% гэх мэт. */
export function percentOf(value: number | null, base: number | null): number | null {
  if (value === null || base === null || base === 0) return null;
  return Math.round((value / base) * 100);
}
