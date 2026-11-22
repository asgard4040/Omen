import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import app from "./server-app.js";

const PORT = 3000;

// START EXPRESS/VITE ENGINE
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // In development mode, load Vite server as a middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production mode
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Store Server successfully running at:`);
    console.log(`   ➜ Local:   http://localhost:${PORT}/`);
    console.log(`   ➜ Network: http://127.0.0.1:${PORT}/`);
  });
}

startServer();
