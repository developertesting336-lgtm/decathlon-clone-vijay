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
  if (
    process.env.REACT_APP_API_URL &&
    !process.env.REACT_APP_API_URL.includes("decathlon-clone-pi")
  ) {
    return process.env.REACT_APP_API_URL;
  }
  return "https://decathlon-clone-backend.onrender.com/api";
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

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const reqUrl = error.config?.url || "";
    if ((status === 401 || status === 403) && !reqUrl.includes("/auth/login")) {
      localStorage.removeItem("adminToken");
      localStorage.removeItem("adminUser");
      if (typeof window !== "undefined" && window.location.pathname !== "/") {
        window.location.href = "/";
      }
    }
    return Promise.reject(error);
  },
);

export default api;
