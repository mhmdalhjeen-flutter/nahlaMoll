export const BASE_URL = __ENV.BASE_URL || "http://localhost:3001";
export const API_PREFIX = __ENV.API_PREFIX || "api";

export const SEARCH_TERMS = [
  "شاحن",
  "هاتف",
  "خضار",
  "ملابس",
  "الكترونيات",
];

export function apiUrl(path) {
  const normalized = path.startsWith("/") ? path.slice(1) : path;
  return `${BASE_URL}/${API_PREFIX}/${normalized}`;
}

export function rootUrl(path) {
  const normalized = path.startsWith("/") ? path.slice(1) : path;
  return `${BASE_URL}/${normalized}`;
}
