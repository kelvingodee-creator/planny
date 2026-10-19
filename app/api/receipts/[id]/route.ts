import { deleteReceiptImage, json, publicStateForUser, readReceiptImage, readState, requireUser, writeState } from "../../../../lib/planny-server";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

async function authorizedReceipt(request: Request, id: string) {
  const userId = await requireUser(request);
  if (!userId) return { error: json({ error: "Niet ingelogd." }, { status: 401 }) };
  const state = await readState();
  const project = state.projects.find(item => (item.receipts as Array<{ id?: string }> | undefined)?.some(receipt => receipt.id === id));
  if (!project || !(project.members || []).includes(userId)) {
    return { error: json({ error: "Bonnetje niet gevonden." }, { status: 404 }) };
  }
  return { userId, state, project };
}

function decodeBase64(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const auth = await authorizedReceipt(request, id);
  if ("error" in auth) return auth.error;
  const row = await readReceiptImage(id);
  if (!row) return json({ error: "Foto niet gevonden." }, { status: 404 });
  return new Response(decodeBase64(row.imageData), {
    headers: {
      "content-type": row.mimeType,
      "cache-control": "private, max-age=300",
      "content-disposition": `inline; filename="${row.fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}"`,
    },
  });
}

export async function DELETE(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const auth = await authorizedReceipt(request, id);
  if ("error" in auth) return auth.error;
  auth.project.receipts = ((auth.project.receipts as Array<{ id?: string }>) || []).filter(receipt => receipt.id !== id);
  const saved = await writeState(auth.state);
  await deleteReceiptImage(id);
  return json({ state: publicStateForUser(saved, auth.userId) });
}
