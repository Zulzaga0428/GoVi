/*
 * GoVi — Өмнөговь ХААЦУ нэгтгэл
 *
 * Нэг файлт сервер: хуудсыг үйлчилж, 14 сумын арав хоногийн мэдээг хадгална.
 *
 * Хадгалалт хоёр горимтой:
 *   DATABASE_URL тохируулсан бол  → PostgreSQL (Railway дээр санал болгож буй горим)
 *   тохируулаагүй бол             → data/reports.json файл
 *
 * Railway дээр диск нь дахин байршуулах бүрд цэвэрлэгддэг тул файлын горимыг зөвхөн
 * локал туршилтад хэрэглэнэ. Прод дээр Postgres нэмнэ үү (Railway → New → Database →
 * PostgreSQL; DATABASE_URL автоматаар холбогдоно).
 *
 * ACCESS_CODE тохируулбал бичих, унших бүх хүсэлт тэр кодыг шаардана.
 */

const express = require("express");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const ACCESS_CODE = (process.env.ACCESS_CODE || "").trim();
const DATABASE_URL = (process.env.DATABASE_URL || "").trim();

const PAGE_FILE = path.join(__dirname, "umnugovi-haacu.html");
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "reports.json");

/* ==================== хадгалалт ==================== */

/* Мэдээний нэг баримт: reports/{period}-{soum} гэсэн ID-тай.
   period нь "2026-09-1" хэлбэртэй (он-сар-арав хоног). */
function docId(rec) {
  return `${rec.period}-${rec.soum}`;
}

const FIELDS = [
  "period", "year", "month", "decade", "soum",
  "t_avg", "t_max", "t_min", "precip", "precip_norm", "wind_max",
  "soil_moist", "soil_temp", "snow", "plant_h", "yield_p",
  "phase", "cond", "risk", "obs", "note", "at"
];

const NUMERIC = new Set([
  "year", "month", "decade",
  "t_avg", "t_max", "t_min", "precip", "precip_norm", "wind_max",
  "soil_moist", "soil_temp", "snow", "plant_h", "yield_p"
]);

/* Гаднаас ирсэн биетийг мэдэгдэж буй талбаруудаар шүүж, төрлийг нь баталгаажуулна. */
function sanitize(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;

  const out = {};
  for (const f of FIELDS) {
    const v = body[f];
    if (v === undefined || v === null || v === "") {
      out[f] = NUMERIC.has(f) ? null : "";
      continue;
    }
    if (NUMERIC.has(f)) {
      // Монголд бутархайг таслалаар бичдэг тул "4,8" хэлбэрийг ч хүлээж авна.
      const n = Number(String(v).trim().replace(/\s+/g, "").replace(",", "."));
      out[f] = Number.isFinite(n) ? n : null;
    } else {
      out[f] = String(v).slice(0, 2000);
    }
  }

  if (!/^\d{4}-\d{2}-[123]$/.test(out.period || "")) return null;
  if (!/^[a-z_]{2,40}$/.test(out.soum || "")) return null;
  if (out.t_avg === null && out.precip === null) return null;

  out.at = new Date().toISOString();
  return out;
}

class FileStore {
  constructor() {
    this.kind = "file";
    this.ephemeral = true;
    fs.mkdirSync(DATA_DIR, { recursive: true });
    try {
      this.rows = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    } catch {
      this.rows = {};
    }
  }
  async init() {}
  flush() {
    fs.writeFileSync(DATA_FILE, JSON.stringify(this.rows, null, 2), "utf8");
  }
  async byPeriod(period) {
    return Object.values(this.rows).filter((r) => r.period === period);
  }
  async byMonth(month) {
    return Object.values(this.rows).filter((r) => r.month === month);
  }
  async put(rec) {
    this.rows[docId(rec)] = rec;
    this.flush();
  }
}

