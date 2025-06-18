const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");

const app = express();
const PORT = 3000;

// MongoDB connection URI (local default)
const MONGODB_URI = "mongodb://localhost:27017/locationdb";

app.use(cors());
app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on("error", (err) => console.error("MongoDB connection error:", err));
db.once("open", () => console.log("✅ Connected to MongoDB"));

// Define Mongoose schema for location data
const locationSchema = new mongoose.Schema({
  userid: { type: String, required: true },
  latitude: { type: String, required: true },
  longitude: { type: String, required: true },
  speed: { type: String, required: true },
  status: { type: String, required: true },
  timestamp: { type: Date, required: true, default: Date.now },
});

// Create model
const LocationData = mongoose.model("LocationData", locationSchema);

// POST: Save location data
app.post("/api/endpoint", async (req, res) => {
  const { userid, latitude, longitude, speed, status } = req.body;

  if (!userid || !latitude || !longitude || !speed || !status) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields",
    });
  }

  try {
    const locationEntry = new LocationData({
      userid,
      latitude,
      longitude,
      speed,
      status,
    });

    await locationEntry.save();

    res.json({
      success: true,
      message: "Data saved successfully",
      data: locationEntry,
    });
  } catch (error) {
    console.error("Error saving data:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// GET: Latest status per user
app.get("/api/latest-status", async (req, res) => {
  try {
    const latestPerUser = await LocationData.aggregate([
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: "$userid",
          userid: { $first: "$userid" },
          latitude: { $first: "$latitude" },
          longitude: { $first: "$longitude" },
          speed: { $first: "$speed" },
          status: { $first: "$status" },
          timestamp: { $first: "$timestamp" },
        },
      },
      { $project: { _id: 0 } },
    ]);

    res.json({ success: true, data: latestPerUser });
  } catch (error) {
    console.error("Error fetching latest status:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ✅ NEW: GET all GPS data for a specific user
app.get("/api/user-data", async (req, res) => {
  const { userid } = req.query;

  if (!userid) {
    return res.status(400).json({
      success: false,
      message: "Missing userid parameter",
    });
  }

  try {
    const userData = await LocationData.find({ userid }).sort({ timestamp: 1 }).lean();

    if (userData.length === 0) {
      return res.status(404).json({ success: false, message: "No data found for this user" });
    }

    res.json({ success: true, data: userData });
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
