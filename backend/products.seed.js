import dns from "dns";
import mongoose from "mongoose";
import dotenv from "dotenv";
import Product from "./models/Product.js";
import Category from "./models/Category.js";

// Ensure robust SRV DNS resolution on Windows
try {
  dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
} catch (e) {
  // Ignore if not supported
}

dotenv.config();

/*
=========================================================
CATEGORY DEFAULT IMAGES MAP
Provides high quality sports gear images when seeding
=========================================================
*/
const CATEGORY_IMAGES = {
  shoes: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80",
  running: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80",
  football: "https://images.unsplash.com/photo-1511886929837-354d827aae26?w=800&q=80",
  gym: "https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=800&q=80",
  cycling: "https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800&q=80",
  tshirt: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&q=80",
  shorts: "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=800&q=80",
  pants: "https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=800&q=80",
  jacket: "https://images.unsplash.com/photo-1544441893-675973e31985?w=800&q=80",
  bag: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80",
  tent: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&q=80",
  accessories: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&q=80",
  default: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&q=80",
};

function getProductImage(productName, categoryName) {
  const text = `${productName} ${categoryName}`.toLowerCase();
  if (text.includes("shoe") || text.includes("footwear") || text.includes("sandal") || text.includes("flipflop") || text.includes("boot")) {
    return [CATEGORY_IMAGES.shoes];
  }
  if (text.includes("t-shirt") || text.includes("tshirt") || text.includes("top") || text.includes("polo")) {
    return [CATEGORY_IMAGES.tshirt];
  }
  if (text.includes("short")) {
    return [CATEGORY_IMAGES.shorts];
  }
  if (text.includes("pant") || text.includes("trouser") || text.includes("legging") || text.includes("trackpant")) {
    return [CATEGORY_IMAGES.pants];
  }
  if (text.includes("jacket") || text.includes("fleece") || text.includes("vest")) {
    return [CATEGORY_IMAGES.jacket];
  }
  if (text.includes("bag") || text.includes("backpack") || text.includes("rucksack") || text.includes("pouch") || text.includes("tote")) {
    return [CATEGORY_IMAGES.bag];
  }
  if (text.includes("tent") || text.includes("camping")) {
    return [CATEGORY_IMAGES.tent];
  }
  if (text.includes("dumbbell") || text.includes("kettlebell") || text.includes("gym") || text.includes("weight") || text.includes("bench") || text.includes("band")) {
    return [CATEGORY_IMAGES.gym];
  }
  if (text.includes("football") || text.includes("ball")) {
    return [CATEGORY_IMAGES.football];
  }
  if (text.includes("cycle") || text.includes("cycling") || text.includes("helmet")) {
    return [CATEGORY_IMAGES.cycling];
  }
  return [CATEGORY_IMAGES.default];
}

