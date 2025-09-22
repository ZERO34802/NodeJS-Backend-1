require("dotenv").config();
const express = require("express");
const authRoutes = require("./routes/auth");
const app = express();

app.get("/health", (req, res) => res.send("ok"));

app.use(express.json());
app.use("/api/auth", authRoutes);
module.exports = app;
