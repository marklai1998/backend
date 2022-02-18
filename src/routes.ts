import { GeneralController } from "./controller/GeneralController";
import { UserController } from "./controller/UserController";
import { BlockController } from "./controller/BlockController";
import { DistrictController } from "./controller/DistrictController";
import { MinecraftController } from "./controller/MinecraftController";
import { AdminSettingController } from "./controller/AdminSettingController";

export const Routes = [
  // Registration & Login
  {
    method: "post",
    route: "/register",
    controller: UserController,
    action: "register",
  },
  {
    method: "post",
    route: "/login",
    controller: UserController,
    action: "login",
  },
  // General
  {
    method: "get",
    route: "/api/importfromsheet/:district",
    controller: GeneralController,
    action: "importFromSheet",
  },
  {
    method: "get",
    route: "/api/network/ping",
    controller: GeneralController,
    action: "pingNetwork",
  },
  {
    method: "get",
    route: "/api/network/ping/:server",
    controller: GeneralController,
    action: "pingServer",
  },
  {
    method: "get",
    route: "/api/progress",
    controller: GeneralController,
    action: "overview",
  },
  // Admin Settings
  {
    method: "get",
    route: "/api/admin/settings/get/:setting",
    controller: AdminSettingController,
    action: "getOne",
  },
  {
    method: "get",
    route: "/api/admin/settings/get",
    controller: AdminSettingController,
    action: "getAll",
  },
  {
    method: "post",
    route: "/api/admin/settings/set",
    controller: AdminSettingController,
    action: "set",
  },
  // Districts
  {
    method: "get",
    route: "/api/districts/get",
    controller: DistrictController,
    action: "getAll",
  },
  {
    method: "get",
    route: "/api/districts/get/:name",
    controller: DistrictController,
    action: "getOne",
  },
  {
    method: "post",
    route: "/api/districts/create",
    controller: DistrictController,
    action: "create",
  },
  {
    method: "post",
    route: "/api/districts/delete",
    controller: DistrictController,
    action: "delete",
  },
  // Blocks
  {
    method: "get",
    route: "/api/blocks/get/:district/:blockID",
    controller: BlockController,
    action: "getOne",
  },
  {
    method: "post",
    route: "/api/blocks/create",
    controller: BlockController,
    action: "create",
  },
  {
    method: "post",
    route: "/api/blocks/delete",
    controller: BlockController,
    action: "delete",
  },
  {
    method: "post",
    route: "/api/blocks/setProgress",
    controller: BlockController,
    action: "setProgress",
  },
  {
    method: "post",
    route: "/api/blocks/setDetails",
    controller: BlockController,
    action: "setDetails",
  },
  {
    method: "post",
    route: "/api/blocks/addBuilder",
    controller: BlockController,
    action: "addBuilder",
  },
  {
    method: "post",
    route: "/api/blocks/removeBuilder",
    controller: BlockController,
    action: "removeBuilder",
  },
  // Minecraft
  {
    method: "get",
    route: "/api/minecraft/users",
    controller: MinecraftController,
    action: "getAll",
  },
  {
    method: "get",
    route: "/api/minecraft/users/:user",
    controller: MinecraftController,
    action: "getOne",
  },
  {
    method: "post",
    route: "/api/minecraft/registerUser",
    controller: MinecraftController,
    action: "create",
  },
  {
    method: "post",
    route: "/api/minecraft/deleteUser",
    controller: MinecraftController,
    action: "delete",
  },
  {
    method: "post",
    route: "/api/minecraft/updateUser",
    controller: MinecraftController,
    action: "update",
  },
  {
    method: "post",
    route: "/api/minecraft/setSettings",
    controller: MinecraftController,
    action: "setSettings",
  },
];
