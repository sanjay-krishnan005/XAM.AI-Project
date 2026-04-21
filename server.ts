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

  const upload = multer({ dest: "uploads/" });

  // Ensure uploads directory exists
  if (!fs.existsSync("uploads")) {
    fs.mkdirSync("uploads");
  }

  app.use(cors());
  app.use(express.json());

  console.log("Setting up API routes...");
  // API Routes
  app.post("/api/extract-text", upload.single("file"), async (req: any, res: any) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const filePath = req.file.path;
    try {
      const dataBuffer = fs.readFileSync(filePath);
      
      let text = "";
      if (req.file.mimetype === "application/pdf") {
        try {
          // pdf-parse 2.x+ (Mehmet Kozan version) uses a class based API
          // Resolve standard fonts and CMaps path for PDFs with non-embedded fonts or special character sets
          const fontsPath = path.join(process.cwd(), "node_modules/pdfjs-dist/standard_fonts/");
          const cmapsPath = path.join(process.cwd(), "node_modules/pdfjs-dist/cmaps/");
          const instance = new pdf(new Uint8Array(dataBuffer), {
            standardFontDataUrl: fontsPath,
            cMapUrl: cmapsPath,
            cMapPacked: true
          });
          const result = await instance.getText();
          text = typeof result === 'string' ? result : (result.text || "");
        } catch (pdfError: any) {
          console.warn("New PDF API failed, trying legacy style:", pdfError.message);
          // Fallback just in case some other version is used
          const result = await pdf(dataBuffer);
          text = result.text || result;
        }
      } else {
        text = dataBuffer.toString("utf-8");
      }
      
      res.json({ text });
    } catch (error) {
      console.error("Extraction error:", error);
      res.status(500).json({ error: "Failed to extract text" });
    } finally {
      // Cleanup
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (unlinkError) {
          console.error("Cleanup error:", unlinkError);
        }
      }
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
