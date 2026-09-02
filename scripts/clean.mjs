import { rmSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
for (const dir of ["packages", "apps"]) {
  const base = join(root, dir);
  if (!existsSync(base)) continue;
  for (const pkg of readdirSync(base)) {
    const dist = join(base, pkg, "dist");
    if (existsSync(dist)) rmSync(dist, { recursive: true, force: true });
  }
}
for (const f of ["media/renders", "media/sources", "media/audio", "media/subtitles"]) {
  const p = join(root, f);
  if (existsSync(p)) {
    for (const e of readdirSync(p)) {
      rmSync(join(p, e), { recursive: true, force: true });
    }
  }
}
console.log("[clean] done");
