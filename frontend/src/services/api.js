import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://kpos-backend-node.onrender.com/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('kpos_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('kpos_token');
      localStorage.removeItem('kpos_user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export default api;