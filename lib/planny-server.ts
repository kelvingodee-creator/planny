import { env } from "cloudflare:workers";
import seedState from "../db/seed-planny.json";

type D1 = D1Database;

export type PlannyUser = {
  id: string;
  name: string;
  initials: string;
  email: string;
  passwordSalt?: string;
  passwordHash?: string;
};

type PlannyConnection = {
  id: string;
  requesterId: string;
  targetId: string;
  status: "pending" | "accepted" | "declined";
  permissions: {
    canCreateProjects: boolean;
    canCreateTasks: boolean;
    canViewSharedProjects: boolean;
    canViewAllTasks: boolean;
  };
  createdAt: string;
  updatedAt: string;
};

type PlannyProject = {
  id: string;
  name: string;
  members?: string[];
  tasks?: unknown[];
  [key: string]: unknown;
};

type PlannyState = {
  version: number;
  users: PlannyUser[];
  connections: PlannyConnection[];
  projects: PlannyProject[];
  userSettings?: Record<string, { categories?: Array<{ id: string; label: string; color: string }> }>;
  updatedAt?: string;
  currentUserId?: string;
  [key: string]: unknown;
};

const stateKey = "main";
const sessionCookie = "planny_session";

function db(): D1 {
  if (!env.DB) throw new Error("Database binding ontbreekt.");
  return env.DB;
}

export function json(data: unknown, init?: ResponseInit) {
  return Response.json(data, init);
}

export function nowIso() {
  return new Date().toISOString();
}

export function slug(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "user";
}

