/**
 * Хэмжигдэхүүний багана — гар бичмэл маягтын дараалалтай ЯГ ижил.
 *
 * Энэ файл бол системийн цорын ганц эх сурвалж: хүснэгт, хурдан горим,
 * маягт, CSV, сервер талын шалгалт бүгд эндээс уншина. Багана нэмэх бол
 * зөвхөн энд нэмнэ.
 */

export type FieldKey =
  | "t_avg" | "t_max" | "t_min" | "t_d30"
  | "s_avg" | "s_max" | "s_min" | "s_d40"
  | "rh"
  | "w_max" | "w_d10"
  | "pr" | "pr_d"
  | "pl_h" | "pl_c" | "pl_y"
  | "sn_d" | "sn_b";

export type Field = {
  key: FieldKey;
  /** Хүснэгтийн богино гарчиг */
  head: string;
  /** Бүтэн нэр — маягт, CSV, tooltip дээр */
  full: string;
  unit: string;
  digits: number;
};

export type FieldGroup = {
  name: string;
  fields: Field[];
};

export const GROUPS: FieldGroup[] = [
  {
    name: "Агаар",
    fields: [
      { key: "t_avg", head: "Дундаж", full: "Агаарын дундаж температур", unit: "°C", digits: 1 },
      { key: "t_max", head: "Макс", full: "Агаарын хамгийн их температур", unit: "°C", digits: 1 },
      { key: "t_min", head: "Мин", full: "Агаарын хамгийн бага температур", unit: "°C", digits: 1 },
      { key: "t_d30", head: "30°-аас их", full: "Агаарын температур 30°-аас их хоног", unit: "хоног", digits: 0 }
    ]
  },
  {
    name: "Хөрс",
    fields: [
      { key: "s_avg", head: "Дундаж", full: "Хөрсний дундаж температур", unit: "°C", digits: 1 },
      { key: "s_max", head: "Макс", full: "Хөрсний хамгийн их температур", unit: "°C", digits: 1 },
      { key: "s_min", head: "Мин", full: "Хөрсний хамгийн бага температур", unit: "°C", digits: 1 },
      { key: "s_d40", head: "40°-аас их", full: "Хөрсний температур 40°-аас их хоног", unit: "хоног", digits: 0 }
    ]
  },
  {
    name: "Чийг",
    fields: [
      { key: "rh", head: "Харьцангуй", full: "Агаарын харьцангуй чийг", unit: "%", digits: 0 }
    ]
  },
  {
    name: "Салхи",
    fields: [
      { key: "w_max", head: "Их хурд", full: "Салхины хамгийн их хурд", unit: "м/с", digits: 0 },
      { key: "w_d10", head: "10 м/с-ээс их", full: "10 м/с-ээс их салхитай өдөр", unit: "өдөр", digits: 0 }
    ]
  },
  {
    name: "Хур тунадас",
    fields: [
      { key: "pr", head: "Хэмжээ", full: "Хур тунадасны хэмжээ", unit: "мм", digits: 1 },
      { key: "pr_d", head: "Өдрийн тоо", full: "Хур тунадастай өдрийн тоо", unit: "өдөр", digits: 0 }
    ]
  },
  {
    name: "Ургамал",
    fields: [
      { key: "pl_h", head: "Өндөр", full: "Ургамлын өндөр", unit: "см", digits: 1 },
      { key: "pl_c", head: "Бүрхэц", full: "Ургамлын бүрхэц", unit: "%", digits: 0 },
      { key: "pl_y", head: "Ургац", full: "Ургамлын ургац", unit: "ц/га", digits: 2 }
    ]
  },
  {
    name: "Цас",
    fields: [
      { key: "sn_d", head: "Зузаан", full: "Цасан бүрхүүлийн зузаан", unit: "см", digits: 0 },
      { key: "sn_b", head: "Бүрхэц", full: "Цасан бүрхүүлийн бүрхэц", unit: "балл", digits: 0 }
    ]
  }
];

/** Бүх багана нэг хавтгай жагсаалтаар, маягтын дараалалтай. */
export const FIELDS: Field[] = GROUPS.flatMap((g) => g.fields);

export const FIELD_KEYS: FieldKey[] = FIELDS.map((f) => f.key);

export const FIELD_BY_KEY: Record<FieldKey, Field> = Object.fromEntries(
  FIELDS.map((f) => [f.key, f])
) as Record<FieldKey, Field>;

/** Багана бүлгийнхээ эхнийх үү — хүснэгтэд бүлгийн зураас татахад хэрэглэнэ. */
export const IS_GROUP_START: Record<string, boolean> = Object.fromEntries(
  GROUPS.flatMap((g) => g.fields.map((f, i) => [f.key, i === 0]))
);

/* ---- Маягт дээр байхгүй, гэхдээ дүгнэлтэд хэрэглэдэг нэмэлт талбарууд ---- */

export const PHASES = [
  "Ургалтын идэвхгүй үе",
  "Ногооролт",
  "Навчлалт",
  "Түрүүлэлт",
  "Цэцэглэлт",
  "Үр боловсролт",
  "Хагдрал"
] as const;

export const CONDITIONS = [
  { value: "good", label: "Сайн" },
  { value: "warning", label: "Дунд" },
  { value: "serious", label: "Муу" },
  { value: "critical", label: "Онцгой муу" }
] as const;

export const RISKS = [
  { value: "none", label: "Байхгүй" },
  { value: "good", label: "Бага" },
  { value: "warning", label: "Дунд" },
  { value: "critical", label: "Өндөр" }
] as const;

export const CONDITION_LABEL: Record<string, string> = Object.fromEntries(
  CONDITIONS.map((c) => [c.value, c.label])
);
export const RISK_LABEL: Record<string, string> = Object.fromEntries(
  RISKS.map((r) => [r.value, r.label])
);
