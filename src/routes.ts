import { UserController } from "./controller/UserController";
import { DistrictController } from "./controller/DistrictController";
import { MinecraftController } from "./controller/MinecraftController";

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
  // Districts
  {
    method: "get",
    route: "/api/districts",
    controller: DistrictController,
    action: "getAll",
  },
  {
    method: "get",
    route: "/api/districts/:name",
    controller: DistrictController,
    action: "getOne",
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
];
