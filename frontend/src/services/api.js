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
    const hadToken = !!localStorage.getItem('kpos_token');
    const alreadyAtRoot = window.location.pathname === '/';

    if (error.response?.status === 401) {
      localStorage.removeItem('kpos_token');
      localStorage.removeItem('kpos_user');

      // Only force a reload if there was an actual session to expire, and
      // only if we are not already sitting at the root. Without these two
      // checks, a 401 fired by a request made before login (or with a
      // token that never becomes valid) forces a reload, which re-mounts
      // the app, which fires the same request again, forever.
      if (hadToken && !alreadyAtRoot) {
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export default api;