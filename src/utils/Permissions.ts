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
