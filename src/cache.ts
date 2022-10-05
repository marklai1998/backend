// resets on backend restart
module.exports = {
  cache: {},
  get: function (key: string) {
    return this.cache[key];
  },
  set: function (key: string, val: any) {
    this.cache[key] = val;
  },
  inc: function (key: string) {
    if (typeof this.cache[key] === "number") {
      this.cache[key]++;
    }
  },
  dec: function (key: string) {
    if (typeof this.cache[key] === "number") {
      this.cache[key]--;
    }
  },
  loadDefaults: function () {
    this.set("reviews", 0);
    this.set("projects_total", 0);
    this.set("total_requests", 0);
    this.set("successful_requests", 0);
    this.set("errors", 0);
  },
};
