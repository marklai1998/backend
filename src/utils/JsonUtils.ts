export function setAttributeJson(json: object, path: string, value: any) {
  var k = json;
  var steps = path.split(".");
  var last = steps.pop();
  steps.forEach((e) => (k[e] = k[e] || {}) && (k = k[e]));
  k[last] = value;
}

export function dynamicSort(property: string) {
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
