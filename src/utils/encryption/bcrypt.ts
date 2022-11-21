const bcrypt = require("bcrypt");

export function hash(toHash: string, rounds?: number) {
  return bcrypt.hash(toHash, rounds || 10);
}

export function check(toCheck: string, hash: string) {
  return bcrypt.compare(toCheck, hash);
}
