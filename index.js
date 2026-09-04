import { DurableObject } from "cloudflare:workers";
import { McpServer } from "@modelcontextprotocol/server";
import { createMcpHandler } from "agents/mcp/server";
import { z } from "zod";

export const SNAPSHOT_SCHEMA = "noyau-bridge-snapshot-v1";
export const BRIDGE_VERSION = "1.0.0";
export const MAX_PAYLOAD_BYTES = 128 * 1024;

const SECRET_KEYS = new Set([
  "password",
  "passwd",
  "authorization",
  "cookie",
  "sessiontoken",
  "accesstoken",
  "refreshtoken",
  "apikey",
  "secret",
]);

function normalizeKey(key) {
  return String(key).toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function findForbiddenKey(value, path = "root") {
  if (!value || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) {
      const hit = findForbiddenKey(value[i], `${path}[${i}]`);
      if (hit) return hit;
    }
    return null;
  }
  for (const [key, child] of Object.entries(value)) {
    const normalized = normalizeKey(key);
    if (SECRET_KEYS.has(normalized)) return `${path}.${key}`;
    if (normalized === "qtable") return `${path}.${key}`;
    const hit = findForbiddenKey(child, `${path}.${key}`);
    if (hit) return hit;
  }
  return null;
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stableSort(value) {
  if (Array.isArray(value)) return value.map(stableSort);
  if (!isObject(value)) return value;
  const out = {};
  for (const key of Object.keys(value).sort()) out[key] = stableSort(value[key]);
  return out;
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function meaningfulSnapshotView(input) {
  const snapshot = deepClone(input);

  if (isObject(snapshot.snapshot)) {
    delete snapshot.snapshot.seq;
    delete snapshot.snapshot.capturedAt;
    delete snapshot.snapshot.reason;
    delete snapshot.snapshot.hash;
  }
  if (isObject(snapshot.brain)) {
    delete snapshot.brain.updatedAt;
    delete snapshot.brain.lastSavedAt;
    delete snapshot.brain.lastStableAt;
  }
  if (isObject(snapshot.runtime)) {
    delete snapshot.runtime.online;
    delete snapshot.runtime.visibilityState;
    delete snapshot.runtime.bridgeState;
  }
  if (isObject(snapshot.diagnostics)) {
    delete snapshot.diagnostics.bridgePayloadBytes;
  }

  return stableSort(snapshot);
}

export async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function computeSnapshotHash(snapshot) {
  return sha256Hex(JSON.stringify(meaningfulSnapshotView(snapshot)));
}

export async function verifySnapshotHash(snapshot) {
  const expected = await computeSnapshotHash(snapshot);
  const supplied = String(snapshot?.snapshot?.hash || "").toLowerCase();
  return supplied === expected;
}

export function validateSnapshotShape(snapshot, payloadBytes = 0) {
  const errors = [];
  if (!isObject(snapshot)) errors.push("snapshot must be an object");
  if (snapshot?.schema !== SNAPSHOT_SCHEMA) errors.push(`schema must be ${SNAPSHOT_SCHEMA}`);
  if (typeof snapshot?.bridgeVersion !== "string") errors.push("bridgeVersion must be a string");
  if (typeof snapshot?.appVersion !== "string") errors.push("appVersion must be a string");

  const brainId = snapshot?.brain?.brainId;
  if (typeof brainId !== "string" || !/^[A-Za-z0-9._:-]{1,128}$/.test(brainId)) {
    errors.push("brain.brainId has an invalid format");
  }
  if (!Number.isInteger(snapshot?.brain?.generation) || snapshot.brain.generation < 0) {
    errors.push("brain.generation must be a non-negative integer");
  }

  if (!Number.isInteger(snapshot?.snapshot?.seq) || snapshot.snapshot.seq < 0) {
    errors.push("snapshot.seq must be a non-negative integer");
  }
  if (typeof snapshot?.snapshot?.capturedAt !== "string" || Number.isNaN(Date.parse(snapshot.snapshot.capturedAt))) {
    errors.push("snapshot.capturedAt must be an ISO date string");
  }
  if (typeof snapshot?.snapshot?.reason !== "string" || snapshot.snapshot.reason.length > 64) {
    errors.push("snapshot.reason must be a short string");
  }
  if (typeof snapshot?.snapshot?.hash !== "string" || !/^[a-f0-9]{64}$/i.test(snapshot.snapshot.hash)) {
    errors.push("snapshot.hash must be a SHA-256 hex digest");
  }

  if (!isObject(snapshot?.runtime)) errors.push("runtime must be an object");
  if (!isObject(snapshot?.arena)) errors.push("arena must be an object");
  if (!isObject(snapshot?.student)) errors.push("student must be an object");
  if (!Array.isArray(snapshot?.skills)) errors.push("skills must be an array");
  if (Array.isArray(snapshot?.skills) && snapshot.skills.length > 64) errors.push("skills is too large");
  if (!isObject(snapshot?.meta2)) errors.push("meta2 must be an object");
  if (!isObject(snapshot?.persistence)) errors.push("persistence must be an object");
  if (!Array.isArray(snapshot?.errors)) errors.push("errors must be an array");
  if (Array.isArray(snapshot?.errors) && snapshot.errors.length > 32) errors.push("errors is too large");

  const forbiddenKey = findForbiddenKey(snapshot);
  if (forbiddenKey) errors.push(`forbidden key detected: ${forbiddenKey}`);
  if (payloadBytes > MAX_PAYLOAD_BYTES) errors.push(`payload exceeds ${MAX_PAYLOAD_BYTES} bytes`);

  return { ok: errors.length === 0, errors };
}

export function maskBrainId(brainId) {
  const s = String(brainId || "");
  if (s.length <= 8) return `${s.slice(0, 2)}***`;
  return `${s.slice(0, 4)}…${s.slice(-4)}`;
}



const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };
const REGISTRY_OBJECT_NAME = "__bridge_registry__";
const TOOL_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders },
  });
}

