import { findConnection, json, nowIso, publicStateForUser, readState, requireUser, writeState } from "../../../lib/planny-server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const userId = await requireUser(request);
  if (!userId) return json({ error: "Niet ingelogd." }, { status: 401 });
  const body = await request.json() as { targetEmail?: string; permissions?: Record<string, unknown> };
  const targetEmail = String(body.targetEmail || "").trim().toLowerCase();
  const state = await readState();
  const target = state.users.find(item => item.email === targetEmail);
  if (!target || target.id === userId) return json({ error: "Geen teamlid gevonden met dit e-mailadres." }, { status: 404 });
  const existing = findConnection(state, userId, target.id);
  if (existing && existing.status !== "declined") return json({ error: "Er bestaat al een connectie of open request." }, { status: 409 });
  state.connections = state.connections || [];
  state.connections.push({
    id: `connection-${crypto.randomUUID().slice(0, 8)}`,
    requesterId: userId,
    targetId: target.id,
    status: "pending",
    permissions: {
      canCreateProjects: Boolean(body.permissions?.canCreateProjects),
      canCreateTasks: Boolean(body.permissions?.canCreateTasks),
      canViewSharedProjects: body.permissions?.canViewSharedProjects !== false,
      canViewAllTasks: Boolean(body.permissions?.canViewAllTasks),
    },
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });
  const saved = await writeState(state);
  return json(publicStateForUser(saved, userId));
}
