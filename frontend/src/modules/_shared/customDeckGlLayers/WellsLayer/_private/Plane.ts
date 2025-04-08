import * as vec3 from "@lib/utils/vec3";

import type { Line } from "./Line";

export type Plane = {
    normal: vec3.Vec3;
    point: vec3.Vec3;
    d: number; // Coefficient of constant term: d = -(a*x0 + b*y0 + c*z0)
    normalLength: number;
    distanceToOrigin: number;
};

export function fromNormalAndPoint(normal: vec3.Vec3, point: vec3.Vec3): Plane {
    const d = -vec3.dot(normal, point);
    const normalLength = vec3.length(normal);
    const distanceToOrigin = -d / normalLength;
    return { normal, point, d, normalLength, distanceToOrigin };
}

export function getDistance(plane: Plane, point: vec3.Vec3): number {
    const dot = vec3.dot(plane.normal, point);
    return (dot + plane.d) / plane.normalLength;
}

export function normalize(plane: Plane): Plane {
    const inversedLength = 1.0 / plane.normalLength;
    const normal = vec3.normalize(plane.normal);
    const d = plane.d * inversedLength;
    return {
        normal,
        point: plane.point,
        d,
        normalLength: 1.0,
        distanceToOrigin: plane.distanceToOrigin * inversedLength,
    };
}

export function intersectLine(plane: Plane, line: Line): vec3.Vec3 | null {
    const dot1 = vec3.dot(plane.normal, line.point);
    const dot2 = vec3.dot(plane.normal, line.direction);

    if (dot2 === 0) {
        return null;
    }

    const t = -(dot1 + plane.d) / dot2;

    return vec3.add(line.point, vec3.scale(line.direction, t));
}

export function intersectPlane(plane1: Plane, plane2: Plane): Line | null {
    const v = vec3.cross(plane1.normal, plane2.normal);

    if (v.x === 0 && v.y === 0 && v.z === 0) {
        return null;
    }

    const dot = vec3.dot(v, v);
    const n1 = vec3.scale(plane2.normal, plane1.d);
    const n2 = vec3.scale(plane1.normal, -plane2.d);
    const p = vec3.scale(vec3.cross(vec3.add(n1, n2), v), 1 / dot);

    return { point: p, direction: v };
}