function errorJson(error, status = 400, details = undefined, extraHeaders = {}) {
  return json(
    {
      error,
      ...(details ? { details } : {}),
    },
    status,
    extraHeaders,
  );
}

function getBearer(request) {
  const value = request.headers.get("authorization") || "";
  const match = /^Bearer\s+(.+)$/i.exec(value);
  return match?.[1] || null;
}

function tokenMatches(request, expected) {
  if (!expected || typeof expected !== "string") return false;
  return getBearer(request) === expected;
}

const PAIR_SCHEMA = "noyau-bridge-pair-v1";
const PAIR_TTL_MS = 10 * 60 * 1000;
const PAIR_APP_URL = "https://noyau-autonome-v37.fabien98escoffier.chatgpt.site";

function randomBase64Url(byteLength = 24) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function pairingStoreName(pairId) {
  return `pair:${pairId}`;
}

function parsePairCapability(value) {
  const match = /^np1\.([A-Za-z0-9_-]{12,80})\.([A-Za-z0-9_-]{20,160})$/.exec(String(value || ""));
  return match ? { pairId: match[1], secret: match[2] } : null;
}

async function createPairingSession(request, env) {
  if (!(await githubActionsOidcMatches(request))) return authFailure();

  let body = {};
  try {
    body = await request.json();
  } catch {}

  const expectedBrainId = String(body?.expectedBrainId || "").trim();
  const expectedGeneration = Number(body?.expectedGeneration);
  if (!/^brain_[A-Za-z0-9]{4,64}$/.test(expectedBrainId)) return errorJson("invalid_expected_brain_id", 400);
  if (!Number.isInteger(expectedGeneration) || expectedGeneration < 1) return errorJson("invalid_expected_generation", 400);

  const pairId = randomBase64Url(18);
  const secret = randomBase64Url(32);
  const capability = `np1.${pairId}.${secret}`;
  const now = Date.now();
  const record = {
    schema: PAIR_SCHEMA,
    pairId,
    capability,
    expectedBrainId,
    expectedGeneration,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + PAIR_TTL_MS).toISOString(),
    redeemedAt: null,
    consumedAt: null,
  };

  const stub = storeStub(env, pairingStoreName(pairId));
  const stored = await stub.fetch("https://bridge.internal/pair", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(record),
  });
  if (!stored.ok) return errorJson("pair_store_failed", 500);

  const origin = new URL(request.url).origin;
  return json({
    status: "created",
    schema: PAIR_SCHEMA,
    pairId,
    pairUrl: `${origin}/pair/${encodeURIComponent(pairId)}`,
    expiresAt: record.expiresAt,
    expectedBrainId,
    expectedGeneration,
  }, 201, { "cache-control": "no-store" });
}

