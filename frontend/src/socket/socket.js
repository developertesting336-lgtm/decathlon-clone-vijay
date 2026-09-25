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

  return "https://decathlon-clone-backend.onrender.com";
};

// Render.com supports WebSockets natively — use websocket first, polling as fallback.
const socket = io(getSocketURL(), {
  transports: ["websocket", "polling"],
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 15,
  reconnectionDelay: 2000,
  timeout: 20000,
});

const authenticateSocket = () => {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (token && socket.connected) {
    socket.emit("authenticate", { token });
  }
};

socket.on("connect", () => {
  authenticateSocket();
});

if (typeof window !== "undefined") {
  window.addEventListener("authChanged", authenticateSocket);
}

export default socket;