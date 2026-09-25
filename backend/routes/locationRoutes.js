import express from "express";
import { reverseGeocode, lookupPincode } from "../controllers/locationController.js";

const router = express.Router();

// GET /api/location/reverse-geocode?lat=...&lon=...
router.get("/reverse-geocode", reverseGeocode);

// GET /api/location/pincode/:pincode
router.get("/pincode/:pincode", lookupPincode);

export default router;
