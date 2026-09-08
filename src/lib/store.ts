import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { Report } from "./types";
import { NUMERIC_KEYS } from "./types";
import { FIELD_KEYS } from "./fields";
import { isValidPeriodKey } from "./period";
import { isKnownStation } from "./stations";

/**
 * Хадгалалт хоёр горимтой:
 *   DATABASE_URL тохируулсан бол → PostgreSQL (Railway дээр байх ёстой горим)
 *   тохируулаагүй бол            → data/reports.json файл (зөвхөн локал турших)
 *
 * Railway-гийн диск нь дахин байршуулах бүрд цэвэрлэгддэг тул файлын горимд
 * ажиллаж байгаа бол хуудсан дээр анхааруулга гарна.
 */

export type StoreKind = "postgres" | "file";

export type StoreInfo = {
  kind: StoreKind;
  /** Дахин байршуулахад өгөгдөл арилах уу */
  ephemeral: boolean;
};

interface Store {
  info: StoreInfo;
  byPeriod(period: string): Promise<Report[]>;
  byMonth(month: number): Promise<Report[]>;
  put(rec: Report): Promise<void>;
}

function docId(rec: Report): string {
  return `${rec.period}-${rec.st}`;
}

/* ==================== шалгалт ==================== */

const ALL_KEYS: (keyof Report)[] = [
  "period", "year", "month", "decade", "st",
  ...FIELD_KEYS,
  "pr_norm", "phase", "cond", "risk", "obs", "note", "at"
] as (keyof Report)[];

const NUMERIC = new Set<string>(NUMERIC_KEYS as string[]);

/**
 * Гаднаас ирсэн биетийг мэдэгдэж буй талбаруудаар шүүж, төрлийг баталгаажуулна.
 * Танихгүй талбар шууд хаягдана — сангийн бүтэц гаднаас өөрчлөгдөхгүй.
 */
export function sanitize(body: unknown): Report | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const src = body as Record<string, unknown>;
  const out: Record<string, unknown> = {};

  for (const k of ALL_KEYS) {
    const v = src[k as string];
    if (v === undefined || v === null || v === "") {
      out[k as string] = NUMERIC.has(k as string) ? null : "";
      continue;
    }
    if (NUMERIC.has(k as string)) {
      const n = Number(String(v).trim().replace(/\s+/g, "").replace(",", "."));
      out[k as string] = Number.isFinite(n) ? n : null;
    } else {
      out[k as string] = String(v).slice(0, 2000);
    }
  }

  const period = String(out.period ?? "");
  const st = String(out.st ?? "");
  if (!isValidPeriodKey(period)) return null;
  if (!/^\d{3,6}$/.test(st) || !isKnownStation(st)) return null;
  // Ядаж нэг утга байхгүй мөрийг хадгалахгүй.
  if (out.t_avg === null && out.pr === null) return null;

  out.at = new Date().toISOString();
  return out as Report;
}

/* ==================== файлын горим ==================== */

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "reports.json");

class FileStore implements Store {
  info: StoreInfo = { kind: "file", ephemeral: true };
  private rows: Record<string, Report> = {};

  constructor() {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      this.rows = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    } catch {
      this.rows = {};
    }
  }
  async byPeriod(period: string) {
    return Object.values(this.rows).filter((r) => r.period === period);
  }
  async byMonth(month: number) {
    return Object.values(this.rows).filter((r) => r.month === month);
  }
  async put(rec: Report) {
    this.rows[docId(rec)] = rec;
    fs.writeFileSync(DATA_FILE, JSON.stringify(this.rows, null, 2), "utf8");
  }
}

/* ==================== PostgreSQL ==================== */

class PgStore implements Store {
  info: StoreInfo = { kind: "postgres", ephemeral: false };
  private pool: import("pg").Pool;
  private ready: Promise<void>;

  constructor(url: string) {
    const { Pool } = require("pg") as typeof import("pg");
    this.pool = new Pool({
      connectionString: url,
      ssl: /localhost|127\.0\.0\.1/.test(url) ? false : { rejectUnauthorized: false },
      max: 5
    });
    this.ready = this.init();
  }

  private async init() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id         text PRIMARY KEY,
        period     text NOT NULL,
        year       integer,
        month      integer,
        decade     integer,
        st         text NOT NULL,
        data       jsonb NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await this.pool.query(`CREATE INDEX IF NOT EXISTS reports_period_idx ON reports (period)`);
    await this.pool.query(`CREATE INDEX IF NOT EXISTS reports_month_idx ON reports (month)`);
  }

  async byPeriod(period: string) {
    await this.ready;
    const r = await this.pool.query(`SELECT data FROM reports WHERE period = $1`, [period]);
    return r.rows.map((x) => x.data as Report);
  }
  async byMonth(month: number) {
    await this.ready;
    const r = await this.pool.query(`SELECT data FROM reports WHERE month = $1 LIMIT 2000`, [month]);
    return r.rows.map((x) => x.data as Report);
  }
  async put(rec: Report) {
    await this.ready;
    await this.pool.query(
      `INSERT INTO reports (id, period, year, month, decade, st, data, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7, now())
       ON CONFLICT (id) DO UPDATE
         SET data = EXCLUDED.data, updated_at = now(),
             period = EXCLUDED.period, year = EXCLUDED.year,
             month = EXCLUDED.month, decade = EXCLUDED.decade`,
      [docId(rec), rec.period, rec.year, rec.month, rec.decade, rec.st, JSON.stringify(rec)]
    );
  }
}

/* ==================== нэг л удаа үүсгэнэ ==================== */

declare global {
  // eslint-disable-next-line no-var
  var __goviStore: Store | undefined;
}

export function getStore(): Store {
  if (!global.__goviStore) {
    const url = (process.env.DATABASE_URL || "").trim();
    global.__goviStore = url ? new PgStore(url) : new FileStore();
    console.log(
      `[govi] хадгалалт: ${global.__goviStore.info.kind}` +
        (global.__goviStore.info.ephemeral ? " (дахин байршуулахад арилна)" : "")
    );
  }
  return global.__goviStore;
}

export function accessCode(): string {
  return (process.env.ACCESS_CODE || "").trim();
}
