require("dotenv").config();

const cds = require("@sap/cds");

const express = require("express");

const path = require("path");

const authMiddleware =
  require("./middleware/auth");

const login =
  require("./login");

cds.on("bootstrap", (app) => {

  // =========================
  // GLOBAL MIDDLEWARE
  // =========================

  app.use(express.json());

  // =========================
  // SERVE FRONTEND
  // =========================

  app.use(
    express.static(
      path.join(
        __dirname,
        "../app/chat/webapp"
      )
    )
  );

  // =========================
  // IMPORT ROUTES
  // =========================

  const upload =
    require("./upload");

  const ai =
    require("./ai");

  const matchResume =
    require("./matchResume");

  const streamChat =
    require("./streamChat");

  // =========================
  // ROUTES
  // =========================

  // STREAMING CHAT
  app.use(
    "/stream-chat",
    streamChat
  );

  // FILE UPLOAD
  app.use(
    "/upload",
    authMiddleware,
    upload
  );

  // AI CHAT
  // TEMPORARILY WITHOUT AUTH
  app.use(
    "/chat",
    ai
  );

  // RESUME MATCHING
  app.use(
    "/copilot/matchResume",
    authMiddleware,
    matchResume
  );

  // LOGIN
  app.use(
    "/login",
    login
  );

  // =========================
  // HEALTH CHECK
  // =========================

  app.get(
    "/health",
    (req, res) => {

      res.send(
        "SAP AI Copilot Running"
      );

    }
  );

});

module.exports = cds.server;