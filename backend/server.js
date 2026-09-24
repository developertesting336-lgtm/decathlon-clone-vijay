import "dotenv/config";
if (process.env.GEMINI_API_KEY) {
  console.log("✓ Gemini 1.5 Flash AI Active (API Key loaded)");
}

import http from "http";
import app from "./app.js";

import { Server } from "socket.io";
import { initSocket } from "./socket/socketManager.js";
import jwt from "jsonwebtoken";

/*
========================================
HTTP SERVER
========================================
*/

const server = http.createServer(app);

/*
========================================
ALLOWED FRONTEND ORIGINS
========================================
*/

const allowedOrigins = [
  "https://decathlon-clone-store.vercel.app",
  "https://decathlon-clone-frontend.vercel.app",
  "https://decathlon-clone-admin.vercel.app",
  "https://decathlon-clone-vijay.vercel.app",

  // Local development
  "http://localhost:3000",
  "http://localhost:3001",
  "http://192.168.1.13:3000",
  "http://192.168.1.13:3001",
];

/*
========================================
SOCKET.IO
========================================
*/

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      /*
      Allow requests without an origin.
      Useful for Postman, server-side requests,
      mobile apps, etc.
      */
      if (!origin) {
        return callback(null, true);
      }

      if (
        allowedOrigins.includes(origin) ||
        origin.includes("localhost") ||
        origin.includes("127.0.0.1") ||
        origin.includes("192.168.") ||
        origin.includes("10.") ||
        origin.includes("vercel.app")
      ) {
        return callback(null, true);
      }

      console.log("⚠️ Unlisted Socket origin allowed:", origin);
      return callback(null, true);
    },

    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],

    credentials: true,

    transports: ["websocket", "polling"],
  },

  /*
  ========================================
  CONNECTION SETTINGS
  ========================================
  */

  transports: ["websocket", "polling"],

  pingTimeout: 60000,

  pingInterval: 25000,

  reconnection: true,
});

/*
========================================
INITIALIZE SOCKET MANAGER
========================================
*/

initSocket(io);

/*
========================================
SOCKET CONNECTION
========================================
*/

io.on("connection", (socket) => {
  console.log("✅ Socket connected:", socket.id);

  console.log("🌐 Socket origin:", socket.handshake.headers.origin);

  /*
  ========================================
  AUTHENTICATE & JOIN ROOMS
  ========================================
  */
  socket.on("authenticate", (data) => {
    try {
      const token = typeof data === "string" ? data : data?.token;
      if (!token) return;

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (!decoded?.id) return;

      socket.userId = decoded.id;
      socket.userRole = decoded.role;

      socket.join(`user_${decoded.id}`);

      if (decoded.role === "admin") {
        socket.join("admin_room");
      }

      socket.emit("authenticated", {
        userId: decoded.id,
        role: decoded.role,
      });

      console.log(`🔑 Socket ${socket.id} authenticated as ${decoded.role} (user_${decoded.id})`);
    } catch (err) {
      console.warn("⚠️ Socket authentication error:", err.message);
    }
  });

  /*
  ========================================
  DISCONNECT
  ========================================
  */

  socket.on("disconnect", (reason) => {
    console.log("❌ Socket disconnected:", socket.id, reason);
  });

  /*
  ========================================
  SOCKET ERROR
  ========================================
  */

  socket.on("error", (error) => {
    console.error("❌ Socket error:", error);
  });
});

/*
========================================
SERVER ERROR
========================================
*/

server.on("error", (error) => {
  console.error("❌ HTTP Server Error:", error);
});

// Forward express-level /socket.io requests to io.engine as fallback
app.use("/socket.io", (req, res) => {
  io.engine.handleRequest(req, res);
});

/*
========================================
START SERVER
========================================
*/

const PORT = process.env.PORT || 5000;

if (!process.env.VERCEL) {
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);

    console.log("🔌 Socket.IO server running");

    console.log("🌐 Allowed origins:");

    allowedOrigins.forEach((origin) => {
      console.log(`   - ${origin}`);
    });
  });
}

export default server;
