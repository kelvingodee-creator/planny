import { json, readState, sessionUser } from "../../../lib/planny-server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const userId = await sessionUser(request);
  if (!userId) return json({ user: null });
  const state = await readState();
  const user = state.users.find(item => item.id === userId);
  if (!user) return json({ user: null });
  const { passwordHash, passwordSalt, ...safeUser } = user;
  void passwordHash;
  void passwordSalt;
  return json({ user: safeUser });
}
