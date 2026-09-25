import express from "express";
import {
  addAddress,
  getAddresses,
  updateAddress,
  deleteAddress,
} from "../controllers/addressController.js";
import { reverseGeocode, lookupPincode } from "../controllers/locationController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/reverse-geocode", reverseGeocode);
router.get("/pincode/:pincode", lookupPincode);
router.post("/", protect, addAddress);
router.get("/", protect, getAddresses);
router.put("/:id", protect, updateAddress);
router.delete("/:id", protect, deleteAddress);

export default router;