async function redeemPairingSession(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return errorJson("invalid_json", 400);
  }
  const pairId = String(body?.pairId || "");
  if (!/^[A-Za-z0-9_-]{12,80}$/.test(pairId)) return errorJson("invalid_pair_id", 400);
  const stub = storeStub(env, pairingStoreName(pairId));
  return stub.fetch("https://bridge.internal/pair/redeem", {
    method: "POST",
    headers: JSON_HEADERS,
  });
}

async function authorizePairCapability(env, capability) {
  const parsed = parsePairCapability(capability);
  if (!parsed) return null;
  const stub = storeStub(env, pairingStoreName(parsed.pairId));
  const response = await stub.fetch("https://bridge.internal/pair/authorize", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ capability }),
  });
  if (!response.ok) return null;
  return response.json();
}

async function authenticateSnapshotWrite(request, env) {
  const bearer = getBearer(request);
  if (!bearer) return null;
  if (env.BRIDGE_WRITE_TOKEN && bearer === env.BRIDGE_WRITE_TOKEN) return { kind: "static" };
  const pair = await authorizePairCapability(env, bearer);
  return pair ? { kind: "pair", ...pair } : null;
}

function pairingPage(pairId) {
  const safePairId = JSON.stringify(String(pairId));
  const appUrl = JSON.stringify(PAIR_APP_URL);
  const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="referrer" content="no-referrer"><title>Pairage Noyau Autonome</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#0f1012;color:#f7f7f8;margin:0;padding:28px 18px}main{max-width:560px;margin:auto}.card{background:#191a1e;border:1px solid #34363d;border-radius:22px;padding:20px}.ok{color:#6dd6a0}.muted{color:#a8abb3;line-height:1.45}button{width:100%;min-height:58px;border:0;border-radius:16px;background:#69a5ff;color:#07101d;font-size:17px;font-weight:850;margin-top:16px}button:disabled{opacity:.55}.status{margin-top:14px;font-size:14px;line-height:1.45}</style>
</head><body><main><div class="card"><h1>Pairer le Noyau</h1><p class="muted">Cette page délivre une capability d’écriture temporaire, valable quelques minutes et uniquement pour le cerveau attendu. Elle n’est jamais enregistrée dans GitHub ni dans le Noyau.</p><button id="go">COPIER LA CAPABILITY & OUVRIR LE NOYAU</button><div class="status" id="status">Prêt.</div></div></main>
<script>
const pairId=${safePairId}; const appUrl=${appUrl};
const button=document.getElementById("go"), status=document.getElementById("status");
async function copyText(value){
  if(navigator.clipboard&&navigator.clipboard.writeText){await navigator.clipboard.writeText(value);return;}
  const input=document.createElement("textarea");input.value=value;input.setAttribute("readonly","");input.style.position="fixed";input.style.opacity="0";document.body.appendChild(input);input.select();
  if(!document.execCommand("copy")) throw new Error("copy_failed"); input.remove();
}
button.addEventListener("click",async()=>{
  button.disabled=true; status.textContent="Pairage…";
  try{
    const response=await fetch("/pair/redeem",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({pairId}),cache:"no-store"});
    const body=await response.json();
    if(!response.ok||!body.capability) throw new Error(body.error||("HTTP_"+response.status));
    await copyText(body.capability);
    status.innerHTML='<span class="ok">Capability copiée ✓</span><br>Ouverture du Noyau…';
    setTimeout(()=>location.href=appUrl+"#bridge-pair-ready",450);
  }catch(error){
    status.textContent="Pairage impossible : "+String(error.message||error);
    button.disabled=false;
  }
});
</script></body></html>`;
  return new Response(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "content-security-policy": "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'",
      "referrer-policy": "no-referrer",
      "x-content-type-options": "nosniff",
    },
  });
}

const GITHUB_OIDC_ISSUER = "https://token.actions.githubusercontent.com";
const GITHUB_OIDC_AUDIENCE = "noyau-autonome-live";
const GITHUB_OIDC_REPOSITORY = "fab777-max/noyau-autonome-live";
const GITHUB_OIDC_REF = "refs/heads/main";
const GITHUB_OIDC_WORKFLOW_REF = `${GITHUB_OIDC_REPOSITORY}/.github/workflows/sync-live.yml@${GITHUB_OIDC_REF}`;
let githubJwksCache = { expiresAt: 0, keys: [] };

function base64UrlToBytes(value) {
  const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function decodeJwtJson(value) {
  return JSON.parse(new TextDecoder().decode(base64UrlToBytes(value)));
}

async function getGitHubOidcJwks() {
  const now = Date.now();
  if (githubJwksCache.expiresAt > now && githubJwksCache.keys.length) return githubJwksCache.keys;

  const response = await fetch(`${GITHUB_OIDC_ISSUER}/.well-known/jwks`, {
    headers: { accept: "application/json" },
  });
  if (!response.ok) throw new Error(`github_oidc_jwks_failed_${response.status}`);

  const body = await response.json();
  const keys = Array.isArray(body?.keys) ? body.keys : [];
  if (!keys.length) throw new Error("github_oidc_jwks_empty");

  githubJwksCache = { expiresAt: now + 10 * 60 * 1000, keys };
  return keys;
}

function githubOidcAudienceMatches(audience) {
  if (Array.isArray(audience)) return audience.includes(GITHUB_OIDC_AUDIENCE);
  return audience === GITHUB_OIDC_AUDIENCE;
}

async function verifyGitHubActionsOidcToken(token) {
  try {
    const parts = String(token || "").split(".");
    if (parts.length !== 3) return false;

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const header = decodeJwtJson(encodedHeader);
    const claims = decodeJwtJson(encodedPayload);

    if (header?.alg !== "RS256" || typeof header?.kid !== "string") return false;

    const jwks = await getGitHubOidcJwks();
    const jwk = jwks.find((candidate) => candidate?.kid === header.kid && candidate?.kty === "RSA");
    if (!jwk) return false;

    const key = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const validSignature = await crypto.subtle.verify(
      { name: "RSASSA-PKCS1-v1_5" },
      key,
      base64UrlToBytes(encodedSignature),
      new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`),
    );
    if (!validSignature) return false;

    const now = Math.floor(Date.now() / 1000);
    if (claims?.iss !== GITHUB_OIDC_ISSUER) return false;
    if (!githubOidcAudienceMatches(claims?.aud)) return false;
    if (!Number.isFinite(claims?.exp) || claims.exp < now - 30) return false;
    if (Number.isFinite(claims?.nbf) && claims.nbf > now + 30) return false;
    if (claims?.repository !== GITHUB_OIDC_REPOSITORY) return false;
    if (claims?.ref !== GITHUB_OIDC_REF) return false;

    return true;
  } catch {
    return false;
  }
}

