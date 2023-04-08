import { Server } from "socket.io";
import http = require("http");
import Logger from "../utils/Logger";
import { Motd_Broadcast } from "./broadcasts/Motd_Broadcast";
import { Broadcast } from "./broadcasts/Broadcast";
import jwt, { AUTH_SECRET } from "../utils/encryption/jwt";
import * as dbCache from "../utils/cache/DatabaseCache";
import { User } from "../entity/User";
import { SocketEvents } from "./Events";
import { Permissions } from "../routes";

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
    // Auth
    const { token } = socket.handshake.auth;
    let user: User = <User>{};

    jwt.verify(token, AUTH_SECRET, (err: any, auth: any) => {
      if (err) {
        return;
      }
      user = dbCache.findOne(User, { uid: auth.uid });
    });

    Logger.info(`[Socket] ${user.username || "User"} connected`);

    cache.set("connected_clients", io.engine.clientsCount);

    // Send join messages
    socket.emit("motd", cache.get("current_motd"));

    // Custom Events
    for (const event of SocketEvents) {
      socket.on(event.name, (msg: any) => {
        if ((user.permission || Permissions.default) >= event.permission) {
          event.callback(msg);
        }
      });
    }

    // Disconnect
    socket.on("disconnect", () => {
      cache.set("connected_clients", io.engine.clientsCount);
      Logger.info(`[Socket] ${user.username || "User"} disconnected`);
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
