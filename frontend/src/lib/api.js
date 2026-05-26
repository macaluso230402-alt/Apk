import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Single configured axios instance that always sends cookies
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

export default api;
export { API_URL };