async function githubActionsOidcMatches(request) {
  const token = getBearer(request);
  if (!token) return false;
  return verifyGitHubActionsOidcToken(token);
}

function authFailure() {
  return errorJson("unauthorized", 401, undefined, {
    "www-authenticate": 'Bearer realm="noyau-autonome-bridge"',
    "cache-control": "no-store",
  });
}

function allowedOrigins(env) {
  return String(env.BRIDGE_ALLOWED_ORIGINS || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function originAllowed(request, env) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const allowed = allowedOrigins(env);
  return allowed.includes("*") || allowed.includes(origin);
}

function corsHeaders(request, env) {
  const origin = request.headers.get("origin");
  if (!origin || !originAllowed(request, env)) return {};
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "authorization, content-type, if-none-match",
    "access-control-expose-headers": "etag, last-modified",
    vary: "Origin",
  };
}

function withCors(response, request, env) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders(request, env))) headers.set(key, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function storeStub(env, name) {
  const id = env.BRIDGE_STORE.idFromName(name);
  return env.BRIDGE_STORE.get(id);
}

function brainStoreName(brainId) {
  return `brain:${brainId}`;
}

async function setLastBrainId(env, brainId) {
  const stub = storeStub(env, REGISTRY_OBJECT_NAME);
  await stub.fetch("https://bridge.internal/registry", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ brainId }),
  });
}

