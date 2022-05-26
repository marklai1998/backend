// import { NextFunction, Request, Response } from "express";

// import * as index from "../index";

// import { MinecraftUser } from "../entity/MinecraftUser";

// export class MinecraftController {
//   async create(request: Request, response: Response, next: NextFunction) {
//     let user = await MinecraftUser.findOne({ uuid: request.body.uuid });

//     if (user) {
//       return index.generateError("UUID already exists");
//     }

//     user = new MinecraftUser();
//     user.uuid = request.body.uuid;
//     user.username = request.body.username;
//     user.rank = request.body.rank || "Player";
//     user.settings = request.body.settings || "{}";

//     return index.getValidation(user, "Minecraft User registered");
//   }

//   async delete(request: Request, response: Response, next: NextFunction) {
//     if (!request.body.uuid) {
//       return index.generateError("Specify UUID");
//     }
//     const user = await MinecraftUser.findOne({ uuid: request.body.uuid });

//     if (!user) {
//       return index.generateError("UUID not found");
//     }

//     await MinecraftUser.remove(user);
//     return index.generateSuccess("Minecraft User deleted");
//   }

//   async getAll(request: Request, response: Response, next: NextFunction) {
//     const players = await MinecraftUser.find();

//     const res = [];
//     for (const player of players) {
//       res.push(player.toJson());
//     }

//     return res;
//   }

//   async getOne(request: Request, response: Response, next: NextFunction) {
//     const player =
//       (await MinecraftUser.findOne({ username: request.params.user })) ||
//       (await MinecraftUser.findOne({ uuid: request.params.user }));

//     if (!player) {
//       return index.generateError("Player not found");
//     }
//     return player.toJson();
//   }

//   async update(request: Request, response: Response, next: NextFunction) {
//     if (!request.body.uuid) {
//       return index.generateError("Specify UUID");
//     }
//     if (!request.body.type || !request.body.value) {
//       return index.generateError("Specify a type and a value");
//     }

//     const user = await MinecraftUser.findOne({ uuid: request.body.uuid });

//     if (!user) {
//       return index.generateError("UUID not found");
//     }

//     return user.update(request.body.type, request.body.value);
//   }

//   async setSettings(request: Request, response: Response, next: NextFunction) {
//     if (!request.body.uuid) {
//       return index.generateError("Specify UUID");
//     }
//     if (!request.body.type || !request.body.value) {
//       return index.generateError("Specify a type and a value");
//     }

//     const user = await MinecraftUser.findOne({ uuid: request.body.uuid });

//     if (!user) {
//       return index.generateError("UUID not found");
//     }

//     return user.setSetting(request.body.type, request.body.value);
//   }
// }
