import * as bbox from "./bbox";
import * as vec3 from "./vec3";

export type OBBox = {
    centerPoint: vec3.Vec3;
    principalAxes: vec3.Vec3[];
    halfExtents: number[];
};

/**
 * Creates a new oriented bounding box.
 */
export function create(center: vec3.Vec3, principalAxes: vec3.Vec3[], halfExtents: number[]): OBBox {
    return { centerPoint: center, principalAxes, halfExtents };
}

/*
 * Returns true if the oriented bounding box contains the given point.
 */
export function containsPoint(box: OBBox, point: vec3.Vec3): boolean {
    const diff = vec3.subtract(point, box.centerPoint);
    return (
        Math.abs(vec3.dot(diff, box.principalAxes[0])) <= box.halfExtents[0] &&
        Math.abs(vec3.dot(diff, box.principalAxes[1])) <= box.halfExtents[1] &&
        Math.abs(vec3.dot(diff, box.principalAxes[2])) <= box.halfExtents[2]
    );
}

/**
 * Converts an oriented bounding box to an axis-aligned bounding box.
 */
export function toAxisAlignedBoundingBox(box: OBBox): bbox.BBox {
    const absAxisX = vec3.abs(box.principalAxes[0]);
    const absAxisY = vec3.abs(box.principalAxes[1]);
    const absAxisZ = vec3.abs(box.principalAxes[2]);

    const halfSize: vec3.Vec3 = {
        x: box.halfExtents[0] * absAxisX.x + box.halfExtents[1] * absAxisY.x + box.halfExtents[2] * absAxisZ.x,
        y: box.halfExtents[0] * absAxisX.y + box.halfExtents[1] * absAxisY.y + box.halfExtents[2] * absAxisZ.y,
        z: box.halfExtents[0] * absAxisX.z + box.halfExtents[1] * absAxisY.z + box.halfExtents[2] * absAxisZ.z,
    };
    return bbox.create(vec3.subtract(box.centerPoint, halfSize), vec3.add(box.centerPoint, halfSize));
}

export function fromAxisAlignedBoundingBox(box: bbox.BBox): OBBox {
    const centerPoint = vec3.scale(vec3.add(box.min, box.max), 0.5);
    const principalAxes = [vec3.create(1, 0, 0), vec3.create(0, 1, 0), vec3.create(0, 0, 1)];
    const halfExtents = vec3.scale(vec3.subtract(box.max, box.min), 0.5);
    return create(centerPoint, principalAxes, [halfExtents.x, halfExtents.y, halfExtents.z]);
}

/**
 * Returns true if outerBox contains innerBox.
 */
export function containsBox(outerBox: OBBox, innerBox: OBBox): boolean {
    const points = calcCornerPoints(innerBox);
    for (const point of points) {
        if (!containsPoint(outerBox, point)) {
            return false;
        }
    }
    return true;
}

/**
 *  Returns the corner points of the oriented bounding box.
 *
 *  The points are returned in the following order for z-axis up coordinate system:
 *  0: bottom front left
 *  1: bottom front right
 *  2: bottom back left
 *  3: bottom back right
 *  4: top front left
 *  5: top front right
 *  6: top back left
 *  7: top back right
 */

export function calcCornerPoints(box: OBBox): vec3.Vec3[] {
    const halfExtents = box.halfExtents;
    const principalAxes = box.principalAxes;
    const centerPoint = box.centerPoint;

    const points: vec3.Vec3[] = [];
    for (let i = 0; i < 8; i++) {
        const x = (i & 1) === 0 ? -1 : 1;
        const y = (i & 2) === 0 ? -1 : 1;
        const z = (i & 4) === 0 ? -1 : 1;
        const point = vec3.add(
            centerPoint,
            vec3.add(
                vec3.scale(principalAxes[0], x * halfExtents[0]),
                vec3.add(
                    vec3.scale(principalAxes[1], y * halfExtents[1]),
                    vec3.scale(principalAxes[2], z * halfExtents[2]),
                ),
            ),
        );
        points.push(point);
    }
    return points;
}

/**
 * Creates an oriented bounding box from the given corner points.
 */
export function fromCornerPoints(points: vec3.Vec3[]): OBBox {
    const min = vec3.create(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
    const max = vec3.create(-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE);
    for (const point of points) {
        min.x = Math.min(min.x, point.x);
        min.y = Math.min(min.y, point.y);
        min.z = Math.min(min.z, point.z);
        max.x = Math.max(max.x, point.x);
        max.y = Math.max(max.y, point.y);
        max.z = Math.max(max.z, point.z);
    }
    const center = vec3.scale(vec3.add(min, max), 0.5);
    const halfExtents = vec3.scale(vec3.subtract(max, min), 0.5);
    const principalAxes = [
        vec3.normalize(vec3.subtract(points[0], points[1])),
        vec3.normalize(vec3.subtract(points[0], points[2])),
        vec3.normalize(vec3.subtract(points[0], points[4])),
    ];
    return create(center, principalAxes, [halfExtents.x, halfExtents.y, halfExtents.z]);
}

/**
 * Combines two oriented bounding boxes into a new oriented bounding box that contains both input boxes.
 */
export function combine(box1: OBBox, box2: OBBox): OBBox {
    const points1 = calcCornerPoints(box1);
    const points2 = calcCornerPoints(box2);
    const allPoints = points1.concat(points2);
    const min = vec3.create(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
    const max = vec3.create(-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE);
    for (const point of allPoints) {
        min.x = Math.min(min.x, point.x);
        min.y = Math.min(min.y, point.y);
        min.z = Math.min(min.z, point.z);
        max.x = Math.max(max.x, point.x);
        max.y = Math.max(max.y, point.y);
        max.z = Math.max(max.z, point.z);
    }
    const center = vec3.scale(vec3.add(min, max), 0.5);
    const halfExtents = vec3.scale(vec3.subtract(max, min), 0.5);
    const principalAxes = [
        vec3.normalize(vec3.subtract(points1[0], points1[1])),
        vec3.normalize(vec3.subtract(points1[0], points1[2])),
        vec3.normalize(vec3.subtract(points1[0], points1[4])),
    ];
    return create(center, principalAxes, [halfExtents.x, halfExtents.y, halfExtents.z]);
}

/**
 * Clones the given oriented bounding box.
 */
export function clone(box: OBBox): OBBox {
    return create(
        vec3.clone(box.centerPoint),
        [vec3.clone(box.principalAxes[0]), vec3.clone(box.principalAxes[1]), vec3.clone(box.principalAxes[2])],
        [...box.halfExtents],
    );
}
