import { spawnSync } from "node:child_process";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { config } from "dotenv";

config({ quiet: true });
const npmCli = process.argv[2] || "C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js";
const secret = process.env.DATABASE_URL;
const privateParts = secret ? [secret, ...["hostname", "username", "password"].map(key => new URL(secret)[key])] : [];
const redact = value => privateParts.filter(Boolean).reduce((text, part) => text.split(part).join("[oculto]"), value);
const results = [];
for (const script of ["typecheck", "lint", "build"]) {
  const started = Date.now();
  const result = spawnSync(process.execPath, [npmCli, "run", script], { encoding: "utf8", timeout: 180000 });
  const output = redact((result.stdout || "") + (result.stderr || ""));
  results.push({ command: `npm run ${script}`, exitCode: result.status, status: result.status === 0 ? "CUMPLE" : "NO CUMPLE", milliseconds: Date.now() - started, output, errorCode: result.error?.code });
  console.log(`${script}: exit=${result.status}`);
}
await writeFile("docs/audit-checks.json", JSON.stringify({ date: new Date().toISOString(), node: process.version, results }, null, 2));
const sources = [];
async function hashDirectory(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) await hashDirectory(path);
    else if (/\.(ts|tsx|css|mjs|prisma)$/.test(entry.name)) sources.push({ path, sha256: createHash("sha256").update(await readFile(path)).digest("hex") });
  }
}
for (const directory of ["src", "scripts", "prisma"]) await hashDirectory(directory);
await writeFile("docs/audit-sources.json", JSON.stringify({ date: new Date().toISOString(), sources }, null, 2));
process.exitCode = results.every(result => result.exitCode === 0) ? 0 : 1;
