import { BoundingVolume } from "../types/types";

export class BoundingSphere2D implements BoundingVolume {
    private _center: number[];
    private _radius: number;

    constructor(center: number[], radius: number) {
        this._center = center;
        this._radius = radius;
    }

    getCenter(): number[] {
        return this._center;
    }

    getRadius(): number {
        return this._radius;
    }

    contains(point: number[]): boolean {
        return (
            Math.pow(point[0] - this._center[0], 2) + Math.pow(point[1] - this._center[1], 2) <=
            Math.pow(this._radius, 2)
        );
    }
}
