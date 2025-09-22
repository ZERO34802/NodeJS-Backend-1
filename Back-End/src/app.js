require("dotenv").config();

const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");

const app = express();

const allow = [process.env.FRONTEND_ORIGIN]; // e.g., https://banao-nodejs-frotnend1.vercel.app

app.use(
  cors({
    origin: (origin, cb) => cb(null, !origin || allow.includes(origin)),
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.options("*", (req, res) => res.sendStatus(204));

app.use(express.json());

app.use((req, res, next) => {
  if (req.method === "OPTIONS" || req.path.includes("/forgot-password")) {
    console.log("REQ", req.method, req.path, req.headers.origin);
  }
  next();
});

app.get("/health", (req, res) => res.send("ok"));

app.use("/api/auth", authRoutes);

module.exports = app;
