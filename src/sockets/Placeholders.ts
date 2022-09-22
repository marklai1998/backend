import { Cache } from "../cache";

export function replacePlaceholders(str: any) {
  for (const [key, value] of Object.entries(Cache)) {
    str = str.replaceAll(`{${key}}`, value);
  }
  return str;
}
