import axios from "axios";

const getBaseURL = () => {
  if (
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname.startsWith("192.168."))
  ) {
    return `http://${window.location.hostname}:5000/api`;
  }
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  return "https://decathlon-clone-pi.vercel.app/api";
};

const api = axios.create({
  baseURL: getBaseURL(),
});

/*
========================================
AUTH TOKEN & FORM DATA INTERCEPTOR
========================================
*/

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("adminToken");

    /*
    Do NOT send token on login
    */
    if (token && !config.url?.includes("/auth/login")) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    /*
    Allow browser to set multipart/form-data boundary automatically
    */
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

export default api;
