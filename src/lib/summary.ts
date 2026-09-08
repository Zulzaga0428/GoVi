import type { Report } from "./types";
import { STATIONS, stationName } from "./stations";
import { mean, maxOf, fmt } from "./format";
import { periodLabel, type Period } from "./period";
import { RISK_LABEL } from "./fields";

/**
 * Аймгийн тойм — ирсэн мэдээнээс бичвэр дүгнэлт.
 *
 * Цэвэр функц: ижил өгөгдөлд ижил текст. Хиймэл оюун ашиглаагүй тул
 * тоо нь үргэлж мэдээтэйгээ таарна.
 */

export type SummaryBlock = { title: string; text: string };

export function buildSummary(rows: Report[], period: Period): SummaryBlock[] {
  if (!rows.length) {
    return [
      {
        title: "",
        text:
          `${periodLabel(period)}-ийн мэдээ хараахан ирээгүй байна. ` +
          "Станцууд мэдээгээ оруулмагц тойм автоматаар боловсрогдоно."
      }
    ];
  }

  const blocks: SummaryBlock[] = [];
  const withPr = rows.filter((r) => r.pr !== null).sort((a, b) => (b.pr as number) - (a.pr as number));
  const withNorm = rows.filter((r) => r.pr !== null && r.pr_norm !== null && r.pr_norm > 0);
  const normPct = withNorm.length
    ? Math.round(
        (withNorm.reduce((a, r) => a + (r.pr as number) / (r.pr_norm as number), 0) /
          withNorm.length) * 100
      )
    : null;

  /* --- температур --- */
  const hot = rows.filter((r) => (r.t_d30 ?? 0) > 0).sort((a, b) => (b.t_d30 as number) - (a.t_d30 as number));
  let t = `Тайлант 10 хоногт аймгийн хэмжээгээр агаарын дундаж температур ${fmt(
    mean(rows.map((r) => r.t_avg))
  )}°C байлаа.`;
  const tMax = maxOf(rows.map((r) => r.t_max));
  if (tMax !== null) t += ` Хамгийн их нь ${fmt(tMax, 0)}°C хүрэв.`;
  if (hot.length) {
    t += ` Агаарын температур 30°-аас давсан хоног ${stationName(hot[0].st)} станцад ${fmt(
      hot[0].t_d30, 0
    )} хоног бүртгэгдэв.`;
  }
  blocks.push({ title: "Агаарын температур", text: t });

  /* --- тунадас --- */
  let p = `Хур тунадасны дундаж хэмжээ ${fmt(mean(rows.map((r) => r.pr)))} мм`;
  if (withPr.length) {
    const wet = withPr[0];
    const dry = withPr[withPr.length - 1];
    p += `, хамгийн их нь ${stationName(wet.st)} станцад ${fmt(wet.pr)} мм, хамгийн бага нь ${stationName(
      dry.st
    )} станцад ${fmt(dry.pr)} мм`;
  }
  p += `. Тунадастай өдрийн дундаж тоо ${fmt(mean(rows.map((r) => r.pr_d)), 1)}.`;
  if (normPct !== null) p += ` Олон жилийн дунджийн ${normPct}%-тай тэнцэж байна.`;
  blocks.push({ title: "Хур тунадас", text: p });

  /* --- хуурайшилт --- */
  const below = withNorm
    .filter((r) => (r.pr as number) / (r.pr_norm as number) < 0.8)
    .map((r) => stationName(r.st));
  if (below.length) {
    blocks.push({
      title: "Хэвийн бус хуурайшилт",
      text:
        `${below.join(", ")} станцын орчимд хур тунадас олон жилийн дунджийн 80%-иас доогуур ` +
        "байгаа нь бэлчээрийн ургамлын ус хангамжид сөргөөр нөлөөлөх эрсдэлтэй."
    });
  }

  /* --- хөрс, чийг, салхи --- */
  const windy = rows.filter((r) => (r.w_d10 ?? 0) > 0).sort((a, b) => (b.w_d10 as number) - (a.w_d10 as number));
  let s = `Хөрсний дундаж температур ${fmt(mean(rows.map((r) => r.s_avg)))}°C, агаарын харьцангуй чийг ${fmt(
    mean(rows.map((r) => r.rh)), 0
  )}%. Салхины хамгийн их хурдны дундаж ${fmt(mean(rows.map((r) => r.w_max)), 0)} м/с`;
  if (windy.length) {
    s += `; 10 м/с-ээс их салхитай өдөр ${stationName(windy[0].st)} станцад ${fmt(
      windy[0].w_d10, 0
    )} өдөр тэмдэглэгдэв`;
  }
  blocks.push({ title: "Хөрс, чийг, салхи", text: s + "." });

  /* --- ургамал --- */
  const snowy = rows
    .filter((r) => (r.sn_d ?? 0) > 0)
    .map((r) => `${stationName(r.st)} (${fmt(r.sn_d, 0)} см)`);
  let v = `Бэлчээрийн ургамлын өндөр дунджаар ${fmt(mean(rows.map((r) => r.pl_h)))} см, бүрхэц ${fmt(
    mean(rows.map((r) => r.pl_c)), 0
  )}%, ургац ${fmt(mean(rows.map((r) => r.pl_y)), 2)} ц/га байна.`;

  const phases = new Map<string, number>();
  for (const r of rows) if (r.phase) phases.set(r.phase, (phases.get(r.phase) ?? 0) + 1);
  const topPhase = Array.from(phases.entries()).sort((a, b) => b[1] - a[1])[0];
  if (topPhase) v += ` Хөгжлийн зонхилох үе шат — ${topPhase[0].toLowerCase()}.`;
  if (snowy.length) v += ` Цасан бүрхүүлтэй: ${snowy.join(", ")}.`;
  blocks.push({ title: "Ургамал", text: v });

  /* --- бэлчээр, эрсдэл (нэмэлт үнэлгээ бөглөсөн үед) --- */
  const bad = rows.filter((r) => r.cond === "serious" || r.cond === "critical").map((r) => stationName(r.st));
  const risky = rows
    .filter((r) => r.risk === "critical" || r.risk === "warning")
    .map((r) => `${stationName(r.st)} (${RISK_LABEL[r.risk]})`);
  if (bad.length || risky.length) {
    blocks.push({
      title: "Бэлчээр, ган зудын үнэлгээ",
      text:
        (bad.length ? `Бэлчээрийн нөхцөл муу: ${bad.join(", ")}. ` : "") +
        (risky.length ? `Эрсдэлтэй: ${risky.join(", ")}. ` : "") +
        "Эдгээр нутгийн малчдад отор нүүдэл, өвс тэжээлийн нөөцийн талаар зөвлөмж хүргүүлэх шаардлагатай."
    });
  }

  /* --- дутуу мэдээ --- */
  const missing = STATIONS.filter((s) => !rows.some((r) => r.st === s.idx)).map((s) => s.name);
  if (missing.length) {
    blocks.push({
      title: "Мэдээ дутуу",
      text: `${missing.join(", ")} станцын мэдээ ирээгүй тул дээрх дүгнэлтийг ${rows.length} станцын мэдээгээр хийв.`
    });
  }

  return blocks;
}

/** Word руу буулгахад бэлэн энгийн текст. */
export function summaryToText(rows: Report[], period: Period): string {
  const head = periodLabel(period);
  const body = buildSummary(rows, period)
    .map((b) => (b.title ? `${b.title}. ${b.text}` : b.text))
    .join("\n\n");
  return `${head}\n\n${body}\n\nТоовор хийсэн: ......................    Шалгасан инженер: ......................`;
}