const productsData = {
  "Running Shoes": [
    {
      name: "Men's Running Shoes Run 100",
      description: "Lightweight running shoes designed for everyday jogging and running.",
      price: 1999,
      discountPrice: 1599,
      stock: 100,
      gender: "Men",
      size: ["6", "7", "8", "9", "10"],
      color: ["Black", "Blue", "Grey"],
      review: 4.4,
    },
    {
      name: "Women's Running Shoes Run Active",
      description: "Comfortable and lightweight running shoes for daily training.",
      price: 2299,
      discountPrice: 1849,
      stock: 80,
      gender: "Women",
      size: ["4", "5", "6", "7", "8"],
      color: ["Pink", "Black", "White"],
      review: 4.5,
    },
    {
      name: "Kids Running Shoes Active",
      description: "Comfortable sports shoes for kids during running and outdoor activities.",
      price: 1499,
      discountPrice: 1199,
      stock: 70,
      gender: "Kids",
      size: ["1", "2", "3", "4"],
      color: ["Blue", "Red", "Black"],
      review: 4.2,
    },
  ],

  "Running Flick. Pocket. Win": [
    {
      name: "Running Phone Pocket Shorts",
      description: "Lightweight running shorts with a secure pocket for your phone.",
      price: 999,
      discountPrice: 799,
      stock: 100,
      gender: "Men",
      size: ["S", "M", "L", "XL"],
      color: ["Black", "Navy"],
      review: 4.3,
    },
  ],

  "Stay Seen": [
    {
      name: "High Visibility Running Vest",
      description: "Reflective running vest designed to improve visibility during low-light runs.",
      price: 899,
      discountPrice: 699,
      stock: 60,
      gender: "Unisex",
      size: ["S", "M", "L", "XL"],
      color: ["Yellow", "Orange"],
      review: 4.5,
    },
  ],

  "Pick Your Color. Own the Pavement": [
    {
      name: "Colorful Running T-Shirt",
      description: "Breathable sports t-shirt designed for comfortable running sessions.",
      price: 799,
      discountPrice: 599,
      stock: 120,
      gender: "Unisex",
      size: ["S", "M", "L", "XL"],
      color: ["Blue", "Green", "Red", "Black"],
      review: 4.4,
    },
  ],

  "Fitness Tshirt": [
    {
      name: "Men's Fitness T-Shirt Dry",
      description: "Breathable quick-dry t-shirt suitable for gym and fitness training.",
      price: 799,
      discountPrice: 599,
      stock: 150,
      gender: "Men",
      size: ["S", "M", "L", "XL", "XXL"],
      color: ["Black", "White", "Blue"],
      review: 4.5,
    },
    {
      name: "Women's Fitness T-Shirt",
      description: "Lightweight breathable t-shirt for workouts and fitness activities.",
      price: 799,
      discountPrice: 649,
      stock: 120,
      gender: "Women",
      size: ["XS", "S", "M", "L", "XL"],
      color: ["Pink", "Black", "Purple"],
      review: 4.4,
    },
  ],

  "Fitness Shorts": [
    {
      name: "Men's Training Shorts",
      description: "Lightweight training shorts with comfortable stretch fabric.",
      price: 899,
      discountPrice: 699,
      stock: 100,
      gender: "Men",
      size: ["S", "M", "L", "XL"],
      color: ["Black", "Grey", "Blue"],
      review: 4.3,
    },
    {
      name: "Women's Fitness Shorts",
      description: "Comfortable sports shorts designed for gym and fitness training.",
      price: 799,
      discountPrice: 599,
      stock: 100,
      gender: "Women",
      size: ["XS", "S", "M", "L"],
      color: ["Black", "Pink", "Purple"],
      review: 4.4,
    },
  ],

  "Fitness Trackpants": [
    {
      name: "Men's Training Trackpants",
      description: "Comfortable trackpants suitable for gym, running and training.",
      price: 1299,
      discountPrice: 999,
      stock: 100,
      gender: "Men",
      size: ["S", "M", "L", "XL", "XXL"],
      color: ["Black", "Grey", "Navy"],
      review: 4.4,
    },
    {
      name: "Women's Training Trackpants",
      description: "Stretchable trackpants designed for comfortable fitness workouts.",
      price: 1299,
      discountPrice: 999,
      stock: 80,
      gender: "Women",
      size: ["XS", "S", "M", "L", "XL"],
      color: ["Black", "Grey"],
      review: 4.5,
    },
  ],

  "Football": [
    {
      name: "Football Training Ball Size 5",
      description: "Durable football designed for training and recreational matches.",
      price: 999,
      discountPrice: 799,
      stock: 120,
      gender: "Unisex",
      size: ["5"],
      color: ["White", "Blue"],
      review: 4.5,
    },
    {
      name: "Football Match Ball",
      description: "High-quality football suitable for competitive matches and training.",
      price: 1499,
      discountPrice: 1199,
      stock: 70,
      gender: "Unisex",
      size: ["5"],
      color: ["White", "Black"],
      review: 4.6,
    },
    {
      name: "Kids Football Size 3",
      description: "Lightweight football designed for young players.",
      price: 699,
      discountPrice: 549,
      stock: 100,
      gender: "Kids",
      size: ["3"],
      color: ["Blue", "Red"],
      review: 4.3,
    },
  ],

  "Football Shoes": [
    {
      name: "Men's Football Stud Shoes",
      description: "Football shoes with durable studs for improved grip on the pitch.",
      price: 2499,
      discountPrice: 1999,
      stock: 80,
      gender: "Men",
      size: ["6", "7", "8", "9", "10"],
      color: ["Black", "White"],
      review: 4.5,
    },
    {
      name: "Kids Football Shoes",
      description: "Comfortable football shoes designed for young players.",
      price: 1799,
      discountPrice: 1399,
      stock: 60,
      gender: "Kids",
      size: ["1", "2", "3", "4"],
      color: ["Blue", "Black"],
      review: 4.3,
    },
  ],

  "Gym Equipment": [
    {
      name: "Adjustable Dumbbell Set 10kg",
      description: "Adjustable dumbbell set suitable for strength training at home.",
      price: 1999,
      discountPrice: 1699,
      stock: 50,
      gender: "Unisex",
      size: ["10kg"],
      color: ["Black"],
      review: 4.6,
    },
    {
      name: "Kettlebell 8kg",
      description: "Durable kettlebell for strength, conditioning and functional workouts.",
      price: 1299,
      discountPrice: 1099,
      stock: 60,
      gender: "Unisex",
      size: ["8kg"],
      color: ["Black"],
      review: 4.5,
    },
    {
      name: "Adjustable Dumbbell Set 20kg",
      description: "Adjustable dumbbell set for strength training and home workouts.",
      price: 2999,
      discountPrice: 2499,
      stock: 50,
      gender: "Unisex",
      size: ["20kg"],
      color: ["Black"],
      review: 4.6,
    },
    {
      name: "Kettlebell 12kg",
      description: "Durable kettlebell for strength, conditioning and functional workouts.",
      price: 1799,
      discountPrice: 1499,
      stock: 60,
      gender: "Unisex",
      size: ["12kg"],
      color: ["Black"],
      review: 4.5,
    },
    {
      name: "Weight Training Bench",
      description: "Sturdy workout bench for home strength training exercises.",
      price: 4999,
      discountPrice: 4199,
      stock: 25,
      gender: "Unisex",
      size: ["Standard"],
      color: ["Black", "Grey"],
      review: 4.4,
    },
  ],

  "Dumbbells, Kettlebells & More": [
    {
      name: "Hex Dumbbell 5kg",
      description: "Compact hex dumbbell suitable for strength training and fitness workouts.",
      price: 999,
      discountPrice: 799,
      stock: 100,
      gender: "Unisex",
      size: ["5kg"],
      color: ["Black"],
      review: 4.5,
    },
    {
      name: "Hex Dumbbell 10kg",
      description: "Heavy-duty dumbbell designed for strength and muscle training.",
      price: 1799,
      discountPrice: 1499,
      stock: 70,
      gender: "Unisex",
      size: ["10kg"],
      color: ["Black"],
      review: 4.6,
    },
  ],

  "Elastic band": [
    {
      name: "Resistance Elastic Band Light",
      description: "Light resistance band for stretching, mobility and beginner workouts.",
      price: 299,
      discountPrice: 249,
      stock: 150,
      gender: "Unisex",
      size: ["Light"],
      color: ["Yellow"],
      review: 4.3,
    },
    {
      name: "Resistance Elastic Band Heavy",
      description: "Heavy resistance band for strength and advanced training.",
      price: 499,
      discountPrice: 399,
      stock: 120,
      gender: "Unisex",
      size: ["Heavy"],
      color: ["Black"],
      review: 4.5,
    },
  ],

  "Gym accessories": [
    {
      name: "Gym Training Gloves",
      description: "Comfortable training gloves providing grip and protection during workouts.",
      price: 599,
      discountPrice: 449,
      stock: 120,
      gender: "Unisex",
      size: ["S", "M", "L", "XL"],
      color: ["Black", "Grey"],
      review: 4.4,
    },
    {
      name: "Resistance Training Band",
      description: "Elastic resistance band for strength and mobility exercises.",
      price: 499,
      discountPrice: 399,
      stock: 150,
      gender: "Unisex",
      size: ["Light", "Medium", "Heavy"],
      color: ["Yellow", "Red", "Black"],
      review: 4.5,
    },
    {
      name: "Training Gym Gloves",
      description: "Comfortable workout gloves providing grip and hand protection.",
      price: 599,
      discountPrice: 449,
      stock: 150,
      gender: "Unisex",
      size: ["S", "M", "L", "XL"],
      color: ["Black", "Grey"],
      review: 4.4,
    },
    {
      name: "Workout Wrist Support",
      description: "Wrist support designed for weight training and gym workouts.",
      price: 499,
      discountPrice: 399,
      stock: 100,
      gender: "Unisex",
      size: ["S", "M", "L"],
      color: ["Black"],
      review: 4.3,
    },
  ],

  "Skipping Rope": [
    {
      name: "Speed Skipping Rope",
      description: "Lightweight skipping rope designed for cardio and fitness training.",
      price: 399,
      discountPrice: 299,
      stock: 200,
      gender: "Unisex",
      size: ["Standard"],
      color: ["Black", "Red"],
      review: 4.4,
    },
    {
      name: "Weighted Skipping Rope",
      description: "Weighted skipping rope for intense cardio and endurance training.",
      price: 699,
      discountPrice: 549,
      stock: 100,
      gender: "Unisex",
      size: ["Standard"],
      color: ["Black"],
      review: 4.3,
    },
  ],

  "Strength training Accessories": [
    {
      name: "Lifting Straps",
      description: "Durable lifting straps designed to improve grip during strength training.",
      price: 399,
      discountPrice: 299,
      stock: 120,
      gender: "Unisex",
      size: ["Standard"],
      color: ["Black"],
      review: 4.4,
    },
    {
      name: "Weight Lifting Belt",
      description: "Supportive training belt designed for heavy lifting and strength workouts.",
      price: 999,
      discountPrice: 799,
      stock: 80,
      gender: "Unisex",
      size: ["M", "L", "XL"],
      color: ["Black"],
      review: 4.5,
    },
  ],

  "Boxing equipment": [
    {
      name: "Boxing Training Gloves 10oz",
      description: "Padded boxing gloves suitable for training and fitness boxing.",
      price: 1299,
      discountPrice: 999,
      stock: 80,
      gender: "Unisex",
      size: ["10oz"],
      color: ["Black", "Red"],
      review: 4.5,
    },
    {
      name: "Punching Bag 20kg",
      description: "Durable punching bag for boxing, cardio and combat training.",
      price: 3999,
      discountPrice: 3299,
      stock: 30,
      gender: "Unisex",
      size: ["20kg"],
      color: ["Black", "Red"],
      review: 4.6,
    },
  ],

  "Waterbottles & Sippers": [
    {
      name: "Sports Water Bottle 1L",
      description: "Reusable sports bottle suitable for gym, running and outdoor activities.",
      price: 399,
      discountPrice: 299,
      stock: 200,
      gender: "Unisex",
      size: ["1L"],
      color: ["Blue", "Black", "Red"],
      review: 4.5,
    },
    {
      name: "Sports Sipper Bottle 750ml",
      description: "Easy-to-carry sipper bottle designed for sports and fitness activities.",
      price: 349,
      discountPrice: 279,
      stock: 180,
      gender: "Unisex",
      size: ["750ml"],
      color: ["Black", "Blue", "Green"],
      review: 4.4,
    },
  ],

  "Yoga mats": [
    {
      name: "Yoga Mat 6mm Comfort",
      description: "Non-slip yoga mat providing comfort and stability during yoga sessions.",
      price: 699,
      discountPrice: 549,
      stock: 150,
      gender: "Unisex",
      size: ["6mm"],
      color: ["Purple", "Blue", "Black"],
      review: 4.6,
    },
    {
      name: "Premium Yoga Mat 8mm",
      description: "Extra-cushioned yoga mat suitable for yoga, stretching and floor exercises.",
      price: 999,
      discountPrice: 799,
      stock: 100,
      gender: "Unisex",
      size: ["8mm"],
      color: ["Purple", "Green", "Blue"],
      review: 4.7,
    },
  ],

  "Leggings": [
    {
      name: "Women's Yoga Leggings",
      description: "Stretchable and comfortable leggings for yoga, fitness and everyday workouts.",
      price: 999,
      discountPrice: 799,
      stock: 120,
      gender: "Women",
      size: ["XS", "S", "M", "L", "XL"],
      color: ["Black", "Purple", "Blue"],
      review: 4.5,
    },
  ],

  "Gym & Duffle Bags": [
    {
      name: "Essential Gym Duffle Bag 40L",
      description: "Spacious duffle bag with multiple compartments for gym essentials.",
      price: 1499,
      discountPrice: 1199,
      stock: 100,
      gender: "Unisex",
      size: ["40L"],
      color: ["Black", "Grey", "Blue"],
      review: 4.5,
    },
    {
      name: "Large Sports Duffle Bag 60L",
      description: "Large capacity sports bag suitable for gym, travel and training equipment.",
      price: 1999,
      discountPrice: 1599,
      stock: 70,
      gender: "Unisex",
      size: ["60L"],
      color: ["Black", "Navy"],
      review: 4.6,
    },
  ],

  "Backpacks & Rucksacks": [
    {
      name: "Trekking Backpack 40L",
      description: "Spacious trekking backpack with multiple compartments for outdoor trips.",
      price: 2499,
      discountPrice: 1999,
      stock: 60,
      gender: "Unisex",
      size: ["40L"],
      color: ["Black", "Green"],
      review: 4.7,
    },
    {
      name: "Hiking Backpack 20L",
      description: "Compact backpack suitable for day hikes and outdoor activities.",
      price: 1499,
      discountPrice: 1199,
      stock: 90,
      gender: "Unisex",
      size: ["20L"],
      color: ["Black", "Blue"],
      review: 4.5,
    },
  ],

  "Gym Bags": [
    {
      name: "Compact Gym Bag 25L",
      description: "Compact sports bag for gym clothes, shoes and everyday essentials.",
      price: 999,
      discountPrice: 799,
      stock: 100,
      gender: "Unisex",
      size: ["25L"],
      color: ["Black", "Grey"],
      review: 4.4,
    },
  ],

  "Trekking Bags": [
    {
      name: "Trekking Backpack 50L",
      description: "Large trekking backpack designed for multi-day outdoor adventures.",
      price: 2999,
      discountPrice: 2499,
      stock: 50,
      gender: "Unisex",
      size: ["50L"],
      color: ["Green", "Black"],
      review: 4.7,
    },
  ],

  "Rucksacks": [
    {
      name: "Travel Rucksack 30L",
      description: "Durable rucksack suitable for travel, hiking and daily outdoor use.",
      price: 1999,
      discountPrice: 1599,
      stock: 70,
      gender: "Unisex",
      size: ["30L"],
      color: ["Black", "Blue"],
      review: 4.5,
    },
  ],

  "Tote Bags": [
    {
      name: "Everyday Sports Tote Bag",
      description: "Lightweight reusable tote bag for everyday shopping and sports essentials.",
      price: 599,
      discountPrice: 449,
      stock: 120,
      gender: "Women",
      size: ["Standard"],
      color: ["Black", "Blue", "White"],
      review: 4.3,
    },
  ],

  "Laptop Bags": [
    {
      name: "15 Inch Laptop Backpack",
      description: "Protective laptop backpack with dedicated compartments for everyday use.",
      price: 1799,
      discountPrice: 1399,
      stock: 80,
      gender: "Unisex",
      size: ["15 inch"],
      color: ["Black", "Grey"],
      review: 4.5,
    },
  ],

  "Football Bags": [
    {
      name: "Football Boot Bag",
      description: "Compact football bag designed to carry boots and sports accessories.",
      price: 699,
      discountPrice: 549,
      stock: 100,
      gender: "Unisex",
      size: ["Standard"],
      color: ["Black", "Blue"],
      review: 4.4,
    },
  ],

  "Badminton Bags": [
    {
      name: "Badminton Racket Bag 3R",
      description: "Compact racket bag designed to carry badminton rackets and accessories.",
      price: 999,
      discountPrice: 799,
      stock: 80,
      gender: "Unisex",
      size: ["3 Rackets"],
      color: ["Black", "Blue"],
      review: 4.5,
    },
  ],

  "Skating Bags": [
    {
      name: "Skating Gear Backpack",
      description: "Sports backpack with space for skates, protective gear and accessories.",
      price: 1299,
      discountPrice: 999,
      stock: 60,
      gender: "Unisex",
      size: ["25L"],
      color: ["Black", "Blue"],
      review: 4.4,
    },
  ],

  "Golf Bags": [
    {
      name: "Golf Club Carry Bag",
      description: "Lightweight golf bag designed for carrying clubs and essential accessories.",
      price: 2999,
      discountPrice: 2499,
      stock: 40,
      gender: "Unisex",
      size: ["Standard"],
      color: ["Black", "Green"],
      review: 4.5,
    },
  ],

  "Running Bags": [
    {
      name: "Running Waist Bag",
      description: "Compact running bag for carrying phone, keys and small essentials.",
      price: 499,
      discountPrice: 399,
      stock: 150,
      gender: "Unisex",
      size: ["Standard"],
      color: ["Black", "Blue"],
      review: 4.4,
    },
  ],

  "Basketball Bags": [
    {
      name: "Basketball Carry Bag",
      description: "Durable sports bag for carrying basketball equipment and accessories.",
      price: 999,
      discountPrice: 799,
      stock: 70,
      gender: "Unisex",
      size: ["Standard"],
      color: ["Black", "Blue"],
      review: 4.3,
    },
  ],

  "Tennis Bags": [
    {
      name: "Tennis Racket Bag 6R",
      description: "Spacious tennis racket bag with dedicated racket compartments.",
      price: 1799,
      discountPrice: 1399,
      stock: 60,
      gender: "Unisex",
      size: ["6 Rackets"],
      color: ["Black", "Blue"],
      review: 4.6,
    },
  ],

  "Microfibre Towels": [
    {
      name: "Sports Microfibre Towel",
      description: "Quick-drying lightweight towel suitable for gym, running and travel.",
      price: 399,
      discountPrice: 299,
      stock: 200,
      gender: "Unisex",
      size: ["Standard"],
      color: ["Blue", "Grey", "Black"],
      review: 4.5,
    },
  ],

  "Sports Sunglasses": [
    {
      name: "UV Protection Sports Sunglasses",
      description: "Lightweight sports sunglasses with UV protection for outdoor activities.",
      price: 999,
      discountPrice: 799,
      stock: 100,
      gender: "Unisex",
      size: ["Standard"],
      color: ["Black", "Blue"],
      review: 4.4,
    },
  ],

  "Waist Bags & Pouches": [
    {
      name: "Running Waist Pouch",
      description: "Compact waist pouch for carrying phone, keys and personal essentials.",
      price: 499,
      discountPrice: 399,
      stock: 150,
      gender: "Unisex",
      size: ["Standard"],
      color: ["Black", "Grey"],
      review: 4.4,
    },
  ],

  "Lifting Supports": [
    {
      name: "Knee Support for Weight Training",
      description: "Supportive knee sleeves designed for gym and strength training.",
      price: 799,
      discountPrice: 599,
      stock: 100,
      gender: "Unisex",
      size: ["M", "L", "XL"],
      color: ["Black"],
      review: 4.5,
    },
  ],

  "Bars & Gels": [
    {
      name: "Energy Bar Pack",
      description: "Convenient energy snack suitable for sports and outdoor activities.",
      price: 499,
      discountPrice: 399,
      stock: 100,
      gender: "Unisex",
      size: ["Pack"],
      color: ["Mixed"],
      review: 4.3,
    },
  ],

  "Kids Sunglasses": [
    {
      name: "Kids UV Protection Sunglasses",
      description: "Lightweight sunglasses designed to protect children's eyes during outdoor activities.",
      price: 599,
      discountPrice: 449,
      stock: 100,
      gender: "Kids",
      size: ["Kids"],
      color: ["Blue", "Pink", "Black"],
      review: 4.4,
    },
  ],

  "All Gloves": [
    {
      name: "Multi Sport Training Gloves",
      description: "Comfortable gloves suitable for gym and outdoor sports activities.",
      price: 599,
      discountPrice: 449,
      stock: 120,
      gender: "Unisex",
      size: ["S", "M", "L", "XL"],
      color: ["Black", "Grey"],
      review: 4.4,
    },
  ],

  "Shoes Laces & Insoles": [
    {
      name: "Replacement Sports Shoe Laces",
      description: "Durable replacement laces suitable for sports and casual shoes.",
      price: 199,
      discountPrice: 149,
      stock: 200,
      gender: "Unisex",
      size: ["Standard"],
      color: ["Black", "White"],
      review: 4.2,
    },
    {
      name: "Comfort Sports Insoles",
      description: "Cushioned replacement insoles designed for everyday comfort.",
      price: 499,
      discountPrice: 399,
      stock: 150,
      gender: "Unisex",
      size: ["6", "7", "8", "9", "10"],
      color: ["Grey"],
      review: 4.4,
    },
  ],

  "Men trousers": [
    {
      name: "Men's Regular Fit Trousers",
      description: "Comfortable regular fit trousers suitable for everyday wear and travel.",
      price: 1299,
      discountPrice: 999,
      stock: 100,
      gender: "Men",
      size: ["30", "32", "34", "36", "38"],
      color: ["Black", "Navy", "Beige"],
      review: 4.4,
    },
    {
      name: "Men's Stretch Trousers",
      description: "Stretchable trousers designed for comfort during everyday activities.",
      price: 1499,
      discountPrice: 1199,
      stock: 80,
      gender: "Men",
      size: ["30", "32", "34", "36", "38"],
      color: ["Black", "Grey"],
      review: 4.5,
    },
  ],

  "Men Shorts": [
    {
      name: "Men's Sports Shorts",
      description: "Lightweight shorts designed for running, training and fitness.",
      price: 799,
      discountPrice: 599,
      stock: 120,
      gender: "Men",
      size: ["S", "M", "L", "XL"],
      color: ["Black", "Blue", "Grey"],
      review: 4.4,
    },
    {
      name: "Men's Training Shorts",
      description: "Comfortable quick-dry shorts for gym and outdoor sports.",
      price: 899,
      discountPrice: 699,
      stock: 100,
      gender: "Men",
      size: ["S", "M", "L", "XL"],
      color: ["Black", "Navy"],
      review: 4.5,
    },
  ],

  "Men T-shirt": [
    {
      name: "Men's Essential Sports T-Shirt",
      description: "Breathable lightweight t-shirt suitable for sports and everyday activities.",
      price: 799,
      discountPrice: 599,
      stock: 150,
      gender: "Men",
      size: ["S", "M", "L", "XL", "XXL"],
      color: ["Black", "White", "Blue", "Grey"],
      review: 4.5,
    },
    {
      name: "Men's Quick Dry T-Shirt",
      description: "Quick-drying t-shirt designed for comfortable workouts and training.",
      price: 999,
      discountPrice: 799,
      stock: 120,
      gender: "Men",
      size: ["S", "M", "L", "XL"],
      color: ["Black", "Red", "Blue"],
      review: 4.6,
    },
  ],

  "Men Jackets": [
    {
      name: "Men's Lightweight Sports Jacket",
      description: "Lightweight jacket suitable for outdoor activities and everyday use.",
      price: 1999,
      discountPrice: 1599,
      stock: 70,
      gender: "Men",
      size: ["S", "M", "L", "XL", "XXL"],
      color: ["Black", "Blue", "Grey"],
      review: 4.5,
    },
    {
      name: "Men's Waterproof Jacket",
      description: "Waterproof jacket designed to protect against rain and wind.",
      price: 2999,
      discountPrice: 2399,
      stock: 60,
      gender: "Men",
      size: ["S", "M", "L", "XL"],
      color: ["Black", "Navy"],
      review: 4.7,
    },
  ],

  "Women Leggings": [
    {
      name: "Women's Training Leggings",
      description: "Stretchable leggings designed for yoga, gym and fitness training.",
      price: 999,
      discountPrice: 799,
      stock: 130,
      gender: "Women",
      size: ["XS", "S", "M", "L", "XL"],
      color: ["Black", "Purple", "Blue"],
      review: 4.6,
    },
    {
      name: "Women's Running Leggings",
      description: "Comfortable running leggings with flexible stretch fabric.",
      price: 1199,
      discountPrice: 949,
      stock: 100,
      gender: "Women",
      size: ["XS", "S", "M", "L", "XL"],
      color: ["Black", "Grey"],
      review: 4.5,
    },
  ],

  "Women Tops": [
    {
      name: "Women's Sports Training Top",
      description: "Breathable sports top suitable for workouts and training.",
      price: 899,
      discountPrice: 699,
      stock: 120,
      gender: "Women",
      size: ["XS", "S", "M", "L", "XL"],
      color: ["Pink", "Black", "Purple"],
      review: 4.5,
    },
    {
      name: "Women's Running Top",
      description: "Lightweight running top designed for comfortable outdoor workouts.",
      price: 999,
      discountPrice: 799,
      stock: 100,
      gender: "Women",
      size: ["XS", "S", "M", "L", "XL"],
      color: ["Blue", "Pink", "White"],
      review: 4.4,
    },
  ],

  "Women Jackets": [
    {
      name: "Women's Lightweight Jacket",
      description: "Lightweight sports jacket suitable for outdoor activities and travel.",
      price: 1999,
      discountPrice: 1599,
      stock: 70,
      gender: "Women",
      size: ["XS", "S", "M", "L", "XL"],
      color: ["Black", "Pink", "Purple"],
      review: 4.5,
    },
    {
      name: "Women's Waterproof Rain Jacket",
      description: "Waterproof jacket designed for rainy outdoor activities.",
      price: 2999,
      discountPrice: 2399,
      stock: 60,
      gender: "Women",
      size: ["XS", "S", "M", "L", "XL"],
      color: ["Black", "Blue"],
      review: 4.7,
    },
  ],

  "Women Shorts": [
    {
      name: "Women's Fitness Shorts",
      description: "Lightweight comfortable shorts designed for fitness and training.",
      price: 799,
      discountPrice: 599,
      stock: 120,
      gender: "Women",
      size: ["XS", "S", "M", "L"],
      color: ["Black", "Pink", "Purple"],
      review: 4.5,
    },
  ],

  "Tshirt": [
    {
      name: "Unisex Sports T-Shirt",
      description: "Breathable everyday sports t-shirt suitable for multiple activities.",
      price: 699,
      discountPrice: 549,
      stock: 150,
      gender: "Unisex",
      size: ["S", "M", "L", "XL"],
      color: ["Black", "White", "Blue"],
      review: 4.4,
    },
  ],

  "Caps": [
    {
      name: "Sports Running Cap",
      description: "Lightweight breathable cap suitable for running and outdoor activities.",
      price: 499,
      discountPrice: 399,
      stock: 150,
      gender: "Unisex",
      size: ["Adjustable"],
      color: ["Black", "Blue", "White"],
      review: 4.4,
    },
  ],

  "Polo Shirt": [
    {
      name: "Men's Essential Polo Shirt",
      description: "Comfortable polo shirt suitable for sports and casual everyday wear.",
      price: 999,
      discountPrice: 799,
      stock: 120,
      gender: "Men",
      size: ["S", "M", "L", "XL", "XXL"],
      color: ["Black", "White", "Blue", "Navy"],
      review: 4.5,
    },
    {
      name: "Women's Sports Polo Shirt",
      description: "Lightweight polo shirt designed for comfortable sports and casual wear.",
      price: 999,
      discountPrice: 799,
      stock: 100,
      gender: "Women",
      size: ["XS", "S", "M", "L", "XL"],
      color: ["White", "Pink", "Blue"],
      review: 4.4,
    },
  ],

  "Jackets": [
    {
      name: "Unisex Outdoor Jacket",
      description: "Versatile lightweight jacket for outdoor sports and travel.",
      price: 1999,
      discountPrice: 1599,
      stock: 80,
      gender: "Unisex",
      size: ["S", "M", "L", "XL"],
      color: ["Black", "Blue", "Grey"],
      review: 4.5,
    },
  ],

  "Trackpants": [
    {
      name: "Men's Sports Trackpants",
      description: "Comfortable trackpants suitable for running, gym and training.",
      price: 1199,
      discountPrice: 899,
      stock: 120,
      gender: "Men",
      size: ["S", "M", "L", "XL", "XXL"],
      color: ["Black", "Grey", "Navy"],
      review: 4.4,
    },
  ],

  "Trousers": [
    {
      name: "Unisex Outdoor Trousers",
      description: "Comfortable durable trousers designed for outdoor activities.",
      price: 1499,
      discountPrice: 1199,
      stock: 80,
      gender: "Unisex",
      size: ["30", "32", "34", "36", "38"],
      color: ["Black", "Beige", "Grey"],
      review: 4.4,
    },
  ],

  "Flipflops & Sandals": [
    {
      name: "Comfort Sports Sandals",
      description: "Lightweight sandals designed for everyday comfort and outdoor activities.",
      price: 999,
      discountPrice: 799,
      stock: 100,
      gender: "Unisex",
      size: ["6", "7", "8", "9", "10"],
      color: ["Black", "Blue", "Brown"],
      review: 4.4,
    },
  ],

  "Sandals & Flipflops": [
    {
      name: "Outdoor Comfort Flip Flops",
      description: "Comfortable lightweight flip flops suitable for everyday use.",
      price: 599,
      discountPrice: 449,
      stock: 150,
      gender: "Unisex",
      size: ["6", "7", "8", "9", "10"],
      color: ["Black", "Blue", "Grey"],
      review: 4.3,
    },
  ],

  "Sports Shoes": [
    {
      name: "Men's Everyday Sports Shoes",
      description: "Versatile sports shoes designed for everyday training and activities.",
      price: 1999,
      discountPrice: 1599,
      stock: 100,
      gender: "Men",
      size: ["6", "7", "8", "9", "10", "11"],
      color: ["Black", "White", "Blue"],
      review: 4.5,
    },
    {
      name: "Women's Everyday Sports Shoes",
      description: "Lightweight sports shoes suitable for walking, training and everyday use.",
      price: 1999,
      discountPrice: 1599,
      stock: 90,
      gender: "Women",
      size: ["4", "5", "6", "7", "8"],
      color: ["Black", "Pink", "White"],
      review: 4.5,
    },
  ],

  "Casual Shoes": [
    {
      name: "Men's Casual Everyday Shoes",
      description: "Comfortable casual shoes suitable for everyday wear and travel.",
      price: 1799,
      discountPrice: 1399,
      stock: 100,
      gender: "Men",
      size: ["6", "7", "8", "9", "10"],
      color: ["Black", "White", "Brown"],
      review: 4.4,
    },
    {
      name: "Women's Casual Shoes",
      description: "Comfortable everyday casual shoes with a lightweight design.",
      price: 1799,
      discountPrice: 1399,
      stock: 90,
      gender: "Women",
      size: ["4", "5", "6", "7", "8"],
      color: ["White", "Black", "Pink"],
      review: 4.4,
    },
  ],

  "Basketball Shoes": [
    {
      name: "Men's Basketball Shoes Grip 100",
      description: "Basketball shoes designed with a grippy sole for court performance.",
      price: 2499,
      discountPrice: 1999,
      stock: 70,
      gender: "Men",
      size: ["6", "7", "8", "9", "10", "11"],
      color: ["Black", "Red", "White"],
      review: 4.6,
    },
  ],

  "Cricket Shoes": [
    {
      name: "Men's Cricket Shoes",
      description: "Cricket shoes designed for stability and grip during matches and training.",
      price: 2299,
      discountPrice: 1799,
      stock: 70,
      gender: "Men",
      size: ["6", "7", "8", "9", "10"],
      color: ["White", "Black"],
      review: 4.5,
    },
  ],

  "Racket Shoes": [
    {
      name: "Indoor Court Racket Shoes",
      description: "Lightweight court shoes designed for badminton and racket sports.",
      price: 1999,
      discountPrice: 1599,
      stock: 80,
      gender: "Unisex",
      size: ["6", "7", "8", "9", "10"],
      color: ["White", "Blue", "Black"],
      review: 4.5,
    },
  ],

  "Skating Shoes": [
    {
      name: "Kids Adjustable Roller Skates",
      description: "Adjustable roller skates designed for beginners and young skaters.",
      price: 2499,
      discountPrice: 1999,
      stock: 50,
      gender: "Kids",
      size: ["Adjustable"],
      color: ["Blue", "Pink", "Black"],
      review: 4.5,
    },
  ],

  "Walking Shoes": [
    {
      name: "Men's Comfort Walking Shoes",
      description: "Lightweight walking shoes designed for daily walking and travel.",
      price: 1799,
      discountPrice: 1399,
      stock: 100,
      gender: "Men",
      size: ["6", "7", "8", "9", "10"],
      color: ["Black", "Grey", "Navy"],
      review: 4.5,
    },
  ],

  "Waterproof Shoes": [
    {
      name: "Men's Waterproof Outdoor Shoes",
      description: "Water-resistant outdoor shoes designed for wet weather and trails.",
      price: 2499,
      discountPrice: 1999,
      stock: 70,
      gender: "Men",
      size: ["6", "7", "8", "9", "10"],
      color: ["Black", "Grey"],
      review: 4.6,
    },
  ],

  "Shoes": [
    {
      name: "Unisex Everyday Sports Shoes",
      description: "Comfortable versatile shoes suitable for sports, walking and everyday activities.",
      price: 1799,
      discountPrice: 1399,
      stock: 120,
      gender: "Unisex",
      size: ["6", "7", "8", "9", "10"],
      color: ["Black", "White", "Blue"],
      review: 4.4,
    },
  ],

  "Cycling Accessories": [
    {
      name: "Cycling Bottle Holder",
      description: "Lightweight bottle holder designed for bicycles.",
      price: 499,
      discountPrice: 399,
      stock: 100,
      gender: "Unisex",
      size: ["Standard"],
      color: ["Black"],
      review: 4.3,
    },
    {
      name: "Cycling Repair Kit",
      description: "Compact bicycle repair kit for basic roadside maintenance.",
      price: 899,
      discountPrice: 699,
      stock: 70,
      gender: "Unisex",
      size: ["Standard"],
      color: ["Black"],
      review: 4.5,
    },
  ],

  "All Helmets": [
    {
      name: "Adult Cycling Helmet",
      description: "Lightweight cycling helmet designed for everyday riding.",
      price: 1499,
      discountPrice: 1199,
      stock: 80,
      gender: "Unisex",
      size: ["M", "L"],
      color: ["Black", "Blue", "White"],
      review: 4.6,
    },
    {
      name: "Kids Cycling Helmet",
      description: "Protective lightweight helmet designed for young cyclists.",
      price: 999,
      discountPrice: 799,
      stock: 70,
      gender: "Kids",
      size: ["S", "M"],
      color: ["Blue", "Red", "Pink"],
      review: 4.4,
    },
  ],

  "Hiking Shoes": [
    {
      name: "Men's Waterproof Hiking Shoes",
      description: "Durable hiking shoes with strong grip for outdoor trails.",
      price: 2999,
      discountPrice: 2399,
      stock: 70,
      gender: "Men",
      size: ["6", "7", "8", "9", "10", "11"],
      color: ["Black", "Brown"],
      review: 4.7,
    },
    {
      name: "Women's Hiking Shoes",
      description: "Comfortable and durable hiking shoes for outdoor adventures.",
      price: 2999,
      discountPrice: 2399,
      stock: 60,
      gender: "Women",
      size: ["4", "5", "6", "7", "8"],
      color: ["Grey", "Purple", "Black"],
      review: 4.6,
    },
  ],

  "Fleece": [
    {
      name: "Men's Warm Fleece Jacket",
      description: "Warm lightweight fleece jacket suitable for hiking and winter activities.",
      price: 1999,
      discountPrice: 1599,
      stock: 70,
      gender: "Men",
      size: ["S", "M", "L", "XL", "XXL"],
      color: ["Black", "Blue", "Grey"],
      review: 4.5,
    },
    {
      name: "Women's Warm Fleece Jacket",
      description: "Soft fleece jacket designed to provide warmth during outdoor activities.",
      price: 1999,
      discountPrice: 1599,
      stock: 70,
      gender: "Women",
      size: ["XS", "S", "M", "L", "XL"],
      color: ["Pink", "Purple", "Black"],
      review: 4.6,
    },
  ],

  "Rain Pants": [
    {
      name: "Men's Waterproof Rain Pants",
      description: "Waterproof rain pants designed to keep you dry during heavy rain.",
      price: 1499,
      discountPrice: 1199,
      stock: 60,
      gender: "Men",
      size: ["S", "M", "L", "XL"],
      color: ["Black", "Navy"],
      review: 4.4,
    },
    {
      name: "Women's Waterproof Rain Pants",
      description: "Lightweight waterproof pants for rainy outdoor activities.",
      price: 1499,
      discountPrice: 1199,
      stock: 60,
      gender: "Women",
      size: ["XS", "S", "M", "L", "XL"],
      color: ["Black", "Grey"],
      review: 4.4,
    },
  ],

  "Rain Cover": [
    {
      name: "Backpack Rain Cover 30L",
      description: "Waterproof rain cover designed to protect backpacks from rain.",
      price: 499,
      discountPrice: 399,
      stock: 150,
      gender: "Unisex",
      size: ["20-30L"],
      color: ["Black", "Orange"],
      review: 4.5,
    },
  ],

  "Camping Tents": [
    {
      name: "2 Person Camping Tent",
      description: "Compact waterproof tent suitable for camping and outdoor trips.",
      price: 3999,
      discountPrice: 3299,
      stock: 40,
      gender: "Unisex",
      size: ["2 Person"],
      color: ["Green", "Blue"],
      review: 4.6,
    },
    {
      name: "4 Person Family Camping Tent",
      description: "Spacious camping tent designed for family outdoor adventures.",
      price: 5999,
      discountPrice: 4999,
      stock: 30,
      gender: "Unisex",
      size: ["4 Person"],
      color: ["Green", "Blue"],
      review: 4.7,
    },
    {
      name: "3 Person Waterproof Camping Tent",
      description: "Waterproof family camping tent for outdoor adventures.",
      price: 4999,
      discountPrice: 4199,
      stock: 35,
      gender: "Unisex",
      size: ["3 Person"],
      color: ["Green", "Grey"],
      review: 4.6,
    },
  ],
};

