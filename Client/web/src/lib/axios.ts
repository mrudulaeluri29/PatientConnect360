import axios from "axios";

// Default to localhost:4000 if VITE_API_URL is not set
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // send/receive cookies for login session
});

//Axios is the library that will let the React app talk to your Express backend.
