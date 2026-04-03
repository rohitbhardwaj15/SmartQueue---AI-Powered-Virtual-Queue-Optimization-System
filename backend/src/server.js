import "dotenv/config";
import http from "http";
import { Server } from "socket.io";
import { createApp } from "./app.js";
import { connectDB } from "./config/db.js";

const PORT = Number(process.env.PORT || 4000);

await connectDB(process.env.MONGODB_URI);

const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN?.split(",") ?? "*"
  }
});

const app = createApp(io);
server.on("request", app);

io.on("connection", (socket) => {
  socket.emit("connected", { ok: true, message: "SmartQueue realtime connected" });
});

server.listen(PORT, () => {
  console.log(`SmartQueue backend listening on http://localhost:${PORT}`);
});
