export function isPointInPolygon(point: number[], polygon: number[][]): boolean {
    const numVertices = polygon.length;
    const x = point[0];
    const y = point[1];
    let inside = false;

    let p1 = polygon[0];
    let p2 = [0, 0];
    for (let i = 1; i <= numVertices; i++) {
        const idx = i % numVertices;
        p2 = polygon[idx];
        if (y > Math.min(p1[1], p2[1])) {
            if (y <= Math.max(p1[1], p2[1])) {
                if (x <= Math.max(p1[0], p2[0])) {
                    const xIntersection = ((y - p1[1]) * (p2[0] - p1[0])) / (p2[1] - p1[1]) + p1[0];
                    if (p1[0] === p2[0] || x <= xIntersection) {
                        inside = !inside;
                    }
                }
            }
        }

        p1 = p2;
    }

    return inside;
}

export function calcDistance(p1: number[], p2: number[]): number {
    return Math.sqrt(Math.pow(p1[0] - p2[0], 2) + Math.pow(p1[1] - p2[1], 2));
}

export function polygonFromVerticesAndIndices(
    startOffset: number,
    vertices: Float32Array,
    indices: Uint32Array | Uint16Array | Uint8Array
): number[][] {
    const polygon: number[][] = [];
    for (let i = 0; i < indices.length; i++) {
        polygon.push([startOffset + vertices[indices[i] * 2], vertices[indices[i] * 2 + 1]]);
    }
    return polygon;
}
