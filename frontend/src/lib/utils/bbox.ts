import * as vec3 from "./vec3";

/**
 * A bounding box.
 */
export type BBox = {
    min: vec3.Vec3;
    max: vec3.Vec3;
};

/**
 * Creates a new bounding box.
 * @param min The minimum point of the bounding box.
 * @param max The maximum point of the bounding box.
 * @returns A new bounding box.
 */
export function create(min: vec3.Vec3, max: vec3.Vec3): BBox {
    return { min, max };
}

/**
 * Returns true if the bounding box contains the given point.
 * @param box The bounding box.
 * @param point The point.
 * @returns True if the bounding box contains the point.
 */
export function containsPoint(box: BBox, point: vec3.Vec3): boolean {
    return (
        point.x >= box.min.x &&
        point.x <= box.max.x &&
        point.y >= box.min.y &&
        point.y <= box.max.y &&
        point.z >= box.min.z &&
        point.z <= box.max.z
    );
}

/**
 * Returns true if the two bounding boxes intersect.
 * @param box1 The first bounding box.
 * @param box2 The second bounding box.
 * @returns True if the two bounding boxes intersect.
 */
export function intersects(box1: BBox, box2: BBox): boolean {
    return (
        box1.min.x <= box2.max.x &&
        box1.max.x >= box2.min.x &&
        box1.min.y <= box2.max.y &&
        box1.max.y >= box2.min.y &&
        box1.min.z <= box2.max.z &&
        box1.max.z >= box2.min.z
    );
}

/**
 * Returns true if outerBox contains innerBox.
 * @param outerBox The outer bounding box.
 * @param innerBox The inner bounding box.
 * @returns True if outerBox contains innerBox.
 */
export function outerBoxcontainsInnerBox(outerBox: BBox, innerBox: BBox): boolean {
    return (
        outerBox.min.x <= innerBox.min.x &&
        outerBox.min.y <= innerBox.min.y &&
        outerBox.min.z <= innerBox.min.z &&
        outerBox.max.x >= innerBox.max.x &&
        outerBox.max.y >= innerBox.max.y &&
        outerBox.max.z >= innerBox.max.z
    );
}

/**
 * Converts a bounding box to an array of numbers.
 * The array contains the following numbers in the following order:
 * [min.x, min.y, min.z, max.x, max.y, max.z]
 *
 * @param box The bounding box.
 * @returns An array of numbers.
 */
export function toNumArray(box: BBox): [number, number, number, number, number, number] {
    return [box.min.x, box.min.y, box.min.z, box.max.x, box.max.y, box.max.z];
}

/**
 * Converts an array of numbers to a bounding box.
 * The array should contain the following numbers in the following order:
 * [min.x, min.y, min.z, max.x, max.y, max.z]
 *
 * @param array An array of numbers.
 * @returns A new bounding box.
 */
export function fromNumArray(array: [number, number, number, number, number, number]): BBox {
    return create(vec3.fromArray(array.slice(0, 3)), vec3.fromArray(array.slice(3, 6)));
}

/**
 * Clones the given bounding box.
 *
 * @param box The bounding box to clone.
 * @returns A new bounding box.
 */
export function clone(box: BBox): BBox {
    return create(vec3.clone(box.min), vec3.clone(box.max));
}

/**
 * Combines the two bounding boxes into a new bounding box that contains both.
 *
 * @param box1 The first bounding box.
 * @param box2 The second bounding box.
 *
 * @returns A new bounding box that holds both bounding boxes.
 */
export function combine(box1: BBox, box2: BBox): BBox {
    return create(
        vec3.create(
            Math.min(box1.min.x, box2.min.x),
            Math.min(box1.min.y, box2.min.y),
            Math.min(box1.min.z, box2.min.z)
        ),
        vec3.create(
            Math.max(box1.max.x, box2.max.x),
            Math.max(box1.max.y, box2.max.y),
            Math.max(box1.max.z, box2.max.z)
        )
    );
}
