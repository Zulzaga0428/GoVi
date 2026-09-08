import type { Report } from "./types";
import { STATIONS } from "./stations";
import { FIELDS, CONDITION_LABEL, RISK_LABEL } from "./fields";
import { MONTHS, type Period } from "./period";

function q(v: unknown): string {
  return `"${String(v ?? "").replace(/"/g, '""')}"`;
}

/** Excel-д шууд нээгдэх CSV. BOM тавьсан тул кирилл үсэг зөв гарна. */
export function toCsv(rows: Report[], period: Period): string {
  const byIdx = new Map(rows.map((r) => [r.st, r]));

  const head = [
    "Салбар", "Станц", "Он", "Сар", "10 хоног",
    ...FIELDS.map((f) => `${f.full}${f.unit ? `, ${f.unit}` : ""}`),
    "Олон жилийн дундаж тунадас, мм",
    "Хөгжлийн үе шат", "Бэлчээрийн нөхцөл", "Ган зуд",
    "Тоовор хийсэн", "Тэмдэглэл"
  ];

  const lines = [head.map(q).join(",")];

  for (const s of STATIONS) {
    const r = byIdx.get(s.idx);
    const row: unknown[] = [
      s.idx, s.name, period.year, MONTHS[period.month - 1], `0${period.decade}`,
      ...FIELDS.map((f) => r?.[f.key] ?? ""),
      r?.pr_norm ?? "",
      r?.phase ?? "",
      r?.cond ? CONDITION_LABEL[r.cond] : "",
      r?.risk ? RISK_LABEL[r.risk] : "",
      r?.obs ?? "",
      r?.note ?? ""
    ];
    lines.push(row.map(q).join(","));
  }

  return "﻿" + lines.join("\r\n");
}

export function downloadCsv(text: string, filename: string) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
