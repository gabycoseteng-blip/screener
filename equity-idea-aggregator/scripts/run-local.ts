import "dotenv/config";
import { runPipeline } from "../src/pipeline/run.js";

/** `npm run run:once` — execute one full pipeline run from your machine. */
runPipeline("manual")
  .then((s) => {
    console.log("\n=== run summary ===");
    console.table(s);
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
