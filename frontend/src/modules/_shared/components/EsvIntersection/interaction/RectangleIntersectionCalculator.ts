import { BoundingBox2D } from "./BoundingBox2D";

import { IntersectedItem, IntersectionCalculator, IntersectionItemShape } from "../types/types";

export interface RectangleIntersectedItem extends IntersectedItem {
    shape: IntersectionItemShape.RECTANGLE;
}

export class RectangleIntersectionCalculator implements IntersectionCalculator {
    private _boundingBox: BoundingBox2D;

    constructor(point: number[][]) {
        this._boundingBox = new BoundingBox2D(point[0], point[1]);
    }

    calcIntersection(point: number[]): RectangleIntersectedItem | null {
        if (!this._boundingBox.contains(point)) {
            return null;
        }

        return {
            shape: IntersectionItemShape.RECTANGLE,
            point: point,
        };
    }
}
