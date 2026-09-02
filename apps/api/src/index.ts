import { config as loadDotenv } from "dotenv";
import { createLogger } from "@viralclip/shared";
import { createApi } from "./app";

loadDotenv();

async function main(): Promise<void> {
  const logger = createLogger("viralclip-api");
  const app = createApi();
  const port = Number(process.env.API_PORT ?? 4000);
  const host = process.env.API_HOST ?? "0.0.0.0";
  app.listen(port, host, () => {
    logger.info("api listening", { host, port });
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
