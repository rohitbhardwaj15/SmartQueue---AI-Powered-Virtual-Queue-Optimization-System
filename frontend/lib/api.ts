import axios from "axios";

const PROD_API_URL = "https://smartqueue-api.vercel.app";

function resolveApiUrl() {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;

  if (typeof window !== "undefined") {
    const isLocalhost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
    return isLocalhost ? "http://localhost:4000" : PROD_API_URL;
  }

  return PROD_API_URL;
}

const API_URL = resolveApiUrl();

export const api = axios.create({
  baseURL: API_URL,
  timeout: 20000
});

export function getApiUrl() {
  return API_URL;
}
