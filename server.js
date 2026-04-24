// server.js — Custom Next.js + Socket.io server
// Run with: node server.js  (dev: node --env-file=.env.local server.js)
//
// Architecture:
//   • Next.js handles all HTTP requests (pages + API routes)
//   • Socket.io attaches to the same HTTP server for real-time messaging
//   • JWT token must be passed in socket.handshake.auth.token
//   • X-Salon-ID equivalent: salonId is read from the JWT payload

"use strict";

const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

// ─────────────────────────────────────────────────────────────────────────────
// Lazy Mongoose Models
// Defined here so socket.io handlers can save messages without going through
// Next.js API routes. Uses the same model names as the TypeScript models so
// mongoose.models cache is shared across the process.
// ─────────────────────────────────────────────────────────────────────────────
function getModels() {
  // ── Conversation ────────────────────────────────────────────────────────────
  const ConversationModel =
    mongoose.models.Conversation ||
    (() => {
      const s = new mongoose.Schema(
        {
          salonId:          { type: mongoose.Schema.Types.ObjectId, ref: "Salon", required: true },
          customerId:       { type: mongoose.Schema.Types.ObjectId, ref: "User",  required: true },
          subject:          { type: String, maxlength: 200 },
          lastMessage:      { type: String },
          lastMessageAt:    { type: Date },
          lastMessageBy:    { type: String, enum: ["customer", "owner", "staff"] },
          messageCount:     { type: Number, default: 0 },
          unreadByCustomer: { type: Number, default: 0 },
          unreadBySalon:    { type: Number, default: 0 },
          isActive:         { type: Boolean, default: true },
        },
        { timestamps: true }
      );
      s.index({ salonId: 1, customerId: 1 }, { unique: true });
      return mongoose.model("Conversation", s);
    })();

  // ── Message ─────────────────────────────────────────────────────────────────
  const MessageModel =
    mongoose.models.Message ||
    (() => {
      const s = new mongoose.Schema(
        {
          conversationId: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },
          salonId:        { type: mongoose.Schema.Types.ObjectId, ref: "Salon",        required: true },
          senderId:       { type: mongoose.Schema.Types.ObjectId, ref: "User",         required: true },
          senderRole:     { type: String, enum: ["customer", "owner", "staff"],        required: true },
          text:           { type: String, required: true, trim: true, maxlength: 5000 },
          isRead:         { type: Boolean, default: false },
          readAt:         { type: Date },
        },
        { timestamps: true }
      );
      s.index({ conversationId: 1, createdAt: 1 });
      return mongoose.model("Message", s);
    })();

  return { ConversationModel, MessageModel };
}

// ─────────────────────────────────────────────────────────────────────────────
// DB connection (reuses existing connection if already open)
// ─────────────────────────────────────────────────────────────────────────────
async function connectDB() {
  if (mongoose.connection.readyState >= 1) return;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI environment variable is not set");
  await mongoose.connect(uri);
  console.log("[DB] MongoDB connected from socket server");
}

