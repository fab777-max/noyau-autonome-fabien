import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const source = await readFile("index.js");
const actualHash = createHash("sha256").update(source).digest("hex");
const expectedHash = "6c1b9bf6b6e88f6efe88e96890bac148df558943a9ac63a7c587d2bcefe5bfb5";

if (actualHash !== expectedHash) {
  throw new Error(`index.js integrity check failed: ${actualHash}`);
}

console.log(`index.js verified: ${actualHash}`);
