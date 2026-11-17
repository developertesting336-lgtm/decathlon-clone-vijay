import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, ".env") });

if (process.env.GEMINI_API_KEY) {
  console.log("✓ Gemini 1.5 Flash AI Active (API Key loaded)");
}

import app, { server, connectDB } from "./app.js";
import { syncOfferStatuses } from "./controllers/offerController.js";
import { scanAndNotifyDiscountedWishlistAndRecent } from "./services/priceDropService.js";

const PORT = process.env.PORT || 5000;

if (!process.env.VERCEL) {
  server.listen(PORT, async () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log("🔌 Socket.IO server running");
    console.log("🌐 Production allowed origins configured in app.js");

    try {
      await connectDB();
    } catch (dbErr) {
      console.warn("DB connection warning at startup:", dbErr.message);
    }

    // Initial offer status sync and discount scan on startup
    setTimeout(async () => {
      try {
        await connectDB();
        await syncOfferStatuses();
        console.log("✓ Offer statuses synchronized");
        await scanAndNotifyDiscountedWishlistAndRecent();
      } catch (err) {
        console.warn("Startup offer sync/discount scan error:", err.message);
      }
    }, 3000);

    // Periodic recurring check every 1 minute for accurate schedule transitions and discount alerts
    setInterval(async () => {
      try {
        await syncOfferStatuses();
        await scanAndNotifyDiscountedWishlistAndRecent();
      } catch (err) {
        console.warn("Periodic sync/scan error:", err.message);
      }
    }, 60 * 1000);
  });
}

export default server;
