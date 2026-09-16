import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.1/index.js";

export const TREND_STATS = ["avg", "min", "med", "max", "p(90)", "p(95)", "p(99)"];

export function createHandleSummary(resultSubdir) {
  const base =
    __ENV.RESULT_DIR ||
    `docs/performance/stage-6/${resultSubdir}`;

  return function handleSummary(data) {
    return {
      [`${base}/summary.json`]: JSON.stringify(data, null, 2),
      stdout: textSummary(data, { indent: " ", enableColors: false }),
    };
  };
}