async function getLastBrainId(env) {
  const stub = storeStub(env, REGISTRY_OBJECT_NAME);
  const response = await stub.fetch("https://bridge.internal/registry");
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`registry read failed: ${response.status}`);
  const body = await response.json();
  return body.brainId || null;
}

async function resolveBrainId(env, requested) {
  if (requested) return String(requested);
  const last = await getLastBrainId(env);
  if (!last) {
    const error = new Error("no snapshot has been stored yet");
    error.status = 404;
    throw error;
  }
  return last;
}

async function putSnapshot(env, snapshot) {
  const stub = storeStub(env, brainStoreName(snapshot.brain.brainId));
  const response = await stub.fetch("https://bridge.internal/snapshot", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(snapshot),
  });
  const body = await response.json();
  return { response, body };
}

async function readStoredSnapshot(env, requestedBrainId) {
  const brainId = await resolveBrainId(env, requestedBrainId);
  const stub = storeStub(env, brainStoreName(brainId));
  const response = await stub.fetch("https://bridge.internal/snapshot");
  if (response.status === 404) {
    const error = new Error("snapshot not found");
    error.status = 404;
    throw error;
  }
  if (!response.ok) throw new Error(`snapshot read failed: ${response.status}`);
  const body = await response.json();
  return { brainId, ...body };
}

function statusView(stored) {
  const s = stored.snapshot;
  return {
    schema: s.schema,
    bridgeVersion: s.bridgeVersion,
    appVersion: s.appVersion,
    brain: s.brain,
    snapshot: s.snapshot,
    runtime: s.runtime,
    arena: s.arena,
    student: s.student,
    persistence: s.persistence,
    server: { storedAt: stored.storedAt },
  };
}

function skillsView(stored) {
  return {
    brainId: stored.snapshot.brain.brainId,
    seq: stored.snapshot.snapshot.seq,
    capturedAt: stored.snapshot.snapshot.capturedAt,
    skills: stored.snapshot.skills || [],
  };
}

function meta2View(stored) {
  return {
    brainId: stored.snapshot.brain.brainId,
    seq: stored.snapshot.snapshot.seq,
    capturedAt: stored.snapshot.snapshot.capturedAt,
    meta2: stored.snapshot.meta2 || {},
  };
}

function sessionView(stored) {
  const s = stored.snapshot;
  return {
    brainId: s.brain.brainId,
    seq: s.snapshot.seq,
    capturedAt: s.snapshot.capturedAt,
    session: s.session || {
      reason: s.snapshot.reason,
      runtimeStatus: s.runtime?.status ?? null,
      currentSkillId: s.student?.currentSkillId ?? null,
      studentCycles: s.student?.cycles ?? null,
    },
  };
}

function cacheHeaders(stored) {
  return {
    etag: stored.etag,
    "last-modified": new Date(stored.storedAt).toUTCString(),
    "cache-control": "private, no-store",
  };
}

function maybeNotModified(request, stored) {
  return request.headers.get("if-none-match") === stored.etag;
}

function logSnapshotResult(snapshot, payloadBytes, outcome) {
  console.log(
    JSON.stringify({
      event: "bridge_snapshot",
      brainId: maskBrainId(snapshot.brain.brainId),
      seq: snapshot.snapshot.seq,
      bytes: payloadBytes,
      outcome,
      at: new Date().toISOString(),
    }),
  );
}

