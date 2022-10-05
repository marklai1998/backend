const cache = require("../cache");

export function replacePlaceholders(str: any) {
  for (const [key, value] of Object.entries(cache.cache)) {
    str = str.replaceAll(`{${key}}`, value);
  }
  return str;
}
