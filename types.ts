import "dotenv/config";
import { backfillOutcomes } from "../src/pipeline/backfillOutcomes.js";

backfillOutcomes()
  .then((r) => {
    console.log("backfilled:", r);
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
