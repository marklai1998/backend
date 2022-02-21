import { GeneralController } from "./controller/GeneralController";
import { UserController } from "./controller/UserController";
import { BlockController } from "./controller/BlockController";
import { DistrictController } from "./controller/DistrictController";
import { MinecraftController } from "./controller/MinecraftController";
import { AdminSettingController } from "./controller/AdminSettingController";
import { ProjectCountController } from "./controller/ProjectCountController";

// Permissions:
// 0: default
// 1: builder
// 4: admin

export const Routes = [
  // Users
  {
    method: "post",
    route: "/register",
    controller: UserController,
    action: "register",
    permission: 0,
  },
  {
    method: "post",
    route: "/login",
    controller: UserController,
    action: "login",
    permission: 0,
  },
  {
    method: "post",
    route: "/api/createKey",
    controller: UserController,
    action: "generateAPIKey",
    permission: 0,
  },
  {
    method: "post",
    route: "/api/users/update",
    controller: UserController,
    action: "update",
    permission: 4,
  },
  // General
  {
    method: "get",
    route: "/api/network/ping",
    controller: GeneralController,
    action: "pingNetwork",
    permission: 0,
  },
  {
    method: "get",
    route: "/api/network/ping/:server",
    controller: GeneralController,
    action: "pingServer",
    permission: 0,
  },
  {
    method: "get",
    route: "/api/progress",
    controller: GeneralController,
    action: "overview",
    permission: 0,
  },
  // Admin Settings
  {
    method: "get",
    route: "/api/admin/settings/get/:setting",
    controller: AdminSettingController,
    action: "getOne",
    permission: 4,
  },
  {
    method: "get",
    route: "/api/admin/settings/get",
    controller: AdminSettingController,
    action: "getAll",
    permission: 4,
  },
  {
    method: "post",
    route: "/api/admin/settings/set",
    controller: AdminSettingController,
    action: "set",
    permission: 4,
  },
  // Districts
  {
    method: "get",
    route: "/api/districts/get",
    controller: DistrictController,
    action: "getAll",
    permission: 0,
  },
  {
    method: "get",
    route: "/api/districts/get/:name",
    controller: DistrictController,
    action: "getOne",
    permission: 0,
  },
  {
    method: "post",
    route: "/api/districts/create",
    controller: DistrictController,
    action: "create",
    permission: 4,
  },
  {
    method: "post",
    route: "/api/districts/delete",
    controller: DistrictController,
    action: "delete",
    permission: 4,
  },
  // Blocks
  {
    method: "get",
    route: "/api/blocks/get/:district/:blockID",
    controller: BlockController,
    action: "getOne",
    permission: 0,
  },
  {
    method: "post",
    route: "/api/blocks/create",
    controller: BlockController,
    action: "create",
    permission: 4,
  },
  {
    method: "post",
    route: "/api/blocks/delete",
    controller: BlockController,
    action: "delete",
    permission: 4,
  },
  {
    method: "post",
    route: "/api/blocks/setProgress",
    controller: BlockController,
    action: "setProgress",
    permission: 1,
  },
  {
    method: "post",
    route: "/api/blocks/setDetails",
    controller: BlockController,
    action: "setDetails",
    permission: 1,
  },
  {
    method: "post",
    route: "/api/blocks/addBuilder",
    controller: BlockController,
    action: "addBuilder",
    permission: 1,
  },
  {
    method: "post",
    route: "/api/blocks/removeBuilder",
    controller: BlockController,
    action: "removeBuilder",
    permission: 1,
  },
  // Projects
  {
    method: "get",
    route: "/api/projects/get/:date",
    controller: ProjectCountController,
    action: "getOne",
    permission: 0,
  },
  {
    method: "get",
    route: "/api/projects/get",
    controller: ProjectCountController,
    action: "getAll",
    permission: 0,
  },
  {
    method: "post",
    route: "/api/projects/set",
    controller: ProjectCountController,
    action: "set",
    permission: 4,
  },
  // Minecraft
  {
    method: "get",
    route: "/api/minecraft/users",
    controller: MinecraftController,
    action: "getAll",
    permission: 4,
  },
  {
    method: "get",
    route: "/api/minecraft/users/:user",
    controller: MinecraftController,
    action: "getOne",
    permission: 4,
  },
  {
    method: "post",
    route: "/api/minecraft/registerUser",
    controller: MinecraftController,
    action: "create",
    permission: 4,
  },
  {
    method: "post",
    route: "/api/minecraft/deleteUser",
    controller: MinecraftController,
    action: "delete",
    permission: 4,
  },
  {
    method: "post",
    route: "/api/minecraft/updateUser",
    controller: MinecraftController,
    action: "update",
    permission: 4,
  },
  {
    method: "post",
    route: "/api/minecraft/setSettings",
    controller: MinecraftController,
    action: "setSettings",
    permission: 4,
  },
  // Sheet Imports
  {
    method: "get",
    route: "/api/import/projects",
    controller: ProjectCountController,
    action: "import",
    permission: 4,
  },
  {
    method: "get",
    route: "/api/import/districts",
    controller: DistrictController,
    action: "import",
    permission: 4,
  },
  {
    method: "get",
    route: "/api/import/blocks/:district",
    controller: BlockController,
    action: "import",
    permission: 4,
  },
];
