import { Cache } from "../cache";

const Placeholders = {
  reviews: Cache.reviews,
  projects_today: Cache.projects_today,
};

export function replacePlaceholders(str: any) {
  for (const [key, value] of Object.entries(Placeholders)) {
    str = str.replaceAll(`{${key}}`, value);
  }
  return str;
}
