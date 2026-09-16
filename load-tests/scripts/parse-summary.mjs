#!/usr/bin/env node
/**
 * Extract key metrics from k6 summary.json for reporting.
 * Usage: node load-tests/scripts/parse-summary.mjs docs/performance/stage-6/baseline/summary.json
 */
import { readFileSync } from "fs";

const path = process.argv[2];
if (!path) {
  console.error("Usage: parse-summary.mjs <summary.json>");
  process.exit(1);
}

const data = JSON.parse(readFileSync(path, "utf8"));
const m = data.metrics || {};

function pick(name) {
  const metric = m[name];
  if (!metric) return null;
  return {
    count: metric.count,
    rate: metric.rate,
    avg: metric.avg,
    med: metric.med,
    max: metric.max,
    p90: metric["p(90)"],
    p95: metric["p(95)"],
    p99: metric["p(99)"],
    value: metric.value,
  };
}

const failed = pick("http_req_failed");
const reqs = pick("http_reqs");
const dur = pick("http_req_duration");

const endpoints = [
  "health",
  "categories",
  "products_list",
  "discovery",
  "search",
  "product_detail",
  "reviews",
];

const byEndpoint = {};
for (const ep of endpoints) {
  const key = `http_req_duration{name:${ep}}`;
  if (m[key]) byEndpoint[ep] = pick(key);
}

const statusCodes = {};
for (const [key, val] of Object.entries(m)) {
  if (key.startsWith("http_status_code{")) {
    const statusMatch = key.match(/status:(\d+)/);
    const epMatch = key.match(/endpoint:([^,}]+)/);
    if (statusMatch) {
      const code = statusMatch[1];
      statusCodes[code] = (statusCodes[code] || 0) + (val.count || 0);
    }
  }
}

console.log(
  JSON.stringify(
    {
      http_reqs: reqs,
      http_req_duration: dur,
      http_req_failed_rate: failed?.value ?? failed?.rate,
      byEndpoint,
      statusCodes,
      setup_data: data.setup_data,
    },
    null,
    2,
  ),
);