async function handleSnapshotPost(request, env) {
  const writeAuth = await authenticateSnapshotWrite(request, env);
  if (!writeAuth) return authFailure();
  const type = request.headers.get("content-type") || "";
  if (!type.toLowerCase().includes("application/json")) return errorJson("content_type_must_be_json", 415);

  const declaredLength = Number(request.headers.get("content-length") || "0");
  if (declaredLength > MAX_PAYLOAD_BYTES) return errorJson("payload_too_large", 413);

  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength > MAX_PAYLOAD_BYTES) return errorJson("payload_too_large", 413);

  let snapshot;
  try {
    snapshot = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return errorJson("invalid_json", 400);
  }

  const validation = validateSnapshotShape(snapshot, bytes.byteLength);
  if (!validation.ok) return errorJson("invalid_snapshot", 422, validation.errors);
  if (!(await verifySnapshotHash(snapshot))) return errorJson("snapshot_hash_mismatch", 422);

  if (writeAuth.kind === "pair") {
    if (snapshot.brain?.brainId !== writeAuth.expectedBrainId) return errorJson("pairing_brain_mismatch", 403);
    if (Number(snapshot.brain?.generation) !== Number(writeAuth.expectedGeneration)) return errorJson("pairing_generation_mismatch", 403);
  }

  const { response, body } = await putSnapshot(env, snapshot);
  if (response.ok) {
    await setLastBrainId(env, snapshot.brain.brainId);
  }
  logSnapshotResult(snapshot, bytes.byteLength, body.status || response.status);
  return json(body, response.status, { "cache-control": "no-store" });
}

async function handleReadEndpoint(request, env, kind) {
  if (!tokenMatches(request, env.BRIDGE_READ_TOKEN)) return authFailure();
  const url = new URL(request.url);
  const stored = await readStoredSnapshot(env, url.searchParams.get("brainId"));
  const headers = cacheHeaders(stored);
  if (maybeNotModified(request, stored)) return new Response(null, { status: 304, headers });

  if (kind === "status") return json(statusView(stored), 200, headers);
  if (kind === "snapshot") return json({ ...stored.snapshot, server: { storedAt: stored.storedAt } }, 200, headers);
  if (kind === "skills") return json(skillsView(stored), 200, headers);
  if (kind === "meta2") return json(meta2View(stored), 200, headers);
  if (kind === "session") return json(sessionView(stored), 200, headers);
  return errorJson("not_found", 404);
}

async function handleGitHubLiveRead(request, env) {
  if (!(await githubActionsOidcMatches(request))) return authFailure();
  const stored = await readStoredSnapshot(env, null);
  return json(
    { ...stored.snapshot, server: { storedAt: stored.storedAt } },
    200,
    cacheHeaders(stored),
  );
}

function mcpText(data) {
  return { content: [{ type: "text", text: JSON.stringify(data) }] };
}

function mcpError(error) {
  return {
    isError: true,
    content: [{ type: "text", text: JSON.stringify({ error: error?.message || "unknown_error" }) }],
  };
}

function registerReadTool(server, name, description, reader) {
  server.registerTool(
    name,
    {
      description,
      inputSchema: { brainId: z.string().min(1).max(128).optional() },
      annotations: TOOL_ANNOTATIONS,
    },
    async ({ brainId }) => {
      try {
        return mcpText(await reader(brainId));
      } catch (error) {
        return mcpError(error);
      }
    },
  );
}

function createNoyauMcpServer(env) {
  const server = new McpServer({ name: "NoyauAutonome", version: BRIDGE_VERSION });

  registerReadTool(server, "get_brain_status", "Read the latest compact status of the Noyau Autonome brain.", async (brainId) =>
    statusView(await readStoredSnapshot(env, brainId)),
  );
  registerReadTool(server, "get_learning_metrics", "Read the latest canonical summarized learning snapshot.", async (brainId) => {
    const stored = await readStoredSnapshot(env, brainId);
    return { ...stored.snapshot, server: { storedAt: stored.storedAt } };
  });
  registerReadTool(server, "get_skills", "Read summarized Skill metrics from the latest snapshot.", async (brainId) =>
    skillsView(await readStoredSnapshot(env, brainId)),
  );
  registerReadTool(server, "get_meta2_state", "Read the Meta2 controller summary from the latest snapshot.", async (brainId) =>
    meta2View(await readStoredSnapshot(env, brainId)),
  );
  registerReadTool(server, "get_last_session", "Read the last synchronized session summary.", async (brainId) =>
    sessionView(await readStoredSnapshot(env, brainId)),
  );

  server.registerTool(
    "get_bridge_health",
    {
      description: "Read Bridge service health without modifying Noyau state.",
      inputSchema: {},
      annotations: TOOL_ANNOTATIONS,
    },
    async () =>
      mcpText({
        service: "noyau-autonome-bridge",
        version: BRIDGE_VERSION,
        schema: SNAPSHOT_SCHEMA,
        status: "ok",
        timestamp: new Date().toISOString(),
      }),
  );

  return server;
}

