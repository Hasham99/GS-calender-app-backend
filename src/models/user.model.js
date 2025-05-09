import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    name: { type: String, trim: true }, // Name is optional for invited users
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String }, // No password for invited users initially
    plainPassword: { type: String },
    phoneNumber: { type: String, trim: true },
    valid: { type: Boolean, default: false }, // Users start as invalid (pending)
    otp: { type: Number, default: null },
    role: {
      type: String,
      enum: ["user", "admin"], // Allow only "user" and "admin" roles
      default: "user",
    },
    facilities: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Facility",
        }
      ],
    allowedBooking:{type: Boolean, default: true}, // Whether the user can book
      
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User"  }, // Reference to the user who created this user
    invitedAt: { type: Date, default: Date.now }, // Track when they were invited
    acceptedAt: { type: Date }, // When they accept the invitation
  },
  { timestamps: true }
);
// ✅ Compound indexes for per-client uniqueness
userSchema.index({ email: 1, clientId: 1 }, { unique: true });
userSchema.index({ phoneNumber: 1, clientId: 1 }, { unique: true });

export const User = mongoose.model("User", userSchema);
