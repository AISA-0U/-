import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Modular AI Agent Backend is running" });
  });

  // Proxy for Gemini API or other backend tasks if needed
  // Note: System instructions say "Always call Gemini API from the frontend code".
  // However, for "modular tool system" and "parallel task processing" with server-side tools,
  // a backend might be useful. But I will follow the instruction to call Gemini from frontend
  // for the main chat, and maybe use the backend for specific tool logic if necessary.
  // Actually, I'll implement the "Agent" logic on the frontend to comply with the instruction.
  // The backend will mostly serve the app and handle any file-system related tasks if any.

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
