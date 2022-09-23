import { Server } from "socket.io";
import http = require("http");
import Logger from "../utils/Logger";
import { Motd_Broadcast } from "./broadcasts/Motd_Broadcast";
import { Broadcast } from "./broadcasts/Broadcast";
import { User } from "../entity/User";
import { Permissions } from "../routes";

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
    const key = socket.handshake.query.key;

    let user: User;
    if (validateUUIDv4(key)) {
      user = await User.findOne({ apikey: socket.handshake.query.key });
    }
    if (user?.permission >= Permissions.builder) {
      socket.join("clients_staff");
    } else {
      socket.join("clients");
    }

    Logger.info(`[Socket] ${user?.username || "User"} connected`);

    sendCurrentBroadcast(socket);

    // Disconnect
    socket.on("disconnect", () => {
      Logger.info(`[Socket] ${user?.username || "User"} disconnected`);
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

function validateUUIDv4(uuid: string) {
  return uuid.match(
    /^[0-9A-F]{8}-[0-9A-F]{4}-[4][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i
  );
}

export { init };
