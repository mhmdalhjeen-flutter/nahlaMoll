import { mixedReadIteration, discoverProductId } from "../lib/workload.js";
import { createHandleSummary, TREND_STATS } from "../lib/summary-export.js";

export const options = {
  scenarios: {
    normal: {
      executor: "constant-vus",
      vus: 10,
      duration: "5m",
    },
  },
  summaryTrendStats: TREND_STATS,
  thresholds: {
    http_req_failed: [{ threshold: "rate<0.05", abortOnFail: false }],
  },
};

export function handleSummary(data) {
  return createHandleSummary("normal")(data);
}

export function setup() {
  return discoverProductId();
}

export default function (data) {
  mixedReadIteration(data);
}
