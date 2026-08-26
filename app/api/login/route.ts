import { createSession, json, publicStateForUser, readState, verifyPassword } from "../../../lib/planny-server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json() as { email?: string; name?: string; password?: string };
  const login = String(body.email || body.name || "").trim().toLowerCase();
  const state = await readState();
  const user = state.users.find(item => item.email === login || item.id === login || item.name.toLowerCase() === login);
  if (!user || !(await verifyPassword(String(body.password || ""), user))) {
    return json({ error: "Login klopt niet, of dit account heeft nog geen wachtwoord." }, { status: 401 });
  }
  const { passwordHash, passwordSalt, ...safeUser } = user;
  void passwordHash;
  void passwordSalt;
  return json(
    { user: safeUser, state: publicStateForUser(state, user.id) },
    { headers: { "set-cookie": await createSession(user.id) } }
  );
}
