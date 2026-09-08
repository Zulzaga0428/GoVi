import Link from "next/link";
import { redirect } from "next/navigation";
import { getStore } from "@/lib/store";
import { hasSeenLanding } from "@/lib/auth";
import { currentPeriod, periodKey, periodLabel } from "@/lib/period";
import { STATIONS } from "@/lib/stations";
import { mean, fmt, percentOf } from "@/lib/format";
import { GROUPS } from "@/lib/fields";
import { StationMap } from "@/components/StationMap";
import type { Report } from "@/lib/types";
import "./landing.css";

export const dynamic = "force-dynamic";

const AIMAGS = [
  "Архангай", "Баян-Өлгий", "Баянхонгор", "Булган", "Говь-Алтай", "Говьсүмбэр",
  "Дархан-Уул", "Дорноговь", "Дорнод", "Дундговь", "Завхан", "Орхон",
  "Өвөрхангай", "Өмнөговь", "Сүхбаатар", "Сэлэнгэ", "Төв", "Увс",
  "Ховд", "Хөвсгөл", "Хэнтий"
];

async function loadLive(): Promise<{ rows: Report[]; label: string }> {
  const p = currentPeriod();
  const label = periodLabel(p);
  if ((process.env.LANDING_LIVE || "").trim() === "off") return { rows: [], label };
  try {
    return { rows: await getStore().byPeriod(periodKey(p)), label };
  } catch {
    return { rows: [], label };
  }
}

