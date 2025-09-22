require("dotenv").config();
const express = require("express");
const authRoutes = require("./routes/auth");
const app = express();

const cors = require("cors");
const allow = [process.env.FRONTEND_ORIGIN];
app.use(
  cors({ origin: (origin, cb) => cb(null, !origin || allow.includes(origin)) })
);

app.get("/health", (req, res) => res.send("ok"));

app.use(express.json());
app.use("/api/auth", authRoutes);
module.exports = app;
