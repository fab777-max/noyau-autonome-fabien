import fs from "node:fs";

const source = fs.readFileSync(new URL("../index.js", import.meta.url), "utf8");

const checks = [
  ["static write secret remains supported", source.includes("env.BRIDGE_WRITE_TOKEN")],
  ["pair creation requires GitHub OIDC", source.includes("async function createPairingSession") && source.includes("githubActionsOidcMatches(request)")],
  ["pair token is namespaced", source.includes('/^np1\\.')],
  ["pairing is short lived", source.includes("PAIR_TTL_MS = 10 * 60 * 1000")],
  ["pairing binds exact brain", source.includes('pairing_brain_mismatch')],
  ["pairing binds generation", source.includes('pairing_generation_mismatch')],
  ["snapshot still requires authenticated write", source.includes("const writeAuth = await authenticateSnapshotWrite(request, env)")],
  ["pair page does not persist capability", !/localStorage|sessionStorage|indexedDB/i.test(source.slice(source.indexOf("function pairingPage"), source.indexOf("async function workerFetch")))],
  ["pair page uses no-store", source.includes('"cache-control": "no-store"')],
  ["pair link response omits capability", /pairUrl:[\s\S]{0,220}expiresAt/.test(source) && !/pairUrl:[\s\S]{0,220}capability/.test(source)],
  ["MCP remains read-token protected", /url\.pathname === "\/mcp"[\s\S]{0,180}BRIDGE_READ_TOKEN/.test(source)],
  ["public MCP route is declared before protected MCP route", source.indexOf('url.pathname === "/mcp/public"') < source.indexOf('url.pathname === "/mcp"')],
  ["public MCP route exposes read-only server without token check", /url\.pathname === "\/mcp\/public"[\s\S]{0,220}createNoyauMcpServer/.test(source)],
  ["public MCP request is remapped to handler mount path", /function remapPublicMcpRequest[\s\S]{0,180}url\.pathname = "\/mcp"/.test(source) && source.includes("remapPublicMcpRequest(request)")],
];

let failures = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} - ${name}`);
  if (!ok) failures += 1;
}
if (failures) process.exit(1);
console.log(`PAIRING_STATIC_PASS ${checks.length}/${checks.length}`);
