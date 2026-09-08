"use client";

import { useEffect, useRef, useState } from "react";
import { GROUPS, FIELDS, IS_GROUP_START } from "@/lib/fields";
import { STATIONS } from "@/lib/stations";
import { parseNum } from "@/lib/format";
import { periodLabel, periodKey, type Period } from "@/lib/period";
import type { Report } from "@/lib/types";

/**
 * 14 станцыг дараалуулж бөглөх хурдан горим.
 *
 * Багана нь гар бичмэл маягтын дараалалтай яг ижил тул цаасаа хараад
 * нүдээ салгалгүй шивнэ. Tab баруун, Enter доош — хулгана хэрэггүй.
 * ХААЦУС эсвэл Excel-ээс блокоор наах боломжтой.
 */

const NORM_COL = FIELDS.length;
const OBS_COL = FIELDS.length + 1;
const COLS = FIELDS.length + 2;

export function QuickGrid({
  period,
  rows,
  normHints,
  onClose,
  onSaveMany
}: {
  period: Period;
  rows: Report[];
  normHints: Record<string, { year: number; v: number }>;
  onClose: () => void;
  onSaveMany: (recs: Report[]) => Promise<{ ok: number; failed: string[] }>;
}) {
  const box = useRef<HTMLTableElement>(null);
  const [msg, setMsg] = useState<{ text: string; ok?: boolean }>({ text: "" });
  const [saving, setSaving] = useState<string>("");

  const byIdx = new Map(rows.map((r) => [r.st, r]));

  // Нүднүүдийг DOM-оос уншина — 14 × 20 нүдэнд state барих нь шивэлтийг удаашруулна.
  const cell = (r: number, c: number): HTMLInputElement | null =>
    box.current?.querySelector<HTMLInputElement>(`[data-r="${r}"][data-c="${c}"]`) ?? null;

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    cell(0, 0)?.focus();
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);

  // ОЖД санал: өмнөх оны ИЖИЛ сар, ИЖИЛ 10 хоногоос (ОЖД үе бүрд өөр).
  useEffect(() => {
    const used: string[] = [];
    STATIONS.forEach((s, ri) => {
      const hint = normHints[s.idx];
      if (!hint) return;
      const el = cell(ri, NORM_COL);
      if (el && el.value.trim() === "") {
        el.value = String(hint.v);
        el.classList.add("hinted");
        el.title = `${hint.year} оны ижил 10 хоногийн мэдээнээс санал болгов`;
        used.push(s.name);
      }
    });
    if (used.length) {
      setMsg({
        text: `ОЖД баганад ${used.length} станцын утгыг өмнөх оны ижил 10 хоногоос санал болгов (саарал нүд).`,
        ok: true
      });
    }
  }, [normHints]);

  function onKeyDown(e: React.KeyboardEvent<HTMLTableElement>) {
    const t = e.target as HTMLInputElement;
    if (!t.dataset?.r) return;
    const r = Number(t.dataset.r);
    const c = Number(t.dataset.c);

    if (e.key === "Enter") {
      e.preventDefault();
      const next = cell(e.shiftKey ? r - 1 : r + 1, c);
      next?.focus();
      next?.select();
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const next = cell(e.key === "ArrowDown" ? r + 1 : r - 1, c);
      next?.focus();
      next?.select();
    }
  }

  function onPaste(e: React.ClipboardEvent<HTMLTableElement>) {
    const t = e.target as HTMLInputElement;
    if (!t.dataset?.r) return;
    const text = e.clipboardData.getData("text");
    if (!text || (!text.includes("\t") && !text.includes("\n"))) return;

    e.preventDefault();
    const r0 = Number(t.dataset.r);
    const c0 = Number(t.dataset.c);
    const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
    let n = 0;

    lines.forEach((line, i) => {
      if (line === "" && i === lines.length - 1) return;
      line.split("\t").forEach((raw, j) => {
        const el = cell(r0 + i, c0 + j);
        if (!el) return;
        if (el.dataset.f === "obs") {
          el.value = raw.trim();
        } else {
          const p = parseNum(raw);
          el.value = p === null ? "" : String(p);
          el.classList.remove("hinted");
          el.title = "";
        }
        n++;
      });
    });
    setMsg({ text: `${n} нүд буулаа. Шалгаад «Бүгдийг хадгалах» дарна уу.`, ok: true });
  }

  async function saveAll() {
    const recs: Report[] = [];

    STATIONS.forEach((s, ri) => {
      const rec: Record<string, unknown> = {
        period: periodKey(period),
        year: period.year,
        month: period.month,
        decade: period.decade,
        st: s.idx,
        at: new Date().toISOString()
      };
      FIELDS.forEach((f, ci) => {
        rec[f.key] = parseNum(cell(ri, ci)?.value);
      });
      rec.pr_norm = parseNum(cell(ri, NORM_COL)?.value);
      rec.obs = (cell(ri, OBS_COL)?.value ?? "").trim();

      // Нэмэлт үнэлгээ нь хурдан горимд байхгүй — өмнөх утгыг нь хадгална.
      const prev = byIdx.get(s.idx);
      rec.note = prev?.note ?? "";
      rec.phase = prev?.phase ?? "";
      rec.cond = prev?.cond ?? "";
      rec.risk = prev?.risk ?? "";

      if (rec.t_avg === null && rec.pr === null) return; // хоосон мөрийг алгасна
      recs.push(rec as Report);
    });

    if (!recs.length) {
      setMsg({ text: "Нэг ч мөр бөглөгдөөгүй байна. Ядаж агаарын дундаж эсвэл тунадас шаардлагатай." });
      return;
    }

    setSaving(`Хадгалж байна… 0/${recs.length}`);
    const res = await onSaveMany(recs);
    setSaving("");
    if (!res.failed.length) {
      onClose();
    } else {
      setMsg({ text: `${res.ok} станц хадгалагдлаа. ${res.failed.join(", ")} амжилтгүй.` });
    }
  }

  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet wide" role="dialog" aria-modal="true" aria-labelledby="qgTitle">
        <div className="sheet-head">
          <div>
            <h2 id="qgTitle">14 станцыг дараалуулж бөглөх</h2>
            <p>{periodLabel(period)} · багана нь гар бичмэл маягтын дараалалтай ижил</p>
          </div>
          <button className="close-x" aria-label="Хаах" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="sheet-body">
          <p className="grid-hint">
            <span>
              <kbd>Tab</kbd> баруун тийш
            </span>
            <span>
              <kbd>Enter</kbd> доошоо, <kbd>Shift</kbd>+<kbd>Enter</kbd> дээшээ
            </span>
            <span>
              <kbd>Ctrl</kbd>+<kbd>V</kbd> ХААЦУС эсвэл Excel-ээс блокоор наана
            </span>
          </p>

          <div className="grid-scroll">
            <table className="grid" ref={box} onKeyDown={onKeyDown} onPaste={onPaste}>
              <thead>
                <tr className="grp-row">
                  <th rowSpan={2}>Салбар</th>
                  {GROUPS.map((g) => (
                    <th key={g.name} colSpan={g.fields.length}>
                      {g.name}
                    </th>
                  ))}
                  <th colSpan={2}>Нэмэлт</th>
                </tr>
                <tr className="f-row">
                  {FIELDS.map((f) => (
                    <th key={f.key} className={IS_GROUP_START[f.key] ? "gsep" : undefined} title={f.full}>
                      {f.head}
                    </th>
                  ))}
                  <th className="gsep">ОЖД, мм</th>
                  <th>Тоовор хийсэн</th>
                </tr>
              </thead>
              <tbody>
                {STATIONS.map((s, ri) => {
                  const r = byIdx.get(s.idx);
                  return (
                    <tr key={s.idx} className={r ? "filled" : undefined}>
                      <td className="name">
                        {s.name}
                        <span>{s.idx}</span>
                      </td>
                      {FIELDS.map((f, ci) => (
                        <td key={f.key} className={IS_GROUP_START[f.key] ? "gsep" : undefined}>
                          <input
                            type="text"
                            inputMode="decimal"
                            autoComplete="off"
                            data-r={ri}
                            data-c={ci}
                            data-f={f.key}
                            defaultValue={r?.[f.key] ?? ""}
                            onFocus={(e) => e.currentTarget.select()}
                          />
                        </td>
                      ))}
                      <td className="gsep">
                        <input
                          type="text"
                          inputMode="decimal"
                          autoComplete="off"
                          data-r={ri}
                          data-c={NORM_COL}
                          data-f="pr_norm"
                          defaultValue={r?.pr_norm ?? ""}
                          onFocus={(e) => e.currentTarget.select()}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="obs"
                          autoComplete="off"
                          data-r={ri}
                          data-c={OBS_COL}
                          data-f="obs"
                          defaultValue={r?.obs ?? ""}
                          onFocus={(e) => e.currentTarget.select()}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="grid-legend">
            Станцын нэрний зүүн талын хөх зураас = энэ станц мэдээгээ аль хэдийн өгсөн.
          </p>
        </div>

        <div className="sheet-foot">
          <span className={`form-msg${msg.ok ? " ok" : ""}`}>{msg.text}</span>
          <span style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose}>Болих</button>
            <button className="primary" onClick={saveAll} disabled={!!saving}>
              {saving || "Бүгдийг хадгалах"}
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}

export { COLS };
