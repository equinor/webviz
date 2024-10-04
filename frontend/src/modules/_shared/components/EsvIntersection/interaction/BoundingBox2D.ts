import { BoundingVolume } from "../types/types";

export class BoundingBox2D implements BoundingVolume {
    private _minPoint: number[];
    private _maxPoint: number[];

    constructor(minPoint: number[], maxPoint: number[]) {
        this._minPoint = minPoint;
        this._maxPoint = maxPoint;
    }

    getMinPoint(): number[] {
        return this._minPoint;
    }

    getMaxPoint(): number[] {
        return this._maxPoint;
    }

    contains(point: number[], margin: number = 0): boolean {
        return (
            this._minPoint[0] - margin <= point[0] &&
            this._maxPoint[0] + margin >= point[0] &&
            this._minPoint[1] - margin <= point[1] &&
            this._maxPoint[1] + margin >= point[1]
        );
    }
}