class PgStore {
  constructor(url) {
    const { Pool } = require("pg");
    this.kind = "postgres";
    this.ephemeral = false;
    this.pool = new Pool({
      connectionString: url,
      ssl: /localhost|127\.0\.0\.1/.test(url) ? false : { rejectUnauthorized: false },
      max: 5
    });
  }
  async init() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id         text PRIMARY KEY,
        period     text NOT NULL,
        year       integer,
        month      integer,
        decade     integer,
        soum       text NOT NULL,
        data       jsonb NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await this.pool.query(`CREATE INDEX IF NOT EXISTS reports_period_idx ON reports (period)`);
    await this.pool.query(`CREATE INDEX IF NOT EXISTS reports_month_idx  ON reports (month)`);
  }
  async byPeriod(period) {
    const r = await this.pool.query(`SELECT data FROM reports WHERE period = $1`, [period]);
    return r.rows.map((x) => x.data);
  }
  async byMonth(month) {
    const r = await this.pool.query(`SELECT data FROM reports WHERE month = $1 LIMIT 2000`, [month]);
    return r.rows.map((x) => x.data);
  }
  async put(rec) {
    await this.pool.query(
      `INSERT INTO reports (id, period, year, month, decade, soum, data, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7, now())
       ON CONFLICT (id) DO UPDATE
         SET data = EXCLUDED.data, updated_at = now(),
             period = EXCLUDED.period, year = EXCLUDED.year,
             month = EXCLUDED.month, decade = EXCLUDED.decade`,
      [docId(rec), rec.period, rec.year, rec.month, rec.decade, rec.soum, rec]
    );
  }
}

/* ==================== хуудас ==================== */

/* umnugovi-haacu.html нь Artifact-д зориулсан хэлтэрхий тул бүтэн баримт болгож ороож өгнө.
   Ингэснээр эх файл нэг хэвээр үлдэж, Artifact болон энэ сервер хоёулаа нэг кодыг ашиглана. */
function wrapPage(fragment) {
  return `<!doctype html>
<html lang="mn">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  :root { color-scheme: light dark; }
  body { margin: 0; font: 14px system-ui, -apple-system, "Segoe UI", sans-serif; background: #F5F3EE; }
  img { max-width: 100%; }
  [hidden] { display: none !important; }
</style>
</head>
<body>
${fragment}
</body>
</html>`;
}

/* ==================== сервер ==================== */

async function main() {
  const store = DATABASE_URL ? new PgStore(DATABASE_URL) : new FileStore();
  await store.init();
  console.log(`[govi] хадгалалт: ${store.kind}${store.ephemeral ? " (дахин байршуулахад арилна)" : ""}`);
  if (!ACCESS_CODE) console.log("[govi] ACCESS_CODE тохируулаагүй — хуудас нээлттэй байна");

  let page;
  try {
    page = wrapPage(fs.readFileSync(PAGE_FILE, "utf8"));
  } catch (e) {
    console.error(`[govi] ${PAGE_FILE} уншигдсангүй:`, e.message);
    process.exit(1);
  }

  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "512kb" }));

  function gate(req, res, next) {
    if (!ACCESS_CODE) return next();
    const given = String(req.get("x-access-code") || "").trim();
    if (given === ACCESS_CODE) return next();
    return res.status(401).json({ error: "code_required" });
  }

  app.get("/api/config", (req, res) => {
    res.json({ gated: !!ACCESS_CODE, storage: store.kind, ephemeral: store.ephemeral });
  });

  app.get("/api/reports", gate, async (req, res) => {
    try {
      if (req.query.period) {
        if (!/^\d{4}-\d{2}-[123]$/.test(req.query.period)) {
          return res.status(400).json({ error: "bad_period" });
        }
        return res.json(await store.byPeriod(req.query.period));
      }
      if (req.query.month) {
        const m = Number(req.query.month);
        if (!Number.isInteger(m) || m < 1 || m > 12) {
          return res.status(400).json({ error: "bad_month" });
        }
        return res.json(await store.byMonth(m));
      }
      res.status(400).json({ error: "period_or_month_required" });
    } catch (e) {
      console.error("[govi] унших алдаа:", e.message);
      res.status(500).json({ error: "read_failed" });
    }
  });

  app.put("/api/reports", gate, async (req, res) => {
    const rec = sanitize(req.body);
    if (!rec) return res.status(400).json({ error: "bad_record" });
    try {
      await store.put(rec);
      res.json({ ok: true, id: docId(rec) });
    } catch (e) {
      console.error("[govi] бичих алдаа:", e.message);
      res.status(500).json({ error: "write_failed" });
    }
  });

  app.get("/healthz", (req, res) => res.type("text").send("ok"));

  app.get("/", (req, res) => {
    res.type("html").send(page);
  });

  app.use((req, res) => res.status(404).type("text").send("олдсонгүй"));

  app.listen(PORT, () => console.log(`[govi] ${PORT} порт дээр ажиллаж байна`));
}

main().catch((e) => {
  console.error("[govi] эхлүүлж чадсангүй:", e);
  process.exit(1);
});