export function initials(value: string) {
  return String(value || "T")
    .split(/\s+/)
    .map(part => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function parseCookies(request: Request) {
  return Object.fromEntries(String(request.headers.get("cookie") || "").split(";").map(part => {
    const [key, ...rest] = part.trim().split("=");
    return [key, decodeURIComponent(rest.join("=") || "")];
  }).filter(([key]) => key));
}

function publicUser(user: PlannyUser) {
  const { passwordHash, passwordSalt, ...safeUser } = user;
  return safeUser;
}

function normalizeUsers(users: PlannyUser[] = []) {
  const base: PlannyUser[] = [
    { id: "kelvin", name: "Kelvin", initials: "K", email: "kelvin@planny.local" },
    { id: "wiebe", name: "Wiebe", initials: "W", email: "wiebe@planny.local" },
  ];
  const byId = new Map([...base, ...users].map(user => {
    const id = user.id || slug(user.name);
    return [id, {
      ...user,
      id,
      name: user.name || id,
      initials: user.initials || initials(user.name || id),
      email: String(user.email || `${id}@planny.local`).toLowerCase(),
    }];
  }));
  return [...byId.values()];
}

function normalizeConnection(connection: Partial<PlannyConnection>): PlannyConnection {
  return {
    id: connection.id || `connection-${crypto.randomUUID().slice(0, 8)}`,
    requesterId: connection.requesterId || "",
    targetId: connection.targetId || "",
    status: connection.status || "pending",
    permissions: {
      canCreateProjects: Boolean(connection.permissions?.canCreateProjects),
      canCreateTasks: Boolean(connection.permissions?.canCreateTasks),
      canViewSharedProjects: connection.permissions?.canViewSharedProjects !== false,
      canViewAllTasks: Boolean(connection.permissions?.canViewAllTasks),
    },
    createdAt: connection.createdAt || nowIso(),
    updatedAt: connection.updatedAt || connection.createdAt || nowIso(),
  };
}

export function normalizeState(raw: Partial<PlannyState> = {}): PlannyState {
  return {
    ...raw,
    version: raw.version || 1,
    users: normalizeUsers(raw.users),
    connections: Array.isArray(raw.connections) ? raw.connections.map(normalizeConnection) : [],
    projects: (raw.projects || []).map(project => ({
      ...project,
      members: Array.isArray(project.members)
        ? project.members
        : (["melo", "alzheimer"].includes(String(project.name || "").toLowerCase()) ? ["kelvin", "wiebe"] : ["kelvin"]),
    })),
  };
}

async function ensureTables() {
  const d1 = db();
  await d1.batch([
    d1.prepare("CREATE TABLE IF NOT EXISTS planny_state (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
    d1.prepare("CREATE TABLE IF NOT EXISTS planny_sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
  ]);
}

export async function readState(): Promise<PlannyState> {
  await ensureTables();
  const row = await db().prepare("SELECT value FROM planny_state WHERE key = ?").bind(stateKey).first<{ value: string }>();
  if (row?.value) return normalizeState(JSON.parse(row.value));
  const seeded = normalizeState(seedState as PlannyState);
  await writeState(seeded);
  return seeded;
}

export async function writeState(nextState: PlannyState) {
  await ensureTables();
  const state = normalizeState({ ...nextState, updatedAt: nowIso() });
  await db().prepare(
    "INSERT INTO planny_state (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at"
  ).bind(stateKey, JSON.stringify(state), state.updatedAt).run();
  return state;
}

export function publicStateForUser(state: PlannyState, userId: string): PlannyState {
  return {
    ...state,
    userSettings: state.userSettings?.[userId]
      ? { [userId]: state.userSettings[userId] }
      : {},
    users: state.users.map(publicUser) as PlannyUser[],
    connections: (state.connections || []).filter(connection => connection.requesterId === userId || connection.targetId === userId),
    currentUserId: userId,
    projects: (state.projects || []).filter(project => (project.members || []).includes(userId)),
  };
}

export function mergeStateForUser(currentState: PlannyState, nextState: PlannyState, userId: string): PlannyState {
  const allowedIds = new Set((currentState.projects || []).filter(project => (project.members || []).includes(userId)).map(project => project.id));
  const incomingById = new Map((nextState.projects || []).map(project => [project.id, project]));
  const keptProjects = (currentState.projects || []).map(project => {
    if (!allowedIds.has(project.id) || !incomingById.has(project.id)) return project;
    const incoming = incomingById.get(project.id)!;
    return {
      ...incoming,
      members: Array.isArray(incoming.members) ? incoming.members : project.members,
    };
  });
  for (const project of nextState.projects || []) {
    if (!project.id || allowedIds.has(project.id)) continue;
    if ((project.members || []).includes(userId)) keptProjects.unshift(project);
  }
  return {
    ...currentState,
    ...nextState,
    userSettings: {
      ...(currentState.userSettings || {}),
      ...(nextState.userSettings?.[userId]
        ? { [userId]: nextState.userSettings[userId] }
        : {}),
    },
    users: currentState.users,
    connections: currentState.connections,
    projects: keptProjects,
  };
}

export function findConnection(state: PlannyState, a: string, b: string) {
  return (state.connections || []).find(connection =>
    (connection.requesterId === a && connection.targetId === b) ||
    (connection.requesterId === b && connection.targetId === a)
  );
}

async function hex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

export async function hashPassword(password: string, salt = crypto.getRandomValues(new Uint8Array(16))) {
  const saltHex = typeof salt === "string" ? salt : [...salt].map(byte => byte.toString(16).padStart(2, "0")).join("");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    // Cloudflare Workers limits PBKDF2 to 100,000 iterations.
    { name: "PBKDF2", salt: new TextEncoder().encode(saltHex), iterations: 100000, hash: "SHA-256" },
    key,
    256
  );
  return { salt: saltHex, hash: await hex(bits) };
}

export async function verifyPassword(password: string, user: PlannyUser) {
  if (!user.passwordHash || !user.passwordSalt) return false;
  const { hash } = await hashPassword(password, user.passwordSalt);
  return hash === user.passwordHash;
}

export async function sessionUser(request: Request) {
  await ensureTables();
  const token = parseCookies(request)[sessionCookie];
  if (!token) return null;
  const row = await db().prepare("SELECT user_id as userId, expires_at as expiresAt FROM planny_sessions WHERE token = ?").bind(token).first<{ userId: string; expiresAt: string }>();
  if (!row || new Date(row.expiresAt) <= new Date()) return null;
  return row.userId;
}

export async function createSession(userId: string) {
  await ensureTables();
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  await db().prepare("INSERT INTO planny_sessions (token, user_id, expires_at) VALUES (?, ?, ?)").bind(token, userId, expiresAt).run();
  return `${sessionCookie}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800`;
}

export async function clearSession(request: Request) {
  const token = parseCookies(request)[sessionCookie];
  if (token) await db().prepare("DELETE FROM planny_sessions WHERE token = ?").bind(token).run();
  return `${sessionCookie}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}

export async function requireUser(request: Request) {
  const userId = await sessionUser(request);
  if (!userId) return null;
  return userId;
}
