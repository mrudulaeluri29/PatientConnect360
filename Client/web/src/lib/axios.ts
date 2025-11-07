import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true, // send/receive cookies for login session
});

//Axios is the library that will let the React app talk to your Express backend.
