
import type { IntersectedItem, IntersectionCalculator } from "../types/types";
import { IntersectionItemShape } from "../types/types";

export interface PointIntersectedItem extends IntersectedItem {
    shape: IntersectionItemShape.POINT;
}

export class PointIntersectionCalculator implements IntersectionCalculator {
    private _point: number[];
    private _getMargin: () => number;

    constructor(point: number[], getMargin: () => number = () => 10) {
        this._point = point;
        this._getMargin = getMargin;
    }

    calcIntersection(point: number[]): PointIntersectedItem | null {
        const margin = this._getMargin();
        const dx = point[0] - this._point[0];
        const dy = point[1] - this._point[1];
        if (dx * dx + dy * dy > margin * margin) {
            return null;
        }

        return {
            shape: IntersectionItemShape.POINT,
            point: this._point,
        };
    }
}
