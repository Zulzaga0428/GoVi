"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MapCard } from "./MapCard";
import { DataTable } from "./DataTable";
import { BarChart } from "./BarChart";
import { StationForm } from "./StationForm";
import { QuickGrid } from "./QuickGrid";
import { STATIONS } from "@/lib/stations";
import { MONTHS, currentPeriod, periodKey, periodLabel, decadeDays, type Period } from "@/lib/period";
import { fmt, mean } from "@/lib/format";
import { buildSummary, summaryToText } from "@/lib/summary";
import { toCsv, downloadCsv } from "@/lib/csv";
import type { Report } from "@/lib/types";

type StoreCfg = { storage: string; ephemeral: boolean };

const POLL_MS = 20000;

export function Dashboard({ initialRows, cfg }: { initialRows: Report[]; cfg: StoreCfg }) {
  const [period, setPeriod] = useState<Period>(currentPeriod());
  const [rows, setRows] = useState<Report[]>(initialRows);
  const [showForm, setShowForm] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [normHints, setNormHints] = useState<Record<string, { year: number; v: number }>>({});
  const [sync, setSync] = useState("");
  const [copied, setCopied] = useState("");

  /* Landing-ыг дахин харуулахгүй — ажлын самбарыг нээсэн хүн ажилдаа орно. */
  useEffect(() => {
    document.cookie = "govi_seen=1; path=/; max-age=" + 60 * 60 * 24 * 365 + "; samesite=lax";
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/reports?period=${periodKey(period)}`, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const list = (await res.json()) as Report[];
      setRows(list);
      setSync(`Шинэчлэв ${new Date().toLocaleTimeString("mn-MN")}`);
    } catch {
      setSync("Сервертэй холбогдож чадсангүй");
    }
  }, [period]);

  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  /* ОЖД санал — өмнөх оны ижил сар, ижил 10 хоногоос. */
  useEffect(() => {
    if (!showGrid) return;
    (async () => {
      try {
        const res = await fetch(`/api/reports?month=${period.month}`, { cache: "no-store" });
        if (!res.ok) return;
        const list = (await res.json()) as Report[];
        const best: Record<string, { year: number; v: number }> = {};
        for (const r of list) {
          if (r.decade !== period.decade || r.year >= period.year) continue;
          if (r.pr_norm === null || r.pr_norm <= 0) continue;
          if (!best[r.st] || r.year > best[r.st].year) best[r.st] = { year: r.year, v: r.pr_norm };
        }
        setNormHints(best);
      } catch {
        /* санал байхгүй бол зүгээр */
      }
    })();
  }, [showGrid, period]);

  const saveOne = useCallback(
    async (rec: Report) => {
      const res = await fetch("/api/reports", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rec)
      });
      if (!res.ok) {
        const err = new Error("save failed") as Error & { code?: string };
        if (res.status === 401) err.code = "code_required";
        throw err;
      }
      await load();
    },
    [load]
  );

  const saveMany = useCallback(
    async (recs: Report[]) => {
      let ok = 0;
      const failed: string[] = [];
      for (const rec of recs) {
        try {
          const res = await fetch("/api/reports", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(rec)
          });
          if (!res.ok) throw new Error();
          ok++;
        } catch {
          failed.push(STATIONS.find((s) => s.idx === rec.st)?.name ?? rec.st);
        }
      }
      await load();
      return { ok, failed };
    },
    [load]
  );

  const summary = useMemo(() => buildSummary(rows, period), [rows, period]);

  const prAvg = mean(rows.map((r) => r.pr));
  const withNorm = rows.filter((r) => r.pr !== null && r.pr_norm !== null && r.pr_norm > 0);
  const normPct = withNorm.length
    ? Math.round(
        (withNorm.reduce((a, r) => a + (r.pr as number) / (r.pr_norm as number), 0) / withNorm.length) * 100
      )
    : null;

  function copySummary() {
    navigator.clipboard
      ?.writeText(summaryToText(rows, period))
      .then(() => setCopied("Хуулагдлаа"))
      .catch(() => setCopied("Хуулж чадсангүй"));
    setTimeout(() => setCopied(""), 1800);
  }

  return (
    <div className="wrap">
      <header className="masthead">
        <div>
          <p className="eyebrow">
            <Link href="/?stay=1">GoVi</Link> · Ус цаг уур, орчны шинжилгээний газар · ХАА-н цаг уур
          </p>
          <h1>
            Өмнөговь аймаг <span className="thin">— 10 хоногийн нэгтгэл</span>
          </h1>
        </div>
        <div className="period-pick">
          <div className="field">
            <label htmlFor="py">Он</label>
            <select
              id="py"
              value={period.year}
              onChange={(e) => setPeriod({ ...period, year: Number(e.target.value) })}
            >
              {Array.from({ length: 6 }, (_, i) => currentPeriod().year + 1 - i).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="pm">Сар</label>
            <select
              id="pm"
              value={period.month}
              onChange={(e) => setPeriod({ ...period, month: Number(e.target.value) })}
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="pd">10 хоног</label>
            <select
              id="pd"
              value={period.decade}
              onChange={(e) => setPeriod({ ...period, decade: Number(e.target.value) })}
            >
              {[1, 2, 3].map((d) => (
                <option key={d} value={d}>
                  0{d} ({decadeDays(d)})
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <section className="hero" style={{ marginTop: 22 }}>
        <MapCard rows={rows} paused={showForm || showGrid} />

        <div className="hero-text">
          <p className="eyebrow">Энэ 10 хоногийн дүр зураг</p>
          <p className="lede">
            {rows.length === 0 ? (
              "Энэ 10 хоногийн мэдээ хараахан ирээгүй байна."
            ) : (
              <>
                <b>{rows.length} станцын мэдээгээр</b> аймгийн дундаж тунадас <b>{fmt(prAvg)} мм</b>
                {normPct !== null ? (
                  <>
                    {" "}
                    — олон жилийн дунджийн <b>{normPct}%</b>
                    {normPct < 80 ? ", хэвийнээс бага." : normPct > 120 ? ", хэвийнээс их." : "."}
                  </>
                ) : (
                  <>
                    , агаарын дундаж температур <b>{fmt(mean(rows.map((r) => r.t_avg)))}°C</b>.
                  </>
                )}
              </>
            )}
          </p>

          {rows.length > 0 && (
            <dl className="hero-stats">
              <div>
                <dt>Агаарын дундаж</dt>
                <dd>
                  {fmt(mean(rows.map((r) => r.t_avg)))}
                  <small>°C</small>
                </dd>
              </div>
              <div>
                <dt>Харьцангуй чийг</dt>
                <dd>
                  {fmt(mean(rows.map((r) => r.rh)), 0)}
                  <small>%</small>
                </dd>
              </div>
              <div>
                <dt>Ургамлын ургац</dt>
                <dd>
                  {fmt(mean(rows.map((r) => r.pl_y)), 2)}
                  <small>ц/га</small>
                </dd>
              </div>
              <div>
                <dt>30°-аас их хоног</dt>
                <dd>
                  {fmt(mean(rows.map((r) => r.t_d30)), 1)}
                  <small>хоног</small>
                </dd>
              </div>
            </dl>
          )}

          <div className="progress-block">
            <div className="progress-num">
              {rows.length}
              <small>/{STATIONS.length}</small>
            </div>
            <div className="progress-meta">
              <div className="progress-label">
                {rows.length === STATIONS.length
                  ? "Бүх станцын мэдээ бүрдлээ — тоймоо баталгаажуулна уу"
                  : `${STATIONS.length - rows.length} станцын мэдээ хүлээгдэж байна`}
              </div>
              <div className="track">
                <i style={{ width: `${(rows.length / STATIONS.length) * 100}%` }} />
              </div>
            </div>
          </div>

          <div className="actions">
            <button className="primary" onClick={() => setShowGrid(true)}>
              14 станцыг дараалуулж бөглөх
            </button>
            <button onClick={() => setShowForm(true)}>Нэг станцын мэдээ</button>
            <button onClick={() => downloadCsv(toCsv(rows, period), `govi-${periodKey(period)}.csv`)}>
              CSV татах
            </button>
            <button onClick={copySummary}>{copied || "Тоймыг хуулах"}</button>
          </div>
        </div>
      </section>

      {cfg.ephemeral && (
        <div className="notice offline">
          <b>Түр зуурын хадгалалт.</b>
          <span>
            Өгөгдлийн сан холбогдоогүй тул мэдээ файлд хадгалагдаж байна — серверийг дахин
            байршуулахад арилна. Railway дээр PostgreSQL нэмнэ үү.
          </span>
        </div>
      )}

      <div className="notice todo">
        <b>Тодруулах:</b>
        <span>
          Станц <b>339 Сайхан</b> ба <b>739</b> хоёрын байрлал тодорхойгүй тул зурагт ороогүй.
          Мөн Булган, Ханхонгор, Хүрмэн сум станцгүй эсэхийг батлах шаардлагатай.
        </span>
      </div>

      <section>
        <div className="sec-head">
          <h2>Станц тус бүрийн үзүүлэлт</h2>
          <span className="sec-note">{periodLabel(period)}</span>
        </div>
        <DataTable rows={rows} />
      </section>

      <section>
        <div className="sec-head">
          <h2>Харьцуулалт</h2>
          <span className="sec-note">Мэдээгээ өгсөн станцууд эрэмбэлэгдэн орлоо</span>
        </div>
        <div className="charts">
          <div className="card">
            <h3>Хур тунадас, мм</h3>
            <p className="sub">Олон жилийн дундаж оруулсан бол зураасаар тэмдэглэв</p>
            <BarChart rows={rows} field="pr" normField="pr_norm" unit="мм" digits={1} />
            <div className="legend-note">
              <span>
                <i className="swatch" /> Тайлант 10 хоногийн тунадас
              </span>
              <span>
                <i className="swatch tick" /> Олон жилийн дундаж
              </span>
            </div>
          </div>
          <div className="card">
            <h3>Ургамлын ургац, ц/га</h3>
            <p className="sub">Бэлчээрийн ургамлын ургацын хэмжээ</p>
            <BarChart rows={rows} field="pl_y" unit="ц/га" digits={2} />
            <div className="legend-note">
              <span>
                <i className="swatch" /> Ургамлын ургац
              </span>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="sec-head">
          <h2>Аймгийн тойм</h2>
          <span className="sec-note">Ирсэн мэдээнээс автоматаар боловсруулав</span>
        </div>
        <div className="summary-card">
          <div className="summary-body">
            <p className="hd">{periodLabel(period)}</p>
            {summary.map((b, i) => (
              <p key={i}>
                {b.title && <b>{b.title}.</b>} {b.text}
              </p>
            ))}
          </div>
          <div className="summary-foot">
            <span>
              {periodLabel(period)} · {rows.length}/{STATIONS.length} станцын мэдээгээр
            </span>
            <span className="sign-row">
              <span>Тоовор хийсэн: ......................</span>
              <span>Шалгасан инженер: ......................</span>
            </span>
          </div>
        </div>
      </section>

      <footer className="credit">
        <span>Өмнөговь аймгийн УЦУОШГ · ХАА-н цаг уурын салбар · Даланзадгад</span>
        <span>
          {cfg.storage === "postgres" ? "PostgreSQL" : "Файл"} · {sync}
        </span>
      </footer>

      {showForm && (
        <StationForm
          period={period}
          rows={rows}
          onClose={() => setShowForm(false)}
          onSave={saveOne}
        />
      )}
      {showGrid && (
        <QuickGrid
          period={period}
          rows={rows}
          normHints={normHints}
          onClose={() => setShowGrid(false)}
          onSaveMany={saveMany}
        />
      )}
    </div>
  );
}
