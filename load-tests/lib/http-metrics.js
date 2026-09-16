import { Counter } from "k6/metrics";

export const httpStatus = new Counter("http_status_code");

export function recordStatus(res, endpoint) {
  if (!res) return;
  httpStatus.add(1, {
    status: String(res.status),
    endpoint,
  });
}
