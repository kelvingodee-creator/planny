import { json, mergeStateForUser, publicStateForUser, readState, requireUser, writeState } from "../../../lib/planny-server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const userId = await requireUser(request);
  if (!userId) return json({ error: "Niet ingelogd." }, { status: 401 });
  return json(publicStateForUser(await readState(), userId));
}

export async function PUT(request: Request) {
  const userId = await requireUser(request);
  if (!userId) return json({ error: "Niet ingelogd." }, { status: 401 });
  const incoming = await request.json();
  const current = await readState();
  const saved = await writeState(mergeStateForUser(current, incoming, userId));
  return json(publicStateForUser(saved, userId));
}
