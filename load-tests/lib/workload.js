import http from "k6/http";
import { check, sleep } from "k6";
import { apiUrl, rootUrl, SEARCH_TERMS } from "./config.js";
import { recordStatus } from "./http-metrics.js";

/**
 * Synthetic mixed read workload:
 * 5% health, 10% categories, 30% products, 20% discovery,
 * 15% search, 10% product detail, 10% reviews
 */
export function mixedReadIteration(data) {
  const roll = Math.random();
  let res;
  let endpoint;

  if (roll < 0.05) {
    endpoint = "health";
    res = http.get(rootUrl("health"), { tags: { name: endpoint } });
    check(res, { "health status 200": (r) => r.status === 200 });
  } else if (roll < 0.15) {
    endpoint = "categories";
    res = http.get(apiUrl("categories"), { tags: { name: endpoint } });
    check(res, { "categories status 200": (r) => r.status === 200 });
  } else if (roll < 0.45) {
    endpoint = "products_list";
    res = http.get(
      apiUrl("products?page=1&limit=12&sortBy=createdAt&sortOrder=desc"),
      { tags: { name: endpoint } },
    );
    check(res, { "products status 200": (r) => r.status === 200 });
  } else if (roll < 0.65) {
    endpoint = "discovery";
    res = http.get(apiUrl("products/discovery?limit=8"), {
      tags: { name: endpoint },
    });
    check(res, { "discovery status 200": (r) => r.status === 200 });
  } else if (roll < 0.8) {
    endpoint = "search";
    const term =
      SEARCH_TERMS[Math.floor(Math.random() * SEARCH_TERMS.length)];
    res = http.get(apiUrl(`products/search?q=${encodeURIComponent(term)}`), {
      tags: { name: endpoint },
    });
    check(res, { "search status 200": (r) => r.status === 200 });
  } else if (roll < 0.9) {
    endpoint = "product_detail";
    const productId = data.productId;
    if (!productId) {
      sleep(0.1);
      return;
    }
    res = http.get(apiUrl(`products/${productId}`), {
      tags: { name: endpoint },
    });
    check(res, { "product detail status 200": (r) => r.status === 200 });
  } else {
    endpoint = "reviews";
    const productId = data.productId;
    if (!productId) {
      sleep(0.1);
      return;
    }
    res = http.get(apiUrl(`reviews/product/${productId}?limit=20`), {
      tags: { name: endpoint },
    });
    check(res, { "reviews status 200": (r) => r.status === 200 });
  }

  recordStatus(res, endpoint);
  sleep(Math.random() * 0.4 + 0.1);
}

export function discoverProductId() {
  const res = http.get(
    apiUrl("products?limit=1&sortBy=createdAt&sortOrder=desc"),
  );
  if (res.status !== 200) {
    return { productId: __ENV.PRODUCT_ID || "" };
  }
  try {
    const body = JSON.parse(res.body);
    const productId =
      body?.data?.products?.[0]?.id || body?.products?.[0]?.id || "";
    return { productId: productId || __ENV.PRODUCT_ID || "" };
  } catch {
    return { productId: __ENV.PRODUCT_ID || "" };
  }
}
