import { json, nowIso, publicStateForUser, readState, requireUser, writeReceiptImage, writeState } from "../../../lib/planny-server";

export const dynamic = "force-dynamic";

const MAX_RECEIPT_BYTES = 8 * 1024 * 1024;

function decimal(value: FormDataEntryValue | null, fallback = 0) {
  const text = String(value || "").trim();
  if (!text) return fallback;
  const number = Number(text.replace(",", "."));
  return Number.isFinite(number) ? number : Number.NaN;
}

async function asBase64(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

export async function POST(request: Request) {
  const userId = await requireUser(request);
  if (!userId) return json({ error: "Niet ingelogd." }, { status: 401 });

  const form = await request.formData();
  const projectId = String(form.get("projectId") || "");
  const file = form.get("photo");
  const name = String(form.get("name") || "").trim();
  const amount = decimal(form.get("amount"), Number.NaN);
  const vatRate = decimal(form.get("vatRate"), 21);
  if (!projectId || !(file instanceof File) || !file.type.startsWith("image/")) {
    return json({ error: "Kies een project en een foto van het bonnetje." }, { status: 400 });
  }
  if (!name || !Number.isFinite(amount) || amount < 0 || !Number.isFinite(vatRate) || vatRate < 0) {
    return json({ error: "Omschrijving, bedrag en btw-percentage zijn verplicht." }, { status: 400 });
  }
  if (file.size <= 0 || file.size > MAX_RECEIPT_BYTES) {
    return json({ error: "De foto is te groot. Gebruik een foto kleiner dan 8 MB." }, { status: 413 });
  }

  const state = await readState();
  const project = state.projects.find(item => item.id === projectId);
  if (!project || !(project.members || []).includes(userId)) {
    return json({ error: "Je hebt geen toegang tot dit project." }, { status: 403 });
  }

  const id = `receipt-${crypto.randomUUID().slice(0, 8)}`;
  const timestamp = nowIso();
  await writeReceiptImage({
    id,
    projectId,
    ownerId: userId,
    fileName: file.name || "bonnetje.jpg",
    mimeType: file.type || "image/jpeg",
    imageData: await asBase64(file),
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  const receipt = {
    id,
    name,
    amount,
    vatMode: form.get("vatMode") === "excl" ? "excl" : "incl",
    vatRate,
    dateLabel: String(form.get("dateLabel") || "").trim(),
    fileName: file.name || "bonnetje.jpg",
    mimeType: file.type || "image/jpeg",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  project.receipts = [...((project.receipts as unknown[]) || []), receipt];
  const saved = await writeState(state);
  return json({ state: publicStateForUser(saved, userId) });
}
