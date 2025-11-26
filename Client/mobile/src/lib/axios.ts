import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// API configuration for mobile
// For Android emulator: use 10.0.2.2 instead of localhost
// For iOS simulator: use localhost
// For physical device: use your computer's IP address (e.g., 192.168.1.x)
const API_URL = __DEV__ 
  ? 'http://10.0.2.2:4000' // Android emulator
  : 'https://api.medihealth.com'; // Production - update this

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
  withCredentials: true, // For cookie-based auth
});

// Request interceptor
api.interceptors.request.use(
  async (config) => {
    // Cookies are handled automatically with withCredentials: true
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle errors globally
    return Promise.reject(error);
  }
);

export default api;

