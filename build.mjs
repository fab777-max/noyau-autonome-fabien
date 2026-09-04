import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const source = await readFile("index.js");
const actualHash = createHash("sha256").update(source).digest("hex");
const expectedHash = "99bf13510b75c1599c2a309dc0e6b0f6839006a972cbc41fa110fcf94610a936";

if (actualHash !== expectedHash) {
  throw new Error(`index.js integrity check failed: ${actualHash}`);
}

console.log(`index.js verified: ${actualHash}`);
