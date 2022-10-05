import { User } from "../entity/User";
import { Permissions } from "../routes";
import { sendToRoom } from "./SocketManager";

const cache = require("../cache");

interface Room {
  name: string;
  permission: number;
  join_message: { event: string; message_key: string };
}

const Rooms: Room[] = [
  {
    name: "motd",
    permission: Permissions.default,
    join_message: { event: "motd", message_key: "current_motd" },
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
  };

  if (room) {
    if (room.permission > Permissions.default) {
      const user = await User.findOne({ apikey: key });

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
