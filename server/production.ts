import express, { type Request, Response, NextFunction } from "express";
import fs from "fs";
import path from "path";
import { registerRoutes } from "./routes";
import { runMigrations } from "./run-migrations";

const app = express();

// Logging function
function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

// Serve static files in production
function serveStatic(app: express.Express) {
  const distPath = path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}

app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Run database migrations on startup
  try {
    await runMigrations();
  } catch (error) {
    console.error('[DB] Database migration failed:', error);
    console.log('[DB] Attempting to continue anyway...');
  }

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Serve static files in production
  serveStatic(app);

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason: any, promise) => {
    console.error('[UnhandledRejection] Caught unhandled promise rejection:', reason);
    console.error('[UnhandledRejection] Promise:', promise);
    if (reason && reason.message && reason.message.includes('terminating connection')) {
      console.error('[UnhandledRejection] Database connection terminated during background operation - ignoring');
      return;
    }
    console.error('[UnhandledRejection] FATAL: Unhandled promise rejection - exiting');
    process.exit(1);
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    console.error('[UncaughtException] Caught uncaught exception:', error);
    if (error.message && error.message.includes('terminating connection')) {
      console.error('[UncaughtException] Database connection terminated during background operation - ignoring');
      return;
    }
    console.error('[UncaughtException] FATAL: Uncaught exception - exiting');
    process.exit(1);
  });

  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`Production server running on port ${port}`);
  });
})();
