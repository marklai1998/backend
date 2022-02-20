import * as jwt from "jsonwebtoken";

const secretInternal = "$C&F)J@NcRfUjWnZr4u7x!A%D*G-KaPd";
const secretUserData = "ShVmYq3t6w9z$C&E)H@McQfTjWnZr4u7";

function generateToken(data: string, secret: string) {
  return jwt.sign(
    {
      data: data,
    },
    secret
  );
}

export { jwt, generateToken, secretInternal, secretUserData };
