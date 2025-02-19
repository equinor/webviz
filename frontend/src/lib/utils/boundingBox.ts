import { BoundingBox3D_api } from "@api";

import * as vec3 from "./vec3";

export type BBox = {
    min: vec3.Vec3;
    max: vec3.Vec3;
};

/*
    Creates a new bounding box.
    */
export function create(min: vec3.Vec3, max: vec3.Vec3): BBox {
    return { min, max };
}

export function fromBoundingBox3DApi(boundingBox: BoundingBox3D_api): BBox {
    return create(
        vec3.create(boundingBox.xmin, boundingBox.ymin, boundingBox.zmin),
        vec3.create(boundingBox.xmax, boundingBox.ymax, boundingBox.zmax)
    );
}

/*
    Returns true if the bounding box contains the given point.
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

/*
    Returns true if the two bounding boxes intersect.
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

/*
  Converts a bounding box to an array of numbers.
  The array contains the following numbers in the following order:
    [min.x, min.y, min.z, max.x, max.y, max.z]
    */
export function toNumArray(box: BBox): [number, number, number, number, number, number] {
    return [box.min.x, box.min.y, box.min.z, box.max.x, box.max.y, box.max.z];
}

/*
    Converts an array of numbers to a bounding box.
    The array should contain the following numbers in the following order:
    [min.x, min.y, min.z, max.x, max.y, max.z]
    */
export function fromNumArray(array: [number, number, number, number, number, number]): BBox {
    return create(vec3.fromArray(array.slice(0, 3)), vec3.fromArray(array.slice(3, 6)));
}
