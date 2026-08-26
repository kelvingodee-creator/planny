import { createSession, hashPassword, initials, json, publicStateForUser, readState, sessionUser, slug, writeState } from "../../../lib/planny-server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json() as { name?: string; email?: string; password?: string; login?: boolean };
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (!name || !email || password.length < 6) {
    return json({ error: "Naam, e-mail en wachtwoord van minimaal 6 tekens zijn verplicht." }, { status: 400 });
  }

  const state = await readState();
  let user = state.users.find(item => item.email === email || item.id === slug(name));
  if (user?.passwordHash) return json({ error: "Dit account bestaat al." }, { status: 409 });

  const { salt, hash } = await hashPassword(password);
  if (user) {
    Object.assign(user, { name, email, initials: initials(name), passwordSalt: salt, passwordHash: hash });
  } else {
    user = { id: slug(name), name, initials: initials(name), email, passwordSalt: salt, passwordHash: hash };
    state.users.push(user);
  }
  const saved = await writeState(state);
  const { passwordHash, passwordSalt, ...safeUser } = user;
  void passwordHash;
  void passwordSalt;
  if (body.login) {
    return json(
      { user: safeUser, state: publicStateForUser(saved, user.id) },
      { headers: { "set-cookie": await createSession(user.id) } }
    );
  }
  const viewerId = await sessionUser(request) || user.id;
  return json({ user: safeUser, state: publicStateForUser(saved, viewerId) });
}
