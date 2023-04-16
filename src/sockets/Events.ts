import * as dbCache from "../utils/cache/DatabaseCache";

import { broadcast, sendToRoom } from "./SocketManager";

import { Permissions } from "../routes";
import { User } from "../entity/User";

interface SocketEvent {
  name: string;
  permission: number;
  callback: (msg: any) => void;
}

export const SocketEvents: SocketEvent[] = [
  {
    name: "teleport",
    permission: Permissions.default,
    callback(msg) {
      broadcast("playerTeleport", msg);
    },
  },
  {
    name: "nyc_server_player_info",
    permission: Permissions.admin,
    callback(msg) {
      broadcast("player_location", msg);
    },
  },
  {
    name: "nyc_server_player_join",
    permission: Permissions.admin,
    callback(msg) {
      const joinedPlayer = JSON.parse(msg);
      const user = dbCache.findOne(User, { mc_uuid: joinedPlayer.uuid });

      if (user) {
        dbCache.update(user, { online: true });
      }

      broadcast("player_join", msg);
    },
  },
  {
    name: "nyc_server_player_quit",
    permission: Permissions.admin,
    callback(msg) {
      const leavedPlayer = JSON.parse(msg);
      const user = dbCache.findOne(User, { mc_uuid: leavedPlayer.uuid });

      if (user) {
        dbCache.update(user, { online: false });
      }

      broadcast("player_leave", msg);
    },
  },
  {
    name: "nyc_server_player_chat",
    permission: Permissions.admin,
    callback(msg) {
      broadcast("player_chat", msg);
    },
  },
];
