import { User } from "../../entity/User";

export {};

declare global {
  namespace Express {
    export interface Request {
      user?: User;
      token?: string;
    }
  }
}
