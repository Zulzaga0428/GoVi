/** Сарын дугаарыг «08» хэлбэрээр. ХААЦУС мөн ингэж бичдэг. */
export const MONTHS = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];

export type Period = { year: number; month: number; decade: number };

export function periodKey(p: Period): string {
  return `${p.year}-${MONTHS[p.month - 1]}-${p.decade}`;
}

/** ХААЦУС-ын бичиглэл: «2026 оны 08 сарын 01-р 10 хоног» */
export function periodLabel(p: Period): string {
  return `${p.year} оны ${MONTHS[p.month - 1]} сарын 0${p.decade}-р 10 хоног`;
}

export function decadeDays(decade: number): string {
  return decade === 1 ? "1–10" : decade === 2 ? "11–20" : "21–сүүл";
}

export function currentPeriod(now = new Date()): Period {
  const d = now.getDate();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    decade: d <= 10 ? 1 : d <= 20 ? 2 : 3
  };
}

/** Өмнөх 10 хоног — хандлага харьцуулахад хэрэглэнэ. */
export function previousPeriod(p: Period): Period {
  if (p.decade > 1) return { ...p, decade: p.decade - 1 };
  if (p.month > 1) return { year: p.year, month: p.month - 1, decade: 3 };
  return { year: p.year - 1, month: 12, decade: 3 };
}

/** Өнгөрсөн оны мөн үе. */
export function lastYearPeriod(p: Period): Period {
  return { ...p, year: p.year - 1 };
}

export function isValidPeriodKey(k: string): boolean {
  return /^\d{4}-\d{2}-[123]$/.test(k);
}

export function parsePeriodKey(k: string): Period | null {
  if (!isValidPeriodKey(k)) return null;
  const [y, m, d] = k.split("-");
  return { year: Number(y), month: Number(m), decade: Number(d) };
}
