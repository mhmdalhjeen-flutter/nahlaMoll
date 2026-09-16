import { mixedReadIteration, discoverProductId } from "./lib/workload.js";

export const options = {
  scenarios: {
    warmup: {
      executor: "constant-vus",
      vus: 2,
      duration: "1m",
    },
  },
  thresholds: {
    http_req_failed: ["rate<1"],
  },
};

export function setup() {
  return discoverProductId();
}

export default function (data) {
  mixedReadIteration(data);
}