/*
=========================================================
SEED RUNNER
=========================================================
*/
async function seedProducts() {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error("MONGO_URI is missing in .env file");
    }

    console.log("Connecting to MongoDB...");
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB successfully!");

    let totalCreated = 0;
    let totalUpdated = 0;
    let categoriesCreated = 0;

    for (const [categoryName, items] of Object.entries(productsData)) {
      const slug = categoryName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      // Find or create category
      let categoryDoc = await Category.findOne({
        $or: [{ name: categoryName }, { slug }],
      });

      if (!categoryDoc) {
        categoryDoc = await Category.create({
          name: categoryName,
          slug,
          image: CATEGORY_IMAGES[slug] || CATEGORY_IMAGES.default,
          isActive: true,
        });
        categoriesCreated++;
        console.log(`Created category: "${categoryName}" (${slug})`);
      }

      for (const item of items) {
        const discountPercent =
          item.price && item.discountPrice && item.discountPrice < item.price
            ? Math.round(((item.price - item.discountPrice) / item.price) * 100)
            : 0;

        const onSale = Boolean(item.discountPrice && item.discountPrice < item.price);
        const images = item.images && item.images.length > 0
          ? item.images
          : getProductImage(item.name, categoryName);

        const productPayload = {
          name: item.name,
          description: item.description,
          price: item.price,
          discountPrice: item.discountPrice || 0,
          discountPercent,
          stock: item.stock || 50,
          brand: item.brand || "Decathlon",
          gender: item.gender || "Unisex",
          size: item.size || ["Standard"],
          color: item.color || ["Black"],
          review: item.review || 4.5,
          onSale,
          category: categoryDoc._id,
          categories: [categoryDoc._id],
          images,
          isActive: true,
        };

        const existing = await Product.findOne({ name: item.name });

        if (existing) {
          // Update existing product without overriding existing custom images if present
          if (existing.images && existing.images.length > 0) {
            delete productPayload.images;
          }
          await Product.updateOne({ _id: existing._id }, { $set: productPayload });
          totalUpdated++;
        } else {
          await Product.create(productPayload);
          totalCreated++;
        }
      }
    }

    console.log("\n=========================================================");
    console.log("SEED COMPLETED SUCCESSFULLY!");
    console.log(`- New Categories Created: ${categoriesCreated}`);
    console.log(`- New Products Inserted: ${totalCreated}`);
    console.log(`- Existing Products Updated: ${totalUpdated}`);
    console.log("=========================================================");

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Error during product seeding:", error);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
}

seedProducts();
