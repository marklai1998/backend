export const Permissions = {
  default: 0,
  event: 1,
  builder: 2,
  moderator: 3,
  admin: 4,
};

export function permissionToName(permission: number) {
  for (let key in Permissions) {
    if (Permissions[key] === permission) {
      return key;
    }
  }
  return "default";
}

export function mcRankToPermission(rank: string): number {
  switch (rank) {
    case "Owner":
    case "Administrator":
      return Permissions.admin;
    case "Moderator":
      return Permissions.moderator;
    case "Developer":
    case "Supporter":
    case "Architect":
      return Permissions.builder;
    default:
      return Permissions.default;
  }
}

export function mcRankToColor(rank: string): number {
  switch (rank) {
    case "Owner":
      return 0xaa0000;
    case "Administrator":
      return 0xff5555;
    case "Moderator":
      return 0x00aaaa;
    case "Developer":
      return 0x55ffff;
    case "Supporter":
      return 0x5555ff;
    case "Architect":
      return 0x0000aa;
    case "Communication":
      return 0xaa00aa;
    case "Premium":
      return 0xffaa00;
    default:
      return 0x55ff55;
  }
}
