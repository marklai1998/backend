import { Server } from "socket.io";
import http = require("http");
import Logger from "../utils/Logger";
import { Motd_Broadcast } from "./broadcasts/Motd_Broadcast";
import { Broadcast } from "./broadcasts/Broadcast";
import { User } from "../entity/User";

interface Connection {
  socket: Server;
  user: User;
}

let io = null;
const Clients: Connection[] = [];
const Broadcasts: Broadcast[] = [];

function init(server: http.Server): void {
  io = new Server(server, {
    cors: {
      origin: "*",
    },
  });

  startSchedulers();

  io.on("connection", async (socket: any) => {
    const user = await User.findOne({ apikey: socket.handshake.query.key });
    Clients.push({
      socket: io,
      user: user,
    });
    Logger.info(`[Socket] ${user?.username || "User"} connected`);

    sendCurrentBroadcast(socket);

    // Disconnect
    socket.on("disconnect", () => {
      Logger.info(`[Socket] ${user?.username || "User"} disconnected`);
      const index = Clients.findIndex((e: Connection) => e.socket === socket);
      if (index != -1) {
        Clients.splice(index, 1);
      }
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

export { init };
