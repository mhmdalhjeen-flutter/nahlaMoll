import http from "k6/http";
import { check, sleep } from "k6";
import { apiUrl, rootUrl, SEARCH_TERMS } from "./lib/config.js";
import { discoverProductId } from "./lib/workload.js";
import { createHandleSummary, TREND_STATS } from "./lib/summary-export.js";

export const options = {
  vus: 1,
  iterations: 1,
  summaryTrendStats: TREND_STATS,
};

export function handleSummary(data) {
  return createHandleSummary("smoke")(data);
}

export function setup() {
  return discoverProductId();
}

export default function (data) {
  const productId = data.productId;
  const endpoints = [
    { name: "health", url: rootUrl("health") },
    { name: "categories", url: apiUrl("categories") },
    {
      name: "products_list",
      url: apiUrl("products?page=1&limit=12&sortBy=createdAt&sortOrder=desc"),
    },
    { name: "discovery", url: apiUrl("products/discovery?limit=8") },
    {
      name: "search",
      url: apiUrl(`products/search?q=${encodeURIComponent(SEARCH_TERMS[0])}`),
    },
  ];

  if (productId) {
    endpoints.push({
      name: "product_detail",
      url: apiUrl(`products/${productId}`),
    });
    endpoints.push({
      name: "reviews",
      url: apiUrl(`reviews/product/${productId}?limit=20`),
    });
  }

  for (const ep of endpoints) {
    const res = http.get(ep.url, { tags: { name: ep.name } });
    check(res, {
      [`${ep.name} status 2xx`]: (r) => r.status >= 200 && r.status < 300,
    });
    sleep(0.2);
  }
}
