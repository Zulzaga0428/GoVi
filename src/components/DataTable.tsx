"use client";

import { GROUPS, FIELDS, IS_GROUP_START } from "@/lib/fields";
import { STATIONS } from "@/lib/stations";
import { fmt, mean } from "@/lib/format";
import type { Report } from "@/lib/types";

/** Станц тус бүрийн үзүүлэлт — багана нь гар бичмэл маягтын дараалалтай. */
export function DataTable({ rows }: { rows: Report[] }) {
  const byIdx = new Map(rows.map((r) => [r.st, r]));

  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr className="grp-row">
            <th className="l" rowSpan={2}>
              Салбар
            </th>
            {GROUPS.map((g) => (
              <th key={g.name} colSpan={g.fields.length}>
                {g.name}
              </th>
            ))}
          </tr>
          <tr className="f-row">
            {FIELDS.map((f) => (
              <th key={f.key} className={IS_GROUP_START[f.key] ? "gsep" : undefined} title={f.full}>
                {f.head}
                {f.unit && (
                  <>
                    <br />
                    <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>
                      {f.unit}
                    </span>
                  </>
                )}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {STATIONS.map((s) => {
            const r = byIdx.get(s.idx);
            const head = (
              <td className="l">
                <span className="st-name">{s.name}</span>
                <span className="st-idx">
                  {s.idx}
                  {s.center && " · аймгийн төв"}
                </span>
              </td>
            );
            if (!r) {
              return (
                <tr className="missing" key={s.idx}>
                  {head}
                  <td colSpan={FIELDS.length} className="l await">
                    Мэдээ хүлээгдэж байна
                  </td>
                </tr>
              );
            }
            return (
              <tr key={s.idx}>
                {head}
                {FIELDS.map((f) => (
                  <td key={f.key} className={IS_GROUP_START[f.key] ? "gsep" : undefined}>
                    {fmt(r[f.key], f.digits)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>

        {rows.length > 0 && (
          <tfoot>
            <tr>
              <td className="l">Аймгийн дундаж · {rows.length} станц</td>
              {FIELDS.map((f) => (
                <td key={f.key} className={IS_GROUP_START[f.key] ? "gsep" : undefined}>
                  {fmt(mean(rows.map((r) => r[f.key])), f.digits)}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
