import { mixedReadIteration, discoverProductId } from "../lib/workload.js";

export const options = {
  scenarios: {
    stress_ramp: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "2m", target: 75 },
        { duration: "3m", target: 75 },
        { duration: "2m", target: 100 },
        { duration: "3m", target: 100 },
      ],
      gracefulRampDown: "30s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.10"],
  },
};

export function setup() {
  return discoverProductId();
}

export default function (data) {
  mixedReadIteration(data);
}
