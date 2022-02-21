function parseDate(date: string | Date) {
  if (date === null) {
    return null;
  }
  return new Date(date).toLocaleDateString();
}

export { parseDate };
