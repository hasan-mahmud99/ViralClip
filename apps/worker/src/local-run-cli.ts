import { runLocalPipeline } from "./local-run";
import { config as loadDotenv } from "dotenv";

loadDotenv();

async function main() {
  const mediaPath = process.env.SOURCE_MEDIA ?? process.argv[2];
  if (!mediaPath) {
    console.error("usage: npm run run:local -- <media-file.mp4>   (or set SOURCE_MEDIA)");
    process.exit(1);
  }
  const result = await runLocalPipeline({
    mediaPath,
    outDir: process.env.MEDIA_OUT ?? "media",
    language: (process.env.COMMENTARY_LANGUAGE as "bn" | "en") ?? "bn",
    llm: process.env.LLM_PROVIDER === "gemini" ? "gemini" : "mock",
    transcription: process.env.TRANSCRIPTION_PROVIDER === "whisper" ? "whisper" : "mock",
    tts: process.env.TTS_PROVIDER === "espeak" ? "espeak" : "mock",
  });
  console.log(`DONE output=${result.outputPath} qaScore=${result.qaScore}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
