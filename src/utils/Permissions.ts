export const Permissions = {
  default: 0,
  event: 1,
  builder: 2,
  moderator: 3,
  admin: 4,
};

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

export function mcRankToColor(rank: string): string {
  switch (rank) {
    case "Owner":
      return "#AA0000";
    case "Administrator":
      return "#FF5555";
    case "Moderator":
      return "#00AAAA";
    case "Developer":
      return "#55FFFF";
    case "Supporter":
      return "#5555FF";
    case "Architect":
      return "#0000AA";
    case "Communication":
      return "#AA00AA";
    case "Premium":
      return "#FFAA00";
    default:
      return "#55FF55";
  }
}
