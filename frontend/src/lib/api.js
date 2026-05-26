import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Single configured axios instance. No credentials needed (auth removed).
const api = axios.create({
  baseURL: API_URL,
  timeout: 60000,
});

export default api;
export { API_URL };
