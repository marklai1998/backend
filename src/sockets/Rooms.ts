import { Permissions } from "../routes";
import { User } from "../entity/User";
import { sendToRoom } from "./SocketManager";
import * as dbCache from "../utils/cache/DatabaseCache";

const cache = require("../cache");

interface Room {
  name: string;
  permission: number;
  join_message?: { event: string; message_key: string };
  events?: { name: string; callback: (msg: any) => void }[];
}

const Rooms: Room[] = [
  // Send Message of the day Broadcast
  {
    name: "motd",
    permission: Permissions.default,
    join_message: { event: "motd", message_key: "current_motd" },
  },
  // Send Block Update Information
  {
    name: "block_updates",
    permission: Permissions.default,
  },
  // Send Player Locations
  {
    name: "playerdata",
    permission: Permissions.default,
  },
  // Receive playerdata from nyc server
  {
    name: "nyc_server",
    permission: Permissions.default,
    events: [
      {
        name: "players",
        callback: (msg: any) => {
          sendToRoom("playerdata", "player_locations", msg);
        },
      },
      {
        name: "playerJoin",
        callback: (msg: any) => {
          const joinedPlayer = JSON.parse(msg);
          const user = dbCache.findOne(User, { mc_uuid: joinedPlayer.uuid });

          dbCache.update(user, { online: true });

          sendToRoom("playerdata", "player_join", msg);
        },
      },
      {
        name: "playerLeave",
        callback: (msg: any) => {
          const joinedPlayer = JSON.parse(msg);
          const user = dbCache.findOne(User, { mc_uuid: joinedPlayer.uuid });

          dbCache.update(user, { online: false });

          sendToRoom("playerdata", "player_leave", msg);
        },
      },
      {
        name: "chat",
        callback: (msg: any) => {
          sendToRoom("playerdata", "player_chat", msg);
        },
      },
    ],
  },
];

async function joinRoom(
  socket: any,
  name: string,
  key?: string
): Promise<void> {
  const room = getRoomByName(name);

  const join = (r: Room) => {
    socket.join(r.name);

    if (r.join_message) {
      sendToRoom(
        socket.id,
        r.join_message.event,
        cache.get(r.join_message.message_key)
      );
    }
    if (r.events) {
      for (const event of r.events) {
        socket.on(event.name, event.callback);
      }
    }
  };

  if (room) {
    if (room.permission > Permissions.default) {
      const user = await User.findOneBy({ apikey: key });

      if (user?.permission >= room.permission) {
        join(room);
      }
    } else {
      join(room);
    }
  }
}
function getRoomByName(name: string): Room {
  return Rooms.find(
    (room: Room) => room.name.toLowerCase() === name.toLowerCase()
  );
}

export { joinRoom, getRoomByName };
