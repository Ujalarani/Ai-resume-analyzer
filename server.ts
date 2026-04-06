import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const multer = require("multer");
const pdf = require("pdf-parse");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Add basic middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Configure multer for memory storage
  const upload = multer({ storage: multer.memoryStorage() });

  console.log("Setting up API routes...");

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Server is running" });
  });

  // API endpoint for PDF text extraction
  app.post("/api/extract-text", upload.single("resume"), async (req: any, res: any) => {
    console.log("POST /api/extract-text - Received request");
    try {
      if (!req.file) {
        console.error("No file uploaded");
        return res.status(400).json({ error: "No file uploaded" });
      }

      console.log(`File received: ${req.file.originalname} (${req.file.size} bytes)`);

      const data = await pdf(req.file.buffer);
      console.log("PDF text extracted successfully");
      res.json({ text: data.text });
    } catch (error) {
      console.error("PDF Extraction Error:", error);
      res.status(500).json({ error: "Failed to extract text from PDF" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting Vite in middleware mode...");
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

startServer().catch(err => {
  console.error("Failed to start server:", err);
});
