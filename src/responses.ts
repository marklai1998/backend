import { validate } from "class-validator";
import { BaseEntity } from "typeorm";

export default {
  success: ({
    message = undefined,
    code = 200,
    data = undefined,
  }: { message?: string; code?: number; data?: any } = {}) => {
    return { error: false, code, message, data };
  },
  error: (
    { message = null, code = 500 }: { message: string; code?: number } = {
      message: null,
    }
  ) => {
    return { error: true, code, message };
  },
  validate: async (
    object: BaseEntity,
    successMessage: string,
    successData?: any
  ) => {
    const errors = await validate(object);

    if (errors.length > 0) {
      return {
        error: true,
        code: 400,
        message: Object.values(errors[0].constraints)[0],
      };
    }

    await object.save();
    return {
      error: false,
      code: 200,
      message: successMessage,
      data: successData,
    };
  },
};
