require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const connectDB =
  require("./config/db");

const authRoutes =
  require("./routes/authRoutes");

const fileRoutes =
  require("./routes/fileRoutes");

const {
  JSON_BODY_LIMIT
} = require("./config/fileConfig");

const {
  ensureUploadsRoot
} = require("./utils/fileUtils");

const app = express();

const PORT =
  process.env.PORT || 5000;

const CLIENT_URL =
  process.env.CLIENT_URL ||
  "http://localhost:5173";

app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true
  })
);

app.use(
  express.json({
    limit: JSON_BODY_LIMIT
  })
);

app.use(cookieParser());

app.get(
  "/",
  (req, res) => {
    return res
      .status(200)
      .json({
        message:
          "MERN Authentication API is running."
      });
  }
);

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/files",
  fileRoutes
);

app.use(
  (req, res) => {
    return res
      .status(404)
      .json({
        message:
          "Route not found."
      });
  }
);

app.use(
  (error, req, res, next) => {
    console.error(
      "Unhandled server error:",
      error
    );

    if (
      error.type ===
      "entity.too.large"
    ) {
      return res
        .status(413)
        .json({
          message:
            "Request is too large."
        });
    }

    if (
      error instanceof SyntaxError &&
      error.status === 400 &&
      "body" in error
    ) {
      return res
        .status(400)
        .json({
          message:
            "Invalid JSON request body."
        });
    }

    return res
      .status(500)
      .json({
        message:
          "Internal server error."
      });
  }
);

const startServer = async () => {
  await connectDB();

  await ensureUploadsRoot();

  app.listen(
    PORT,
    () => {
      console.log(
        `Server running on http://localhost:${PORT}`
      );
    }
  );
};

startServer().catch(
  (error) => {
    console.error(
      "Server startup failed:",
      error
    );

    process.exit(1);
  }
);