import { mixedReadIteration, discoverProductId } from "../lib/workload.js";
import { createHandleSummary, TREND_STATS } from "../lib/summary-export.js";

export const options = {
  scenarios: {
    baseline: {
      executor: "constant-vus",
      vus: 2,
      duration: "2m",
    },
  },
  summaryTrendStats: TREND_STATS,
  thresholds: {
    http_req_failed: [{ threshold: "rate<0.05", abortOnFail: false }],
  },
};

export function handleSummary(data) {
  return createHandleSummary("baseline")(data);
}

export function setup() {
  return discoverProductId();
}

export default function (data) {
  mixedReadIteration(data);
}
