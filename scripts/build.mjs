import { execSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const packages = readdirSync(join(ROOT, "packages"))
  .filter((d) => existsSync(join(ROOT, "packages", d, "package.json")))
  .sort();
const apps = readdirSync(join(ROOT, "apps"))
  .filter((d) => existsSync(join(ROOT, "apps", d, "package.json")))
  .sort();

const targets = [...packages, ...apps];
for (const t of targets) {
  const dir = existsSync(join(ROOT, "packages", t)) ? join(ROOT, "packages", t) : join(ROOT, "apps", t);
  console.log(`[build] ${t}`);
  execSync("npx tsc -p tsconfig.json", { cwd: dir, stdio: "inherit" });
}
console.log("[build] done");
