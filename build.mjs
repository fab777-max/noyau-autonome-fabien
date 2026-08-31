import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const source = await readFile("index.js");
const actualHash = createHash("sha256").update(source).digest("hex");
const expectedHash = "2e3d28cad84344654dd06661bea1c143ee151751b2d8e7da673ef60c23a5c832";

if (actualHash !== expectedHash) {
  throw new Error(`index.js integrity check failed: ${actualHash}`);
}

console.log(`index.js verified: ${actualHash}`);
