import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const source = await readFile("index.js");
const actualHash = createHash("sha256").update(source).digest("hex");
const expectedHash = "114693d3c07e669bb1fec5b741cfd3ff019287340ee7be37a086e196d624b33f";

if (actualHash !== expectedHash) {
  throw new Error(`index.js integrity check failed: ${actualHash}`);
}

console.log(`index.js verified: ${actualHash}`);