function remapPublicMcpRequest(request) {
  const url = new URL(request.url);
  url.pathname = "/mcp";
  return new Request(url, request);
}

async function workerFetch(request, env, ctx) {
  const url = new URL(request.url);

  if (request.method === "OPTIONS") {
    if (!originAllowed(request, env)) return errorJson("origin_not_allowed", 403);
    return new Response(null, { status: 204, headers: corsHeaders(request, env) });
  }

  if (url.pathname === "/api/bridge/v1/health" && request.method === "GET") {
    return withCors(json({
      service: "noyau-autonome-bridge",
      version: BRIDGE_VERSION,
      schema: SNAPSHOT_SCHEMA,
      status: "ok",
      timestamp: new Date().toISOString(),
    }), request, env);
  }

  if (url.pathname === "/mcp/public") {
    return createMcpHandler(() => createNoyauMcpServer(env))(remapPublicMcpRequest(request), env, ctx);
  }

  if (url.pathname === "/mcp") {
    if (!tokenMatches(request, env.BRIDGE_READ_TOKEN)) return authFailure();
    return createMcpHandler(() => createNoyauMcpServer(env))(request, env, ctx);
  }

  if (url.pathname.startsWith("/pair/") && request.method === "GET") {
    const pairId = decodeURIComponent(url.pathname.slice("/pair/".length));
    if (!/^[A-Za-z0-9_-]{12,80}$/.test(pairId)) return errorJson("invalid_pair_id", 400);
    return pairingPage(pairId);
  }

  if (url.pathname === "/pair/redeem" && request.method === "POST") {
    return redeemPairingSession(request, env);
  }

  if (url.pathname.startsWith("/api/bridge/v1/") && !originAllowed(request, env)) {
    return withCors(errorJson("origin_not_allowed", 403), request, env);
  }

  try {
    let response;
    if (url.pathname === "/api/bridge/v1/snapshot" && request.method === "POST") {
      response = await handleSnapshotPost(request, env);
    } else if (url.pathname === "/api/bridge/v1/pair/create" && request.method === "POST") {
      response = await createPairingSession(request, env);
    } else if (url.pathname === "/api/bridge/v1/status" && request.method === "GET") {
      response = await handleReadEndpoint(request, env, "status");
    } else if (url.pathname === "/api/bridge/v1/snapshot/latest" && request.method === "GET") {
      response = await handleReadEndpoint(request, env, "snapshot");
    } else if (url.pathname === "/api/bridge/v1/github/live" && request.method === "GET") {
      response = await handleGitHubLiveRead(request, env);
    } else if (url.pathname === "/api/bridge/v1/skills" && request.method === "GET") {
      response = await handleReadEndpoint(request, env, "skills");
    } else if (url.pathname === "/api/bridge/v1/meta2" && request.method === "GET") {
      response = await handleReadEndpoint(request, env, "meta2");
    } else if (url.pathname === "/api/bridge/v1/session/latest" && request.method === "GET") {
      response = await handleReadEndpoint(request, env, "session");
    } else {
      response = errorJson("not_found", 404);
    }
    return withCors(response, request, env);
  } catch (error) {
    const status = Number(error?.status) || 500;
    const response = errorJson(status === 500 ? "internal_error" : error.message, status);
    return withCors(response, request, env);
  }
}

