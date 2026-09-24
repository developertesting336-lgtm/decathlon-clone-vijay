import { io } from "socket.io-client";

const getSocketURL = () => {
  if (
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname.startsWith("192.168."))
  ) {
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

const socket = io(getSocketURL(), {
  transports: ["websocket", "polling"],
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
});

export default socket;
