import { AdminSettingController } from "./controller/AdminSettingController";
import { BlockController } from "./controller/BlockController";
import { DistrictController } from "./controller/DistrictController";
import { GeneralController } from "./controller/GeneralController";
import { LandmarkController } from "./controller/LandmarkController";
import { MapController } from "./controller/MapController";
import { MinecraftController } from "./controller/MinecraftController";
import { Permissions } from "./utils/Permissions";
import { PlayerStatController } from "./controller/PlayerStatController";
import { ProjectCountController } from "./controller/ProjectCountController";
import { ServerStatusController } from "./controller/ServerStatusController";
import { UserController } from "./controller/UserController";
import { WebhookController } from "./controller/WebhookController";

const Routes = [
  // Users
  {
    method: "post",
    route: "/login",
    controller: UserController,
    action: "login",
    permission: Permissions.default,
  },
  {
    method: "post",
    route: "/register",
    controller: UserController,
    action: "register",
    permission: Permissions.default,
  },
  {
    method: "post",
    route: "/register/verify",
    controller: UserController,
    action: "verifyRegistration",
    permission: Permissions.admin,
  },
  {
    method: "post",
    route: "/api/users/create",
    controller: UserController,
    action: "create",
    permission: Permissions.moderator,
  },
  {
    method: "get",
    route: "/api/users/get/:user",
    controller: UserController,
    action: "getOne",
    permission: Permissions.default,
  },
  {
    method: "get",
    route: "/api/users/get",
    controller: UserController,
    action: "getAll",
    permission: Permissions.default,
  },
  {
    method: "post",
    route: "/api/users/update",
    controller: UserController,
    action: "update",
    permission: Permissions.builder, // only self updates allowed
  },
  {
    method: "post",
    route: "/api/users/delete",
    controller: UserController,
    action: "delete",
    permission: Permissions.admin,
  },
  // Registrations
  {
    method: "get",
    route: "/api/users/registrations/get",
    controller: UserController,
    action: "getRegistrations",
    permission: Permissions.moderator,
  },
  {
    method: "post",
    route: "/api/users/registrations/handle",
    controller: UserController,
    action: "handleRegistration",
    permission: Permissions.moderator,
  },
  // Server Status
  {
    method: "get",
    route: "/api/network/ping",
    controller: GeneralController,
    action: "pingNetwork",
    permission: Permissions.default,
  },
  {
    method: "get",
    route: "/api/network/ping/:server",
    controller: GeneralController,
    action: "pingServer",
    permission: Permissions.default,
  },
  {
    method: "get",
    route: "/api/network/status",
    controller: ServerStatusController,
    action: "getAll",
    permission: Permissions.builder,
  },
  {
    method: "get",
    route: "/api/network/status/:server",
    controller: ServerStatusController,
    action: "getOne",
    permission: Permissions.builder,
  },
  // Admin Settings
  {
    method: "get",
    route: "/api/admin/status",
    controller: GeneralController,
    action: "adminOverview",
    permission: Permissions.admin,
  },
  {
    method: "get",
    route: "/api/admin/query",
    controller: GeneralController,
    action: "adminQuery",
    permission: Permissions.admin,
  },
  {
    method: "get",
    route: "/api/admin/settings/get/:setting",
    controller: AdminSettingController,
    action: "getOne",
    permission: Permissions.default, // Permissions handled later
  },
  {
    method: "get",
    route: "/api/admin/settings/get",
    controller: AdminSettingController,
    action: "getAll",
    permission: Permissions.admin,
  },
  {
    method: "post",
    route: "/api/admin/settings/set",
    controller: AdminSettingController,
    action: "set",
    permission: Permissions.admin,
  },
  {
    method: "get",
    route: "/api/admin/getRandomImage",
    controller: AdminSettingController,
    action: "getRandomImage",
    permission: Permissions.default,
  },
  // Districts
  {
    method: "get",
    route: "/api/districts/get",
    controller: DistrictController,
    action: "getAll",
    permission: Permissions.default,
  },
  {
    method: "get",
    route: "/api/districts/get/:name",
    controller: DistrictController,
    action: "getOne",
    permission: Permissions.default,
  },
  {
    method: "post",
    route: "/api/districts/create",
    controller: DistrictController,
    action: "create",
    permission: Permissions.moderator,
  },
  {
    method: "post",
    route: "/api/districts/delete",
    controller: DistrictController,
    action: "delete",
    permission: Permissions.moderator,
  },
  {
    method: "post",
    route: "/api/districts/edit",
    controller: DistrictController,
    action: "edit",
    permission: Permissions.moderator,
  },
  // Blocks
  {
    method: "get",
    route: "/api/blocks/get/:district/:blockID",
    controller: BlockController,
    action: "getOne",
    permission: Permissions.default,
  },
  {
    method: "get",
    route: "/api/blocks/get/:district",
    controller: BlockController,
    action: "getAll",
    permission: Permissions.default,
  },
  {
    method: "get",
    route: "/api/blocks/get/",
    controller: BlockController,
    action: "getEvery",
    permission: Permissions.default,
  },
  {
    method: "post",
    route: "/api/blocks/create",
    controller: BlockController,
    action: "create",
    permission: Permissions.admin,
  },
  {
    method: "post",
    route: "/api/blocks/createmultiple",
    controller: BlockController,
    action: "createMultiple",
    permission: Permissions.admin,
  },
  {
    method: "post",
    route: "/api/blocks/delete",
    controller: BlockController,
    action: "delete",
    permission: Permissions.admin,
  },
  {
    method: "post",
    route: "/api/blocks/addLocation",
    controller: BlockController,
    action: "addLocation",
    permission: Permissions.builder,
  },
  {
    method: "post",
    route: "/api/blocks/removeLocation",
    controller: BlockController,
    action: "removeLocation",
    permission: Permissions.builder,
  },
  {
    method: "post",
    route: "/api/blocks/update",
    controller: BlockController,
    action: "update",
    permission: Permissions.builder,
  },
  {
    method: "post",
    route: "/api/blocks/setProgress",
    controller: BlockController,
    action: "setProgress",
    permission: Permissions.builder,
  },
  {
    method: "post",
    route: "/api/blocks/setDetails",
    controller: BlockController,
    action: "setDetails",
    permission: Permissions.builder,
  },
  {
    method: "post",
    route: "/api/blocks/setBuilder",
    controller: BlockController,
    action: "setBuilder",
    permission: Permissions.builder,
  },
  {
    method: "post",
    route: "/api/blocks/addBuilder",
    controller: BlockController,
    action: "addBuilder",
    permission: Permissions.builder,
  },
  {
    method: "post",
    route: "/api/blocks/removeBuilder",
    controller: BlockController,
    action: "removeBuilder",
    permission: Permissions.builder,
  },
  // Claims
  {
    method: "get",
    route: "/api/claims/:name",
    controller: BlockController,
    action: "getClaims",
    permission: Permissions.default,
  },
  // Landmarks
  {
    method: "post",
    route: "/api/landmarks/create",
    controller: LandmarkController,
    action: "create",
    permission: Permissions.moderator,
  },
  {
    method: "post",
    route: "/api/landmarks/delete",
    controller: LandmarkController,
    action: "delete",
    permission: Permissions.moderator,
  },
  {
    method: "get",
    route: "/api/landmarks/get",
    controller: LandmarkController,
    action: "getAll",
    permission: Permissions.builder,
  },
  {
    method: "get",
    route: "/api/landmarks/get/:id",
    controller: LandmarkController,
    action: "getOne",
    permission: Permissions.builder,
  },
  {
    method: "post",
    route: "/api/landmarks/edit",
    controller: LandmarkController,
    action: "edit",
    permission: Permissions.builder,
  },
  // PlayerStats
  {
    method: "get",
    route: "/api/playerstats/get/:date",
    controller: PlayerStatController,
    action: "getPlayerStat",
    permission: Permissions.default,
  },
  {
    method: "get",
    route: "/api/playerstats/get",
    controller: PlayerStatController,
    action: "getAllPlayerStats",
    permission: Permissions.default,
  },
  // Projects
  {
    method: "get",
    route: "/api/projects/get/:date",
    controller: ProjectCountController,
    action: "getOne",
    permission: Permissions.default,
  },
  {
    method: "get",
    route: "/api/projects/get",
    controller: ProjectCountController,
    action: "getAll",
    permission: Permissions.default,
  },
  {
    method: "post",
    route: "/api/projects/set",
    controller: ProjectCountController,
    action: "set",
    permission: Permissions.builder,
  },
  {
    method: "get",
    route: "/api/projects/milestones/:scale",
    controller: ProjectCountController,
    action: "getMilestones",
    permission: Permissions.default,
  },
  // Minecraft
  {
    method: "get",
    route: "/api/minecraft/users/get",
    controller: MinecraftController,
    action: "getAll",
    permission: Permissions.default,
  },
  {
    method: "get",
    route: "/api/minecraft/users/get/:user",
    controller: MinecraftController,
    action: "getOne",
    permission: Permissions.default,
  },
  {
    method: "post",
    route: "/api/minecraft/users/register",
    controller: MinecraftController,
    action: "create",
    permission: Permissions.admin,
  },
  {
    method: "post",
    route: "/api/minecraft/users/delete",
    controller: MinecraftController,
    action: "delete",
    permission: Permissions.admin,
  },
  {
    method: "post",
    route: "/api/minecraft/users/set",
    controller: MinecraftController,
    action: "update",
    permission: Permissions.admin,
  },
  {
    method: "post",
    route: "/api/minecraft/users/setSettings",
    controller: MinecraftController,
    action: "setSettings",
    permission: Permissions.admin,
  },
  // Webhooks
  {
    method: "get",
    route: "/api/webhooks/get",
    controller: WebhookController,
    action: "getAll",
    permission: Permissions.admin,
  },
  {
    method: "get",
    route: "/api/webhooks/get/:name",
    controller: WebhookController,
    action: "getOne",
    permission: Permissions.admin,
  },
  {
    method: "post",
    route: "/api/webhooks/create",
    controller: WebhookController,
    action: "create",
    permission: Permissions.admin,
  },
  {
    method: "post",
    route: "/api/webhooks/delete",
    controller: WebhookController,
    action: "delete",
    permission: Permissions.admin,
  },
  {
    method: "post",
    route: "/api/webhooks/update",
    controller: WebhookController,
    action: "update",
    permission: Permissions.admin,
  },
  {
    method: "post",
    route: "/api/webhooks/send",
    controller: WebhookController,
    action: "send",
    permission: Permissions.default, // Permissions handled later
  },
  // Custom Maps
  {
    method: "get",
    route: "/api/maps/get",
    controller: MapController,
    action: "getAll",
    permission: Permissions.builder,
  },
  {
    method: "get",
    route: "/api/maps/get/:id",
    controller: MapController,
    action: "getOne",
    permission: Permissions.builder,
  },
  {
    method: "post",
    route: "/api/maps/create",
    controller: MapController,
    action: "create",
    permission: Permissions.builder,
  },
  // Sheet Imports
  {
    method: "get",
    route: "/api/import/projects",
    controller: ProjectCountController,
    action: "import",
    permission: Permissions.admin,
  },
  {
    method: "get",
    route: "/api/import/playerstats",
    controller: PlayerStatController,
    action: "import",
    permission: Permissions.admin,
  },
  {
    method: "get",
    route: "/api/import/districts",
    controller: DistrictController,
    action: "import",
    permission: Permissions.admin,
  },
  {
    method: "get",
    route: "/api/import/blocks/:district",
    controller: BlockController,
    action: "import",
    permission: Permissions.admin,
  },
  // Other
  {
    method: "get",
    route: "/api/progress",
    controller: GeneralController,
    action: "overview",
    permission: Permissions.default,
  },
  {
    method: "get",
    route: "/links/:link",
    controller: GeneralController,
    action: "redirect",
    permission: Permissions.default,
  },
  {
    method: "get",
    route: "/search/:x/:y",
    controller: GeneralController,
    action: "search",
    permission: Permissions.default,
  },
];

export { Routes, Permissions };
