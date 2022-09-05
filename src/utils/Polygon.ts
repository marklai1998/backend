
export function insidePolygon(p:any[], polygon:any[], start?:number, end?:number) {
    var intersections = 0;

    var prev = polygon[polygon.length - 1];
    for(const next of polygon) { 
        if((prev[1] <= p[1] && p[1] < next[1]) || (prev[1] >= p[1] && p[1] > next[1])) {
            var dy = next[1] - prev[1];
            var dx = next[0] - prev[0];
            var x = (p[1] - prev[1]) / dy * dx + prev[0];

            if (x > p[0]) {
                intersections++;
            }
        }
        prev = next;
    }
    return intersections % 2 == 1;
    /* var inside = false;
    if (start === undefined) start = 0;
    if (end === undefined) end = vs.length;
    var len = (end-start)/2;
    for (var i = 0, j = len - 1; i < len; j = i++) {
        var xi = vs[start+i*2+0], yi = vs[start+i*2+1];
        var xj = vs[start+j*2+0], yj = vs[start+j*2+1];
        var intersect = ((yi > y) !== (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;*/
};