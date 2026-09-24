import "dotenv/config";
if (process.env.GEMINI_API_KEY) {
  console.log("✓ Gemini 1.5 Flash AI Active (API Key loaded)");
}

import app, { server } from "./app.js";

const PORT = process.env.PORT || 5000;

if (!process.env.VERCEL) {
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log("🔌 Socket.IO server running");
    console.log("🌐 Production allowed origins configured in app.js");
  });
}

export default server;
