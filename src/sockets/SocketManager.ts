import { Server } from "socket.io";
import http = require("http");
import Logger from "../utils/Logger";
import { Motd_Broadcast } from "./broadcasts/Motd_Broadcast";
import { Broadcast } from "./broadcasts/Broadcast";
import { joinRoom } from "./Rooms";

const cache = require("../cache");

let io = null;
const Broadcasts: Broadcast[] = [];

function init(server: http.Server): void {
  io = new Server(server, {
    cors: {
      origin: "*",
    },
  });

  startSchedulers();

  io.on("connection", (socket: any) => {
    Logger.info(`[Socket] User connected`);

    cache.set("connected_clients", io.engine.clientsCount);

    // Join Room
    socket.on("join", (msg: any) => {
      const roomName = msg.data?.room;
      if (roomName) {
        joinRoom(socket, roomName, msg.apikey);
      }
    });
    // Leave Room
    socket.on("leave", (msg: any) => {
      const roomName = msg.data?.room;
      if (roomName) {
        socket.leave(roomName);
      }
    });

    // Disconnect
    socket.on("disconnect", () => {
      cache.set("connected_clients", io.engine.clientsCount);
      Logger.info(`[Socket] User disconnected`);
    });
  });
}
function startSchedulers(): void {
  Broadcasts.push(new Motd_Broadcast());
}

// -----===== Emit functions =====-----
function broadcast(event: string, value: any): void {
  io.emit(event, value);
}
function sendToRoom(room: string, event: string, value: any): void {
  io.to(room).emit(event, value);
}

export { init, broadcast, sendToRoom };
