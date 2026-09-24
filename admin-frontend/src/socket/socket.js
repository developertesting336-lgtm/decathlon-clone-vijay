import { io } from "socket.io-client";

const isLocalhost =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname.startsWith("192.168."));

const getSocketURL = () => {
  if (isLocalhost) {
    return `http://${window.location.hostname}:5000`;
  }

  if (
    process.env.REACT_APP_SOCKET_URL &&
    !process.env.REACT_APP_SOCKET_URL.includes("decathlon-clone-pi")
  ) {
    return process.env.REACT_APP_SOCKET_URL;
  }

  if (
    process.env.REACT_APP_API_URL &&
    !process.env.REACT_APP_API_URL.includes("decathlon-clone-pi")
  ) {
    return process.env.REACT_APP_API_URL.replace(/\/api\/?$/, "");
  }

  return "https://decathlon-clone-backend.vercel.app";
};

// Vercel serverless does NOT support WebSocket upgrades (returns 400).
// Use polling-only in production; websocket is fine on localhost.
const socket = io(getSocketURL(), {
  transports: isLocalhost ? ["websocket", "polling"] : ["polling"],
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 15,
  reconnectionDelay: 2000,
  timeout: 20000,
});

export default socket;
