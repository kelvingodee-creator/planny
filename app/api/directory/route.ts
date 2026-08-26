import { findConnection, json, readState, requireUser } from "../../../lib/planny-server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const userId = await requireUser(request);
  if (!userId) return json({ error: "Niet ingelogd." }, { status: 401 });
  const url = new URL(request.url);
  const email = String(url.searchParams.get("email") || "").trim().toLowerCase();
  if (!email) return json({ error: "E-mail is verplicht." }, { status: 400 });
  const state = await readState();
  const user = state.users.find(item => item.email === email);
  if (!user || user.id === userId) return json({ error: "Geen teamlid gevonden met dit e-mailadres." }, { status: 404 });
  const { passwordHash, passwordSalt, ...safeUser } = user;
  void passwordHash;
  void passwordSalt;
  return json({ user: safeUser, connection: findConnection(state, userId, user.id) || null });
}
