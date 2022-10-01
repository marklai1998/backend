import { Server } from "socket.io";
import http = require("http");
import Logger from "../utils/Logger";
import { Motd_Broadcast } from "./broadcasts/Motd_Broadcast";
import { Broadcast } from "./broadcasts/Broadcast";

let io = null;
const Broadcasts: Broadcast[] = [];

function init(server: http.Server): void {
  io = new Server(server, {
    cors: {
      origin: "*",
    },
  });

  startSchedulers();

  io.on("connection", async (socket: any) => {
    socket.join("clients");

    Logger.info(`[Socket] User connected`);

    sendCurrentBroadcast(socket);

    // Disconnect
    socket.on("disconnect", () => {
      Logger.info(`[Socket] User disconnected`);
    });
  });
}
function startSchedulers(): void {
  Broadcasts.push(new Motd_Broadcast(io));
}
function sendCurrentBroadcast(socket: any): void {
  for (const broadcast of Broadcasts) {
    socket.emit(broadcast.eventName(), broadcast.message());
  }
}

// -----===== Emit functions =====-----
function broadcast(event: string, value: any): void {
  io.emit(event, value);
}
function sendToRoom(room: string, event: string, value: any): void {
  io.to(room).emit(event, value);
}

function validateUUIDv4(uuid: string) {
  return uuid?.match(
    /^[0-9A-F]{8}-[0-9A-F]{4}-[4][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i
  );
}

export { init, broadcast, sendToRoom };
