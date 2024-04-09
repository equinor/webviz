import { LineIntersectionCalculator } from "./LineIntersectionCalculator";

import { IntersectedItem, IntersectionCalculator, IntersectionItemShape } from "../types/types";
import { calcDistance, isPointInPolygon } from "../utils/geometry";

export interface FanchartIntersectedItem extends IntersectedItem {
    shape: IntersectionItemShape.FANCHART;
    line: number[][];
    points: number[][];
}

export class FanchartIntersectionCalculator implements IntersectionCalculator {
    private _lineIntersectionCalculators: LineIntersectionCalculator[];
    private _lines: number[][][];
    private _hull: number[][];

    constructor(lines: number[][][], hull: number[][], margin: number = 0) {
        this._lines = lines;
        this._hull = hull;
        const lineIntersectionCalculators: LineIntersectionCalculator[] = [];
        for (const line of lines) {
            lineIntersectionCalculators.push(new LineIntersectionCalculator(line, margin));
        }
        this._lineIntersectionCalculators = lineIntersectionCalculators;
    }

    private interpolateY(x: number, p1: number[], p2: number[]): number {
        const x1 = p1[0];
        const y1 = p1[1];
        const x2 = p2[0];
        const y2 = p2[1];
        return y1 + ((x - x1) * (y2 - y1)) / (x2 - x1);
    }

    private getPointsAtX(x: number): number[][] {
        const points: number[][] = [];

        for (const line of this._lines) {
            for (let i = 0; i < line.length - 1; i++) {
                const p1 = line[i];
                const p2 = line[i + 1];
                if (p1[0] <= x && p2[0] >= x) {
                    points.push([x, this.interpolateY(x, p1, p2)]);
                    continue;
                }
            }
        }

        return points;
    }

    calcIntersection(point: number[]): FanchartIntersectedItem | null {
        if (!isPointInPolygon(point, this._hull)) {
            return null;
        }

        let intersectionPoint: number[] | null = null;
        let points: number[][] = [];
        let smallestDistance = Number.MAX_VALUE;

        for (const lineIntersectionCalculator of this._lineIntersectionCalculators) {
            const intersection = lineIntersectionCalculator.calcIntersection(point);
            if (intersection) {
                const distance = calcDistance(intersection.point, point);
                if (distance < smallestDistance) {
                    const x = intersection.point[0];
                    points = this.getPointsAtX(x);
                    intersectionPoint = intersection.point;
                    smallestDistance = distance;
                }
            }
        }

        if (points.length === 0 || !intersectionPoint) {
            return null;
        }

        const x = intersectionPoint[0];

        const yMin = Math.min(...points.map((p) => p[1]));
        const yMax = Math.max(...points.map((p) => p[1]));

        return {
            shape: IntersectionItemShape.FANCHART,
            line: [
                [x, yMin],
                [x, yMax],
            ],
            points: points,
            point,
        };
    }
}