// ─────────────────────────────────────────────────────────────────────────────
// JWT helper — read JWT_SECRET lazily so Next.js can load .env first
// ─────────────────────────────────────────────────────────────────────────────
function verifyToken(token) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not configured");
  try {
    return jwt.verify(token, secret);
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Bootstrap
// ─────────────────────────────────────────────────────────────────────────────
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // HTTP server — Next.js handles all HTTP requests
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  // ── Socket.io ──────────────────────────────────────────────────────────────
  const io = new Server(httpServer, {
    path: "/socket.io",
    cors: {
      origin: "*",            // tighten this for production
      methods: ["GET", "POST"],
    },
  });

  // ── Auth middleware ────────────────────────────────────────────────────────
  // Every socket must supply a valid JWT in handshake.auth.token
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("AUTH_REQUIRED: No token provided"));

    const payload = verifyToken(token);
    if (!payload) return next(new Error("AUTH_INVALID: Token is invalid or expired"));

    socket.data.user = payload; // { userId, salonId, role, email }
    next();
  });

  // ── Connection handler ─────────────────────────────────────────────────────
  io.on("connection", (socket) => {
    const user = socket.data.user;
    console.log(`[Socket] Connected  uid=${user.userId}  role=${user.role}`);

    // ── join_conversation ──────────────────────────────────────────────────
    // Client emits this when opening a chat screen.
    // Payload: { conversationId: string }
    // Joins the socket to room "conv:<conversationId>"
    socket.on("join_conversation", async ({ conversationId }) => {
      if (!conversationId) {
        socket.emit("error", { event: "join_conversation", message: "conversationId is required" });
        return;
      }
      try {
        await connectDB();
        const { ConversationModel } = getModels();

        // Verify caller belongs to this conversation
        const filter =
          user.role === "customer"
            ? { _id: conversationId, customerId: user.userId }
            : { _id: conversationId, salonId: user.salonId };

        const conv = await ConversationModel.findOne(filter);
        if (!conv) {
          socket.emit("error", { event: "join_conversation", message: "Conversation not found or access denied" });
          return;
        }

        socket.join(`conv:${conversationId}`);
        socket.emit("joined", { conversationId });
        console.log(`[Socket] uid=${user.userId} joined conv:${conversationId}`);
      } catch (err) {
        console.error("[Socket] join_conversation error:", err);
        socket.emit("error", { event: "join_conversation", message: "Failed to join conversation" });
      }
    });

    // ── leave_conversation ─────────────────────────────────────────────────
    // Client emits this when leaving/closing a chat screen.
    // Payload: { conversationId: string }
    socket.on("leave_conversation", ({ conversationId }) => {
      if (!conversationId) return;
      socket.leave(`conv:${conversationId}`);
      socket.emit("left", { conversationId });
      console.log(`[Socket] uid=${user.userId} left conv:${conversationId}`);
    });

    // ── send_message ───────────────────────────────────────────────────────
    // Client emits this to send a message in an open conversation.
    // Payload: { conversationId: string, text: string }
    //
    // Server broadcasts "new_message" and "conversation_updated" to everyone
    // in room "conv:<conversationId>" — including the sender (echo confirms delivery).
    socket.on("send_message", async ({ conversationId, text }) => {
      // Validate
      if (!conversationId) {
        socket.emit("error", { event: "send_message", message: "conversationId is required" });
        return;
      }
      if (!text || !String(text).trim()) {
        socket.emit("error", { event: "send_message", message: "Message text cannot be empty" });
        return;
      }

      try {
        await connectDB();
        const { ConversationModel, MessageModel } = getModels();

        // Verify caller belongs to this conversation
        const filter =
          user.role === "customer"
            ? { _id: conversationId, customerId: user.userId }
            : { _id: conversationId, salonId: user.salonId };

        const conversation = await ConversationModel.findOne(filter);
        if (!conversation) {
          socket.emit("error", { event: "send_message", message: "Conversation not found" });
          return;
        }
        if (!conversation.isActive) {
          socket.emit("error", { event: "send_message", message: "This conversation has been closed" });
          return;
        }

        const senderRole = user.role; // "customer" | "owner" | "staff"
        const trimmedText = String(text).trim();

        // Persist the message
        const newMessage = await MessageModel.create({
          conversationId: conversation._id,
          salonId:        conversation.salonId,
          senderId:       user.userId,
          senderRole,
          text:           trimmedText,
        });

        // Update conversation summary
        conversation.lastMessage    = trimmedText;
        conversation.lastMessageAt  = new Date();
        conversation.lastMessageBy  = senderRole;
        conversation.messageCount   = (conversation.messageCount || 0) + 1;
        if (senderRole === "customer") {
          conversation.unreadBySalon += 1;
        } else {
          conversation.unreadByCustomer += 1;
        }
        await conversation.save();

        // ── Broadcast to entire room ────────────────────────────────────────
        // "new_message" — append to local messages array on all clients
        io.to(`conv:${conversationId}`).emit("new_message", {
          _id:            newMessage._id,
          conversationId: conversationId,
          senderId:       user.userId,
          senderRole,
          text:           newMessage.text,
          isRead:         false,
          createdAt:      newMessage.createdAt,
          updatedAt:      newMessage.updatedAt,
        });

        // "conversation_updated" — update the conversation preview in the list
        io.to(`conv:${conversationId}`).emit("conversation_updated", {
          conversationId,
          lastMessage:      conversation.lastMessage,
          lastMessageAt:    conversation.lastMessageAt,
          lastMessageBy:    conversation.lastMessageBy,
          messageCount:     conversation.messageCount,
          unreadByCustomer: conversation.unreadByCustomer,
          unreadBySalon:    conversation.unreadBySalon,
        });

        console.log(`[Socket] Message sent in conv:${conversationId} by uid=${user.userId}`);
      } catch (err) {
        console.error("[Socket] send_message error:", err);
        socket.emit("error", { event: "send_message", message: "Failed to send message" });
      }
    });

    // ── mark_read ──────────────────────────────────────────────────────────
    // Client emits this when the user opens or reads a chat.
    // Payload: { conversationId: string }
    // Resets the caller's unread count to 0 and emits "marked_read" back.
    socket.on("mark_read", async ({ conversationId }) => {
      if (!conversationId) return;
      try {
        await connectDB();
        const { ConversationModel } = getModels();

        const filter =
          user.role === "customer"
            ? { _id: conversationId, customerId: user.userId }
            : { _id: conversationId, salonId: user.salonId };

        const update =
          user.role === "customer"
            ? { $set: { unreadByCustomer: 0 } }
            : { $set: { unreadBySalon: 0 } };

        await ConversationModel.findOneAndUpdate(filter, update);

        socket.emit("marked_read", { conversationId, unreadCount: 0 });
        console.log(`[Socket] Marked read conv:${conversationId} uid=${user.userId}`);
      } catch (err) {
        console.error("[Socket] mark_read error:", err);
        socket.emit("error", { event: "mark_read", message: "Failed to mark as read" });
      }
    });

    // ── typing ─────────────────────────────────────────────────────────────
    // Optional "is typing..." indicator.
    // Payload: { conversationId: string, isTyping: boolean }
    socket.on("typing", ({ conversationId, isTyping }) => {
      if (!conversationId) return;
      // Broadcast to everyone ELSE in the room (not back to the sender)
      socket.to(`conv:${conversationId}`).emit("typing", {
        conversationId,
        userId: user.userId,
        role:   user.role,
        isTyping: !!isTyping,
      });
    });

    // ── disconnect ─────────────────────────────────────────────────────────
    socket.on("disconnect", (reason) => {
      console.log(`[Socket] Disconnected uid=${user.userId}  reason=${reason}`);
    });
  });

  // ── Start listening ────────────────────────────────────────────────────────
  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> Socket.io path: /socket.io`);
  });
});
