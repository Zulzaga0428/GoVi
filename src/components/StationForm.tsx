"use client";

import { useEffect, useState } from "react";
import { GROUPS, FIELDS, PHASES, CONDITIONS, RISKS } from "@/lib/fields";
import { STATIONS } from "@/lib/stations";
import { parseNum } from "@/lib/format";
import { periodLabel, periodKey, type Period } from "@/lib/period";
import type { Report } from "@/lib/types";

/** Нэг станцын дэлгэрэнгүй маягт. Нэмэлт үнэлгээг зөвхөн эндээс оруулна. */
export function StationForm({
  period,
  rows,
  onClose,
  onSave
}: {
  period: Period;
  rows: Report[];
  onClose: () => void;
  onSave: (rec: Report) => Promise<void>;
}) {
  const [st, setSt] = useState(STATIONS[0].idx);
  const [vals, setVals] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ text: string; ok?: boolean }>({ text: "" });
  const [saving, setSaving] = useState(false);

  const existing = rows.find((r) => r.st === st);

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const f of FIELDS) {
      const v = existing?.[f.key];
      next[f.key] = v === null || v === undefined ? "" : String(v);
    }
    next.pr_norm = existing?.pr_norm == null ? "" : String(existing.pr_norm);
    next.phase = existing?.phase ?? "";
    next.cond = existing?.cond ?? "";
    next.risk = existing?.risk ?? "";
    next.obs = existing?.obs ?? "";
    next.note = existing?.note ?? "";
    setVals(next);
    setMsg(
      existing
        ? { text: "Энэ станц мэдээгээ өгсөн байна — хадгалбал шинэчилнэ.", ok: true }
        : { text: "" }
    );
  }, [st, existing]);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);

  const set = (k: string, v: string) => setVals((p) => ({ ...p, [k]: v }));

  async function save() {
    const rec: Record<string, unknown> = {
      period: periodKey(period),
      year: period.year,
      month: period.month,
      decade: period.decade,
      st
    };
    for (const f of FIELDS) rec[f.key] = parseNum(vals[f.key]);
    rec.pr_norm = parseNum(vals.pr_norm);
    rec.phase = vals.phase ?? "";
    rec.cond = vals.cond ?? "";
    rec.risk = vals.risk ?? "";
    rec.obs = (vals.obs ?? "").trim();
    rec.note = (vals.note ?? "").trim();
    rec.at = new Date().toISOString();

    if (rec.t_avg === null && rec.pr === null) {
      setMsg({ text: "Ядаж агаарын дундаж температур эсвэл хур тунадасны хэмжээг бөглөнө үү." });
      return;
    }

    setSaving(true);
    try {
      await onSave(rec as Report);
      onClose();
    } catch (e) {
      setSaving(false);
      const code = (e as { code?: string })?.code;
      setMsg({
        text:
          code === "code_required"
            ? "Нэвтрэх хугацаа дууссан байна. Хуудсыг дахин ачаална уу."
            : "Хадгалж чадсангүй. Түр хүлээгээд дахин оролдоно уу."
      });
    }
  }

  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="sfTitle">
        <div className="sheet-head">
          <div>
            <h2 id="sfTitle">Станцын 10 хоногийн мэдээ</h2>
            <p>{periodLabel(period)} · нэг станцад нэг мэдээ, дахин оруулбал шинэчилнэ</p>
          </div>
          <button className="close-x" aria-label="Хаах" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="sheet-body">
          <div className="grp">
            <h4>Салбар</h4>
            <div className="rowgrid">
              <div className="f">
                <label htmlFor="sf-st">Станц</label>
                <select id="sf-st" value={st} onChange={(e) => setSt(e.target.value)}>
                  {STATIONS.map((s) => (
                    <option key={s.idx} value={s.idx}>
                      {s.idx} · {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="f">
                <label htmlFor="sf-obs">Тоовор хийсэн</label>
                <input
                  id="sf-obs"
                  type="text"
                  placeholder="Овог нэр"
                  value={vals.obs ?? ""}
                  onChange={(e) => set("obs", e.target.value)}
                />
              </div>
            </div>
          </div>

          {GROUPS.map((g) => (
            <div className="grp" key={g.name}>
              <h4>{g.name}</h4>
              <div className="rowgrid">
                {g.fields.map((f) => (
                  <div className="f" key={f.key}>
                    <label htmlFor={`sf-${f.key}`}>
                      {f.full}
                      {f.unit && `, ${f.unit}`}
                    </label>
                    <input
                      id={`sf-${f.key}`}
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      value={vals[f.key] ?? ""}
                      onChange={(e) => set(f.key, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="grp">
            <h4>Нэмэлт үнэлгээ · маягт дээр байхгүй</h4>
            <div className="rowgrid">
              <div className="f">
                <label htmlFor="sf-norm">Олон жилийн дундаж тунадас, мм</label>
                <input
                  id="sf-norm"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={vals.pr_norm ?? ""}
                  onChange={(e) => set("pr_norm", e.target.value)}
                />
                <span className="hint">Хэвийн байдлаас хазайлт бодоход хэрэглэнэ</span>
              </div>
              <div className="f">
                <label htmlFor="sf-phase">Хөгжлийн үе шат</label>
                <select id="sf-phase" value={vals.phase ?? ""} onChange={(e) => set("phase", e.target.value)}>
                  <option value="">— сонгоогүй —</option>
                  {PHASES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div className="f">
                <label htmlFor="sf-cond">Бэлчээрийн нөхцөл</label>
                <select id="sf-cond" value={vals.cond ?? ""} onChange={(e) => set("cond", e.target.value)}>
                  <option value="">— сонгоогүй —</option>
                  {CONDITIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="f">
                <label htmlFor="sf-risk">Ган / зудын эрсдэл</label>
                <select id="sf-risk" value={vals.risk ?? ""} onChange={(e) => set("risk", e.target.value)}>
                  <option value="">— сонгоогүй —</option>
                  {RISKS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="grp">
            <h4>Тэмдэглэл</h4>
            <div className="rowgrid full">
              <div className="f">
                <textarea
                  placeholder="Онцлох үзэгдэл, залруулга, дутуу хоног…"
                  value={vals.note ?? ""}
                  onChange={(e) => set("note", e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="sheet-foot">
          <span className={`form-msg${msg.ok ? " ok" : ""}`}>{msg.text}</span>
          <span style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose}>Болих</button>
            <button className="primary" onClick={save} disabled={saving}>
              {saving ? "Хадгалж байна…" : "Хадгалах"}
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}
