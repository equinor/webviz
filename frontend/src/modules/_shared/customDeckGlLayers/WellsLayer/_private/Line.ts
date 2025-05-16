import * as vec3 from "@lib/utils/vec3";

export type Line = {
    point: vec3.Vec3;
    direction: vec3.Vec3;
};

export function fromPoints(p1: vec3.Vec3, p2: vec3.Vec3): Line {
    return {
        point: p1,
        direction: vec3.subtract(p2, p1),
    };
}

export function fromPointAndDirection(point: vec3.Vec3, direction: vec3.Vec3): Line {
    return {
        point,
        direction,
    };
}

export function intersect(line1: Line, line2: Line): vec3.Vec3 | null {
    const cross = vec3.cross(line1.direction, line2.direction);
    const crossLength = vec3.length(cross);
    if (crossLength < 1e-6) {
        return null;
    }

    const line1ToLine2 = vec3.subtract(line2.point, line1.point);
    const t = vec3.dot(vec3.cross(line1ToLine2, line2.direction), cross) / crossLength ** 2;
    return vec3.add(line1.point, vec3.scale(line1.direction, t));
}
