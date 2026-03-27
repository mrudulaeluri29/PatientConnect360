import axios from "axios";

// In production, require VITE_API_URL (backend host). In dev, default to localhost.
const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://localhost:4000" : window.location.origin);

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // send/receive cookies for login session
});

//Axios is the library that will let the React app talk to your Express backend.