export default { fetch: workerFetch };

export class BrainSnapshotStore extends DurableObject {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/registry") {
      if (request.method === "GET") {
        const brainId = await this.ctx.storage.get("lastBrainId");
        return brainId ? json({ brainId }) : errorJson("not_found", 404);
      }
      if (request.method === "POST") {
        const { brainId } = await request.json();
        if (typeof brainId !== "string" || !brainId) return errorJson("invalid_brain_id", 400);
        await this.ctx.storage.put("lastBrainId", brainId);
        return json({ status: "stored", brainId });
      }
      return errorJson("method_not_allowed", 405);
    }

    if (url.pathname === "/pair") {
      if (request.method !== "POST") return errorJson("method_not_allowed", 405);
      const record = await request.json();
      if (!record || record.schema !== PAIR_SCHEMA || typeof record.pairId !== "string" || typeof record.capability !== "string") {
        return errorJson("invalid_pair_record", 400);
      }
      await this.ctx.storage.put("pair", record);
      return json({ status: "stored", pairId: record.pairId }, 201);
    }

    if (url.pathname === "/pair/redeem") {
      if (request.method !== "POST") return errorJson("method_not_allowed", 405);
      const record = await this.ctx.storage.get("pair");
      if (!record) return errorJson("pair_not_found", 404);
      if (record.consumedAt) return errorJson("pair_consumed", 410);
      if (Date.parse(record.expiresAt) <= Date.now()) return errorJson("pair_expired", 410);
      record.redeemedAt = record.redeemedAt || new Date().toISOString();
      await this.ctx.storage.put("pair", record);
      return json({
        status: "redeemed",
        capability: record.capability,
        expiresAt: record.expiresAt,
        expectedBrainId: record.expectedBrainId,
        expectedGeneration: record.expectedGeneration,
      }, 200, { "cache-control": "no-store" });
    }

    if (url.pathname === "/pair/authorize") {
      if (request.method !== "POST") return errorJson("method_not_allowed", 405);
      const record = await this.ctx.storage.get("pair");
      if (!record) return authFailure();
      const { capability } = await request.json();
      if (record.consumedAt || Date.parse(record.expiresAt) <= Date.now() || capability !== record.capability) return authFailure();
      return json({
        ok: true,
        pairId: record.pairId,
        expectedBrainId: record.expectedBrainId,
        expectedGeneration: record.expectedGeneration,
        expiresAt: record.expiresAt,
      });
    }

    if (url.pathname === "/pair/consume") {
      if (request.method !== "POST") return errorJson("method_not_allowed", 405);
      const record = await this.ctx.storage.get("pair");
      if (!record) return errorJson("pair_not_found", 404);
      record.consumedAt = new Date().toISOString();
      delete record.capability;
      await this.ctx.storage.put("pair", record);
      return json({ status: "consumed", pairId: record.pairId });
    }

    if (url.pathname !== "/snapshot") return errorJson("not_found", 404);

    if (request.method === "GET") {
      const stored = await this.ctx.storage.get("latest");
      return stored ? json(stored) : errorJson("not_found", 404);
    }

    if (request.method === "POST") {
      const incoming = await request.json();
      const current = await this.ctx.storage.get("latest");
      const seq = incoming.snapshot.seq;
      const hash = incoming.snapshot.hash;

      if (current) {
        const currentSeq = current.snapshot.snapshot.seq;
        const currentHash = current.snapshot.snapshot.hash;
        if (seq < currentSeq) {
          return json({ status: "stale", currentSeq }, 409);
        }
        if (seq === currentSeq && hash !== currentHash) {
          return json({ status: "conflict", currentSeq }, 409);
        }
        if (seq === currentSeq && hash === currentHash) {
          return json({ status: "duplicate", seq, etag: current.etag }, 200);
        }
      }

      const storedAt = new Date().toISOString();
      const etag = `"${hash}"`;
      const row = { snapshot: incoming, storedAt, etag };
      await this.ctx.storage.put("latest", row);
      return json({ status: "stored", seq, etag }, 201);
    }

    return errorJson("method_not_allowed", 405);
  }
}
