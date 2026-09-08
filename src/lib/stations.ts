/**
 * Өмнөговь аймгийн ХАА-н цаг уурын станцууд.
 *
 * Индекс ба нэрийг ХААЦУС системийн жагсаалтаас авав
 * (192.168.100.30/agro_2020 — дотоод сүлжээ).
 *
 * `pos` — схем зураг дээрх харьцангуй байрлал [x, y], 0–1 хооронд.
 * Захиргааны ЖИНХЭНЭ хил БИШ. null бол байрлал тодруулаагүй.
 */
export type Station = {
  idx: string;
  name: string;
  pos: [number, number] | null;
  center?: boolean;
  /** Тодруулах шаардлагатай станц — хуудсан дээр ил тэмдэглэнэ. */
  unresolved?: boolean;
};

export const STATIONS: Station[] = [
  { idx: "339", name: "Сайхан", pos: null, unresolved: true },
  { idx: "347", name: "Цогт-Овоо", pos: [0.68, 0.15] },
  { idx: "373", name: "Даланзадгад", pos: [0.49, 0.62], center: true },
  { idx: "374", name: "Гурвантэс", pos: [0.07, 0.71] },
  { idx: "382", name: "Манлай", pos: [0.8, 0.3] },
  { idx: "385", name: "Ханбогд", pos: [0.9, 0.57] },
  { idx: "731", name: "Баяндалай", pos: [0.43, 0.77] },
  { idx: "732", name: "Баян-Овоо", pos: [0.72, 0.49] },
  { idx: "733", name: "Мандал-Овоо", pos: [0.5, 0.24] },
  { idx: "735", name: "Ноён", pos: [0.21, 0.65] },
  { idx: "736", name: "Номгон", pos: [0.76, 0.81] },
  { idx: "737", name: "Сэврэй", pos: [0.19, 0.84] },
  { idx: "739", name: "739 станц", pos: null, unresolved: true },
  { idx: "740", name: "Цогтцэций", pos: [0.58, 0.36] }
];

export const STATION_BY_IDX: Record<string, Station> = Object.fromEntries(
  STATIONS.map((s) => [s.idx, s])
);

export function stationName(idx: string): string {
  return STATION_BY_IDX[idx]?.name ?? idx;
}

export function isKnownStation(idx: string): boolean {
  return Object.prototype.hasOwnProperty.call(STATION_BY_IDX, idx);
}
