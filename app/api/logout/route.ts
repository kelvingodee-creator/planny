import { clearSession, json } from "../../../lib/planny-server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return json({ ok: true }, { headers: { "set-cookie": await clearSession(request) } });
}
