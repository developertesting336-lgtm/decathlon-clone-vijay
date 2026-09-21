import "dotenv/config";
import cors from "cors";
import express from "express";
import mongoose from "mongoose";
import dns from "dns";
import path from "path";

import adminRoutes from "./routes/adminRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import wishlistRoutes from "./routes/wishlistRoutes.js";
import addressRoutes from "./routes/addressRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import bannerRoutes from "./routes/bannerRoutes.js";
import pageRoutes from "./routes/pageRoutes.js";
import pageSectionRoutes from "./routes/pageSectionRoutes.js";
import Page from "./models/Page.js";
import { migratePageSections } from "./services/migratePageSections.js";

import registrationRoutes from "./routes/registrationRoutes.js";
import loginRoutes from "./routes/loginRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import emailRoutes from "./routes/emailRoutes.js";
import { seedAiKnowledge } from "./seedAiKnowledge.js";

/*
========================================
DNS
========================================
*/

try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (error) {
  console.warn("Could not set custom DNS servers:", error.message);
}

const app = express();

/*
========================================
CORS
========================================
*/

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin or any localhost/vercel domain
      if (!origin || origin.includes("localhost") || origin.includes("127.0.0.1") || origin.includes("vercel.app")) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

/*
========================================
BODY PARSER
========================================
*/

app.use(express.json({ limit: "50mb" }));

app.use(
  express.urlencoded({
    limit: "50mb",
    extended: true,
  }),
);

/*
========================================
STATIC FILES
========================================
*/

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

/*
========================================
DATABASE
========================================
*/

let mongoPromise = null;

const defaultPages = [
  { name: "Home", slug: "home", description: "Main store homepage" },
  { name: "Monsoon Essentials", slug: "monsoon-essentials", description: "Monsoon gear and rainwear collection" },
  { name: "Activewear", slug: "activewear", description: "Fitness and training activewear" },
  { name: "Workout Essentials", slug: "workout-essentials", description: "Gym equipment and workout gear" },
  { name: "Cycling", slug: "cycling", description: "Bikes, helmets, and cycling gear" },
  { name: "Hiking & Trekking", slug: "hiking-trekking", description: "Trekking poles, tents, and hiking boots" },
  { name: "Shoes", slug: "shoes", description: "Running, sports, and casual footwear" },
  { name: "Bags & Backpacks", slug: "bags-backpacks", description: "Backpacks, duffle bags, and travel gear" },
  { name: "Sports Accessories", slug: "sports-accessories", description: "Water bottles, caps, socks, and accessories" },
];

const seedPagesIfEmpty = async () => {
  try {
    for (const p of defaultPages) {
      const exists = await Page.findOne({ slug: p.slug });
      if (!exists) {
        await Page.create({
          name: p.name,
          slug: p.slug,
          description: p.description,
          sections: [],
        });
      }
    }
  } catch (err) {
    console.error("Seed Pages Error:", err);
  }
};

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  if (!mongoPromise) {
    mongoPromise = mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 10,
    });
  }

  await mongoPromise;

  console.log("MongoDB Connected");
  await seedPagesIfEmpty();
  await migratePageSections();
  await seedAiKnowledge();
};

/*
========================================
DATABASE MIDDLEWARE
========================================
*/

app.use(async (req, res, next) => {
  try {
    await connectDB();

    next();
  } catch (error) {
    console.error("MongoDB Connection Error:", error.message);

    return res.status(500).json({
      message: "Database connection failed",
    });
  }
});

/*
========================================
API ROUTES
========================================
*/

app.use("/api/auth", adminRoutes);
app.use("/auth", adminRoutes);

app.use("/api/categories", categoryRoutes);

app.use("/api/products", productRoutes);

app.use("/api/cart", cartRoutes);

app.use("/api/wishlist", wishlistRoutes);

app.use("/api/addresses", addressRoutes);

app.use("/api/orders", orderRoutes);

app.use("/api/payment", paymentRoutes);

app.use("/api/banners", bannerRoutes);

app.use("/api/pages", pageRoutes);
app.use("/api/sections", pageSectionRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/email", emailRoutes);

/*
========================================
USER REGISTRATION
========================================
*/

app.use("/api/registration", registrationRoutes);

/*
========================================
USER LOGIN
========================================
*/

app.use("/api/login", loginRoutes);
app.use("/api/user", userRoutes);

/*
========================================
DEFAULT ROUTE
========================================
*/

app.get("/", (req, res) => {
  res.send("Decathlon Backend Running");
});

/*
========================================
EXPORT APP
========================================
*/

export default app;