export default async function Landing({
  searchParams
}: {
  searchParams: { stay?: string };
}) {
  // Ажлын самбарыг өмнө нь нээсэн хүнийг дахин сурталчилгаагаар саатуулахгүй.
  if (hasSeenLanding() && searchParams.stay !== "1") redirect("/app");

  const { rows, label } = await loadLive();
  const reported = rows.length;
  const prAvg = mean(rows.map((r) => r.pr));
  const tAvg = mean(rows.map((r) => r.t_avg));
  const plY = mean(rows.map((r) => r.pl_y));

  const withNorm = rows.filter((r) => r.pr !== null && r.pr_norm !== null && r.pr_norm > 0);
  const normPct = withNorm.length
    ? Math.round(
        (withNorm.reduce((a, r) => a + (r.pr as number) / (r.pr_norm as number), 0) /
          withNorm.length) *
          100
      )
    : null;

  return (
    <>
      <nav className="lp-nav">
        <div className="lp-brand">
          <span className="name">GoVi</span>
          <span className="org">Өмнөговь аймгийн УЦУОШГ · ХАА-н цаг уур</span>
        </div>
        <Link className="lp-cta" href="/app">
          Ажлын самбар нээх →
        </Link>
      </nav>

      <header className="lp-hero">
        <div>
          <h1>
            Гар бичмэл мэдээг нэг удаа шивнэ.
            <em>Хүснэгт, график, тойм, тайланг систем нь өөрөө хийнэ.</em>
          </h1>
          <p className="lp-sub">
            14 станцаас 10 хоног тутам ирдэг цаасан мэдээг нэг хүснэгтэд бөглөхөд аймгийн
            дундаж, хэвийн байдлаас хазайлт, харьцуулалт, бичвэр тойм автоматаар
            боловсрогдоно. Хэн мэдээгээ өгөөгүйг нэг харцаар харна.
          </p>
          <div className="lp-hero-actions">
            <Link className="lp-cta" href="/app">
              Ажлын самбар нээх →
            </Link>
            <a className="lp-cta ghost" href="#hkhne">
              Юу хийдгийг үзэх
            </a>
          </div>
          <p className="lp-note">
            Өмнөговь аймгийн 14 станцад тохируулсан. Бусад аймагт станцын жагсаалт солиход
            ажиллана.
          </p>
        </div>

        <aside className="lp-live">
          <div className="lp-live-head">
            <span className="ttl">{label}</span>
            <span className="lp-pulse">
              <i />
              Амьд
            </span>
          </div>

          {reported > 0 ? (
            <>
              <div className="lp-mini-map">
                <StationMap
                  rows={rows}
                  field="pr"
                  unit="мм"
                  digits={1}
                  label="Хур тунадас"
                  compact
                />
              </div>
              <div className="lp-live-body">
                <dl className="lp-live-grid">
                  <div>
                    <dt>Мэдээ өгсөн станц</dt>
                    <dd>
                      {reported}
                      <small>/{STATIONS.length}</small>
                    </dd>
                  </div>
                  <div>
                    <dt>Дундаж тунадас</dt>
                    <dd>
                      {fmt(prAvg)}
                      <small>мм</small>
                    </dd>
                  </div>
                  <div>
                    <dt>Агаарын дундаж</dt>
                    <dd>
                      {fmt(tAvg)}
                      <small>°C</small>
                    </dd>
                  </div>
                  <div>
                    <dt>{normPct !== null ? "Олон жилийн дунджаас" : "Ургамлын ургац"}</dt>
                    <dd>
                      {normPct !== null ? normPct : fmt(plY, 2)}
                      <small>{normPct !== null ? "%" : "ц/га"}</small>
                    </dd>
                  </div>
                </dl>
              </div>
              <div className="lp-live-foot">
                Энэ тоонууд жишээ биш — системд яг одоо байгаа мэдээ.
              </div>
            </>
          ) : (
            <>
              <div className="lp-live-body">
                <p style={{ margin: 0, fontSize: 14, color: "var(--ink-2)", lineHeight: 1.6 }}>
                  Энэ 10 хоногийн мэдээ хараахан ороогүй байна. Эхний станцын мэдээ ормогц
                  энэ хэсэгт аймгийн дундаж, хазайлт, схем зураг шууд гарч ирнэ.
                </p>
              </div>
              <div className="lp-live-foot">Мэдээ ороогүй үед юу ч зохиож харуулахгүй.</div>
            </>
          )}
        </aside>
      </header>

      <div className="lp-band" id="hkhne">
        <div className="lp-band-inner">
          <h2>Гурван алхмаар дуусна</h2>
          <p className="lead">
            Мэдээ цуглуулах ажил хэвээрээ. Харин түүнээс хойшх бүх зүйл автоматжлаа.
          </p>

          <div className="lp-steps">
            <div className="lp-step">
              <span className="num">01</span>
              <h3>Нэг удаа шивнэ</h3>
              <p>
                14 станц нэг хүснэгтэд. Багана нь гар бичмэл маягтын дараалалтай яг ижил тул
                цаасаа хараад нүдээ салгалгүй бөглөнө. Tab, Enter-ээр гүйнэ, хулгана хэрэггүй.
                ХААЦУС-аас блокоор хуулж наах бас болно.
              </p>
              <p className="was">
                Өмнө нь: <b>цаасаас Excel рүү гараар</b>, дараа нь дахин Word руу
              </p>
            </div>

            <div className="lp-step">
              <span className="num">02</span>
              <h3>Тоо өөрөө бодогдоно</h3>
              <p>
                Аймгийн дундаж, хамгийн их, хамгийн бага, олон жилийн дунджаас хэдэн хувь
                хазайсан — бүгд шивж дуусахад бэлэн. Мэдээ ирээгүй станц улаанаар тодорч,
                хэнийг сануулахаа шууд мэднэ.
              </p>
              <p className="was">
                Өмнө нь: <b>тооцоолуур дээр гараар</b>, алдвал бүгдийг дахин
              </p>
            </div>

            <div className="lp-step">
              <span className="num">03</span>
              <h3>Тойм бичигдэнэ</h3>
              <p>
                Температур, тунадас, хөрс, салхи, ургамлын байдлыг өгүүлбэр болгож бичнэ.
                Хуулаад Word руу буулгахад бэлэн. Дор нь тоовор хийсэн, шалгасан инженерийн
                гарын үсгийн мөр.
              </p>
              <p className="was">
                Өмнө нь: <b>хагас өдөр бичих</b>, 10 хоног тутам дахин
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="lp-band" style={{ background: "var(--ground)" }}>
        <div className="lp-band-inner">
          <h2>Маягтын бүх багана орсон</h2>
          <p className="lead">
            Шинэ хэмжигдэхүүн зохиогоогүй. Одоо цаасан дээр байгаа зүйл яг тэр дарааллаараа.
          </p>
          <div className="lp-fields">
            {GROUPS.map((g) => (
              <div key={g.name}>
                <h4>{g.name}</h4>
                <ul>
                  {g.fields.map((f) => (
                    <li key={f.key}>
                      {f.head}
                      {f.unit ? `, ${f.unit}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="lp-band">
        <div className="lp-band-inner">
          <div className="lp-scale">
            <div>
              <h2>Бусад аймагт мөн тавигдана</h2>
              <p className="lead" style={{ marginBottom: 18 }}>
                Систем нь Өмнөговьд тусгайлан бичигдээгүй. Станцын жагсаалт бол тохиргооны
                өгөгдөл — солиход бусад бүх зүйл хэвээрээ ажиллана. Хэмжигдэхүүн, маягт,
                тайлангийн бүтэц улсын хэмжээнд ижил.
              </p>
              <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
                Одоо Өмнөговь аймагт ажиллаж байна.
              </p>
            </div>
            <div className="lp-aimags">
              {AIMAGS.map((a) => (
                <span key={a} className={a === "Өмнөговь" ? "on" : undefined}>
                  {a}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <footer className="lp-foot">
        <span>
          GoVi · Өмнөговь аймгийн Ус цаг уур, орчны шинжилгээний газар · ХАА-н цаг уурын салбар
        </span>
        <Link href="/app">Ажлын самбар →</Link>
      </footer>
    </>
  );
}
