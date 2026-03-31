import axios from "axios";

const envUrl = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "");

// Dev: prefer same-origin requests so Vite's proxy (vite.config → /api → localhost:4000) is used.
// Setting VITE_API_URL to the local API host bypasses the proxy (cross-origin 5173→4000) and can
// cause POST requests to lose the session cookie (401 Unauthorized) while GET still appears to work.
// In dev, omit VITE_API_URL or point it at a remote API only. Production: set VITE_API_URL to your API host.
const isLocalDevApi =
  envUrl === "http://localhost:4000" || envUrl === "http://127.0.0.1:4000";

const API_URL = import.meta.env.DEV
  ? envUrl && !isLocalDevApi
    ? envUrl
    : ""
  : envUrl || window.location.origin;

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // send/receive cookies for login session
});

//Axios is the library that will let the React app talk to your Express backend.
