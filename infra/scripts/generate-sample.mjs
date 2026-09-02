import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const outDir = join(root, "media/sources");
mkdirSync(outDir, { recursive: true });
const out = join(outDir, "sample-source.mp4");
execSync(
  `ffmpeg -y -f lavfi -i "testsrc2=size=1280x720:rate=30:duration=30" -f lavfi -i "sine=frequency=440:sample_rate=48000:duration=30" -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest "${out}"`,
  { stdio: "inherit" }
);
console.log(`sample written: ${out}`);
