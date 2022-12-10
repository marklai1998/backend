import lodash = require("lodash");

function getObjectDifferences(obj1: any, obj2: any) {
  const diff = Object.keys(obj1).reduce((result, key) => {
    if (!obj2.hasOwnProperty(key)) {
      result.push(key);
    } else if (lodash.isEqual(obj1[key], obj2[key])) {
      const resultKeyIndex = result.indexOf(key);
      result.splice(resultKeyIndex, 1);
    }
    return result;
  }, Object.keys(obj2));
  return diff;
}

function checkJsonKeys(json: object, keys: string[]) {
  for (const key of keys) {
    if (!json.hasOwnProperty(key)) {
      return { error: `Specify ${key}` };
    }
  }
}

function updateJson(orgiginalJson: any, updates: any): number {
  let counter = 0;
  for (const [key, value] of Object.entries(updates)) {
    if (key.toLowerCase() === "id" || key.toLowerCase() === "uuid") continue;
    if (typeof orgiginalJson[key] !== typeof value) continue;

    if (orgiginalJson[key] !== undefined) {
      if (typeof value === "object") {
        if (Array.isArray(orgiginalJson[key])) {
          if (!value["id"]) continue;

          const element = orgiginalJson[key].find(
            (e: any) => e.id === value["id"]
          );

          if (element) {
            counter += updateJson(element, value);
          } else {
            orgiginalJson[key].push(value);
          }
        } else {
          counter += updateJson(orgiginalJson[key], value);
        }
      } else {
        orgiginalJson[key] = value;
      }
    }
  }
  return counter;
}

function setAttributeJson(json: object, path: string, value: any) {
  var k = json;
  var steps = path.split(".");
  var last = steps.pop();
  steps.forEach((e) => (k[e] = k[e] || {}) && (k = k[e]));
  k[last] = value;
}

function dynamicSort(property: string) {
  var sortOrder = 1;
  if (property[0] === "-") {
    sortOrder = -1;
    property = property.substr(1);
  }
  return function (a, b) {
    /* next line works with strings and numbers,
     * and you may want to customize it to your needs
     */
    var result =
      a[property] > b[property] ? -1 : a[property] < b[property] ? 1 : 0;
    return result * sortOrder;
  };
}

export {
  getObjectDifferences,
  checkJsonKeys,
  updateJson,
  setAttributeJson,
  dynamicSort,
};
