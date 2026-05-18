import express from "express";
import path from "path";
import multer from "multer";
import fs from "fs";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Set up storage for multer to save files in the "uploads" folder
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadsDir);
  },
  filename(req, file, cb) {
    // Generate a short random name + original extension or clean name
    const unqiuePrefix = Math.round(Math.random() * 1e9).toString(36);
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    cb(null, `${unqiuePrefix}-${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter(req, file, cb) {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDFs are allowed"));
    }
  },
});

app.use(express.json());

// API: Upload a PDF
app.post("/api/upload", upload.single("pdf"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded or invalid format." });
  }

  res.json({
    message: "File uploaded successfully",
    file: {
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      downloadUrl: `/api/download/${req.file.filename}`,
    },
  });
});

// API: List uploaded PDFs
app.get("/api/files", (req, res) => {
  fs.readdir(uploadsDir, (err, files) => {
    if (err) {
      return res.status(500).json({ error: "Failed to read uploads folder" });
    }
    const fileInfos = files.map((file) => {
      const stats = fs.statSync(path.join(uploadsDir, file));
      return {
        filename: file,
        size: stats.size,
        createdAt: stats.mtimeMs,
        downloadUrl: `/api/download/${file}`,
      };
    });
    // Sort by chronological descending
    fileInfos.sort((a, b) => b.createdAt - a.createdAt);
    res.json(fileInfos);
  });
});

// API: Download/View PDF
app.get("/api/download/:filename", (req, res) => {
  const file = path.join(uploadsDir, req.params.filename);
  if (fs.existsSync(file)) {
    // We can set headers to view inline instead of forcing attachment
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${req.params.filename}"`);
    res.sendFile(file);
  } else {
    res.status(404).send("File not found");
  }
});

// API: Delete a PDF
app.delete("/api/files/:filename", (req, res) => {
  const file = path.join(uploadsDir, req.params.filename);
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
    res.json({ message: "File deleted" });
  } else {
    res.status(404).json({ error: "File not found" });
  }
});

async function startServer() {
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
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
