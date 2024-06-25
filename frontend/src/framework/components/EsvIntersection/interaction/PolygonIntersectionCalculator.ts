import { IntersectedItem, IntersectionCalculator, IntersectionItemShape } from "../types/types";
import { isPointInPolygon } from "../utils/geometry";

export interface PolygonIntersectedItem extends IntersectedItem {
    shape: IntersectionItemShape.POLYGON;
    polygon: number[][];
}

export class PolygonIntersectionCalculator implements IntersectionCalculator {
    private _polygon: number[][];

    constructor(polygon: number[][]) {
        this._polygon = polygon;
    }

    calcIntersection(point: number[]): PolygonIntersectedItem | null {
        if (isPointInPolygon(point, this._polygon)) {
            return {
                shape: IntersectionItemShape.POLYGON,
                point,
                polygon: this._polygon,
            };
        }
        return null;
    }
}
