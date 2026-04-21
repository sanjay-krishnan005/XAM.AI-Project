import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import multer from "multer";
import cors from "cors";
import fs from "fs";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfModule = require("pdf-parse");
// @ts-ignore
const pdf = typeof pdfModule === 'function' ? pdfModule : (pdfModule.PDFParse || pdfModule.default);

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("UNHANDLED REJECTION:", reason);
});

async function startServer() {
  const PORT = 3000;
  console.log("Initialising server with Socket.io...");
  const app = express();
  const httpServer = createServer(app);
  
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // File size limit: 10MB
  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  const upload = multer({ 
    dest: "uploads/",
    limits: { fileSize: MAX_FILE_SIZE }
  });

  // Ensure uploads directory exists (local development only)
  if (process.env.NODE_ENV !== "production" && !fs.existsSync("uploads")) {
    fs.mkdirSync("uploads");
  }

  app.use(cors());
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "10mb", extended: true }));

  console.log("Setting up API routes...");
  // API Routes
  app.post("/api/extract-text", upload.single("file"), async (req: any, res: any) => {
    // Set timeout for this request (45 seconds for Vercel Pro, 10 for free)
    const timeoutMs = process.env.VERCEL ? 45000 : 120000;
    const timeout = setTimeout(() => {
      res.status(504).json({ error: "Request timeout. File too large or processing took too long." });
    }, timeoutMs);

    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Validate file size (double-check)
      if (req.file.size > MAX_FILE_SIZE) {
        return res.status(413).json({ error: "File too large. Maximum size is 10MB." });
      }

      const filePath = req.file.path;
      
      try {
        const dataBuffer = fs.readFileSync(filePath);
        let text = "";

        if (req.file.mimetype === "application/pdf") {
          try {
            const fontsPath = path.join(process.cwd(), "node_modules/pdfjs-dist/standard_fonts/");
            const cmapsPath = path.join(process.cwd(), "node_modules/pdfjs-dist/cmaps/");
            
            // Limit pages to prevent memory issues (max 100 pages)
            const instance = new pdf(new Uint8Array(dataBuffer), {
              standardFontDataUrl: fontsPath,
              cMapUrl: cmapsPath,
              cMapPacked: true,
              max: 100
            });
            
            const result = await instance.getText();
            text = typeof result === 'string' ? result : (result.text || "");

            // Truncate if text is too large (max 500KB)
            const MAX_TEXT_SIZE = 500 * 1024;
            if (text.length > MAX_TEXT_SIZE) {
              text = text.substring(0, MAX_TEXT_SIZE) + "\n[... truncated due to size limit ...]";
            }
          } catch (pdfError: any) {
            console.warn("PDF parsing error:", pdfError.message);
            throw new Error(`PDF parsing failed: ${pdfError.message}`);
          }
        } else if (req.file.mimetype === "text/plain" || req.file.mimetype === "text/csv") {
          text = dataBuffer.toString("utf-8");
          
          // Truncate if text is too large
          const MAX_TEXT_SIZE = 500 * 1024;
          if (text.length > MAX_TEXT_SIZE) {
            text = text.substring(0, MAX_TEXT_SIZE) + "\n[... truncated due to size limit ...]";
          }
        } else {
          return res.status(400).json({ error: "Unsupported file type. Only PDF and text files allowed." });
        }

        res.json({ text });
      } finally {
        // Cleanup
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (unlinkError) {
            console.error("File cleanup error:", unlinkError);
          }
        }
      }
    } catch (error: any) {
      console.error("File extraction error:", error);
      const errorMsg = error.message || "Failed to process file";
      res.status(500).json({ error: `Failed to process file: ${errorMsg}` });
    } finally {
      clearTimeout(timeout);
    }
  });

  app.get("/api/ping", (req, res) => {
    res.json({ pong: true });
  });

  console.log("Setting up Socket.io events...");
  // Socket.io for Group Study Rooms
  const rooms = new Map<string, { 
    users: Set<string>, 
    messages: any[],
    timer: { endTime: number | null, isActive: boolean, duration: number } 
  }>();

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join-room", (roomId: string, username: string) => {
      socket.join(roomId);
      if (!rooms.has(roomId)) {
        rooms.set(roomId, { 
          users: new Set(), 
          messages: [],
          timer: { endTime: null, isActive: false, duration: 25 * 60 * 1000 }
        });
      }
      rooms.get(roomId)?.users.add(username);
      
      const currentRoom = rooms.get(roomId)!;
      io.to(roomId).emit("user-joined", Array.from(currentRoom.users));
      socket.emit("room-history", currentRoom.messages);
      socket.emit("timer-update", currentRoom.timer);
    });

    socket.on("send-message", ({ roomId, message }) => {
      const msg = { ...message, id: Date.now().toString(), timestamp: new Date() };
      rooms.get(roomId)?.messages.push(msg);
      io.to(roomId).emit("new-message", msg);
    });

    socket.on("start-timer", ({ roomId, duration }) => {
      const room = rooms.get(roomId);
      if (room) {
        room.timer = {
          isActive: true,
          endTime: Date.now() + duration,
          duration
        };
        io.to(roomId).emit("timer-update", room.timer);
      }
    });

    socket.on("stop-timer", ({ roomId }) => {
      const room = rooms.get(roomId);
      if (room) {
        room.timer = {
          isActive: false,
          endTime: null,
          duration: room.timer.duration
        };
        io.to(roomId).emit("timer-update", room.timer);
      }
    });

    socket.on("disconnect", () => {
       // Optional: Clean up user from rooms on disconnect
       // Currently using simple Room logic, might need mapping of socket -> username
    });
  });

  console.log("Setting up Vite middleware...");
  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    try {
      console.log("Creating Vite server...");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      console.log("Vite server created, applying middleware...");
      app.use(vite.middlewares);
    } catch (viteError) {
      console.error("Vite creation error:", viteError);
    }
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  console.log(`Starting HTTP server on port ${PORT}...`);
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

console.log("Executing startServer...");
startServer().catch((err) => {
  console.error("Critical server startup error:", err);
  process.exit(1);
});
