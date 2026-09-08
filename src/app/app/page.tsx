import { getStore } from "@/lib/store";
import { isAuthed, isGated } from "@/lib/auth";
import { currentPeriod, periodKey } from "@/lib/period";
import { AccessGate } from "@/components/AccessGate";
import { Dashboard } from "@/components/Dashboard";
import type { Report } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AppPage() {
  if (isGated() && !isAuthed()) return <AccessGate />;

  const store = getStore();
  let rows: Report[] = [];
  try {
    rows = await store.byPeriod(periodKey(currentPeriod()));
  } catch (e) {
    console.error("[govi] эхний ачаалалт амжилтгүй:", e);
  }

  return (
    <Dashboard
      initialRows={rows}
      cfg={{ storage: store.info.kind, ephemeral: store.info.ephemeral }}
    />
  );
}
