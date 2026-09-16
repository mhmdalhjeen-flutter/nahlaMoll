import http from "k6/http";
import { check, sleep } from "k6";
import { apiUrl, rootUrl, SEARCH_TERMS } from "../lib/config.js";
import { discoverProductId } from "../lib/workload.js";
import { createHandleSummary, TREND_STATS } from "../lib/summary-export.js";

/** Single-VU endpoint latency sample (stays under global rate limit). */
export const options = {
  vus: 1,
  duration: "30s",
  summaryTrendStats: TREND_STATS,
  thresholds: {
    http_req_failed: ["rate<0.01"],
  },
};

export function handleSummary(data) {
  return createHandleSummary("endpoint-benchmark")(data);
}

export function setup() {
  return discoverProductId();
}

export default function (data) {
  const productId = data.productId;
  const term = SEARCH_TERMS[0];

  let res = http.get(rootUrl("health"), { tags: { name: "health" } });
  check(res, { "health 200": (r) => r.status === 200 });

  res = http.get(apiUrl("categories"), { tags: { name: "categories" } });
  check(res, { "categories 200": (r) => r.status === 200 });

  res = http.get(
    apiUrl("products?page=1&limit=12&sortBy=createdAt&sortOrder=desc"),
    { tags: { name: "products_list" } },
  );
  check(res, { "products 200": (r) => r.status === 200 });

  res = http.get(apiUrl("products/discovery?limit=8"), {
    tags: { name: "discovery" },
  });
  check(res, { "discovery 200": (r) => r.status === 200 });

  res = http.get(apiUrl(`products/search?q=${encodeURIComponent(term)}`), {
    tags: { name: "search" },
  });
  check(res, { "search 200": (r) => r.status === 200 });

  if (productId) {
    res = http.get(apiUrl(`products/${productId}`), {
      tags: { name: "product_detail" },
    });
    check(res, { "product_detail 200": (r) => r.status === 200 });

    res = http.get(apiUrl(`reviews/product/${productId}?limit=20`), {
      tags: { name: "reviews" },
    });
    check(res, { "reviews 200": (r) => r.status === 200 });
  }

  sleep(0.5);
}
