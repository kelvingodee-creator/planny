import { json, nowIso, publicStateForUser, readState, requireUser, writeState } from "../../../../lib/planny-server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const userId = await requireUser(request);
  if (!userId) return json({ error: "Niet ingelogd." }, { status: 401 });
  const body = await request.json() as { connectionId?: string; action?: string };
  const state = await readState();
  const connection = (state.connections || []).find(item => item.id === body.connectionId);
  if (!connection || connection.targetId !== userId || connection.status !== "pending") {
    return json({ error: "Connectierequest niet gevonden." }, { status: 404 });
  }
  connection.status = body.action === "accept" ? "accepted" : "declined";
  connection.updatedAt = nowIso();
  const saved = await writeState(state);
  return json(publicStateForUser(saved, userId));
}
