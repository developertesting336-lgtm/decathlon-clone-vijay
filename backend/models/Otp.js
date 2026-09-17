import mongoose from "mongoose";

const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      lowercase: true,
      trim: true,
      sparse: true,
    },

    phone: {
      type: String,
      trim: true,
      sparse: true,
    },

    otp: {
      type: String,
      required: true,
    },

    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// TTL Index: MongoDB automatically deletes OTP documents once expiresAt timestamp is reached
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Otp = mongoose.model(
  "Otp",
  otpSchema,
);

export default Otp;