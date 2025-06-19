const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");

const app = express();
const PORT = 3000;

// MongoDB Atlas connection URI
const { MongoClient, ServerApiVersion } = require("mongodb");
const MONGODB_URI =
  "mongodb+srv://livemap:wi5Y1BLy7zaHkQ9a@cluster0.icbepgp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

app.use(cors());
app.use(bodyParser.json());

// Connect to MongoDB Atlas
mongoose.connect(MONGODB_URI);

const db = mongoose.connection;
db.on("error", (err) => console.error("MongoDB Atlas connection error:", err));
db.once("open", () => console.log("✅ Connected to MongoDB Atlas"));

// Define Mongoose schema for location data
const locationSchema = new mongoose.Schema({
  userid: { type: String, required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  speed: { type: Number, required: true },
  status: { type: String, required: true },
  timestamp: { type: Date, required: true, default: Date.now },
});

// Create model
const LocationData = mongoose.model("LocationData", locationSchema);

// Helper function to check if value is a valid number
function isNumber(value) {
  return typeof value === "number" && !isNaN(value) && isFinite(value);
}

// POST: Save location data
app.post("/api/endpoint", async (req, res) => {
  const { userid, latitude, longitude, speed, status } = req.body;

  console.log("Received data:", { userid, latitude, longitude, speed, status });

  // Validate all required fields with proper types
  if (
    userid &&
    isNumber(latitude) &&
    isNumber(longitude) &&
    isNumber(speed) &&
    status
  ) {
    try {
      const locationEntry = new LocationData({
        userid,
        latitude,
        longitude,
        speed,
        status,
      });

      await locationEntry.save();

      return res.status(200).json({
        success: true,
        message: "Location data saved successfully",
        data: locationEntry,
      });
    } catch (error) {
      console.error("Error saving data:", error);
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: error.message,
      });
    }
  } else {
    // Validation failed
    const errors = [];
    if (!userid) errors.push("userid is required");
    if (!isNumber(latitude)) errors.push("latitude must be a valid number");
    if (!isNumber(longitude)) errors.push("longitude must be a valid number");
    if (!isNumber(speed)) errors.push("speed must be a valid number");
    if (!status) errors.push("status is required");

    return res.status(400).json({
      success: false,
      message: "Validation errors",
      errors: errors,
    });
  }
});

// GET: Latest status per user
app.get("/api/latest-status", async (req, res) => {
  try {
    const latestPerUser = await LocationData.aggregate([
      {
        $group: {
          _id: "$userid", // Group by userid
          userid: { $first: "$userid" }, // Take first userid (latest)
          latitude: { $first: "$latitude" },
          longitude: { $first: "$longitude" },
          speed: { $first: "$speed" },
          status: { $first: "$status" },
          timestamp: { $first: "$timestamp" },
        },
      },
      { $project: { _id: 0 } }, // Remove _id from output
      {
        $sort: {
          timestamp: -1, // Sort by timestamp descending
          status: 1, // Then by status ascending
          userid: 1, // Then by userid ascending
        },
      },
    ]);

    res.json({ success: true, data: latestPerUser });
  } catch (error) {
    console.error("Error fetching latest status:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

// GET: All GPS data for a specific user
app.get("/api/user-data", async (req, res) => {
  const { userid } = req.query;

  if (!userid) {
    return res.status(400).json({
      success: false,
      message: "Missing userid parameter",
    });
  }

  try {
    const userData = await LocationData.find({ userid })
      .sort({ timestamp: 1 })
      .lean();

    if (userData.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No data found for this user",
      });
    }

    res.json({ success: true, data: userData });
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

// GET: Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is running",
    database:
      mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📍 Using MongoDB Atlas cluster`);
});
