import { BoundingBox2D } from "./BoundingBox2D";

import { IntersectedItem, IntersectionCalculator, IntersectionItemShape } from "../types/types";

class SubLine {
    private _startIndex: number;
    private _endIndex: number;
    private _boundingBox: BoundingBox2D;
    private _children: SubLine[];

    constructor(startIndex: number, endIndex: number, boundingBox: BoundingBox2D, children: SubLine[]) {
        this._startIndex = startIndex;
        this._endIndex = endIndex;
        this._boundingBox = boundingBox;
        this._children = children;
    }

    getStartIndex(): number {
        return this._startIndex;
    }

    getEndIndex(): number {
        return this._endIndex;
    }

    getBoundingBox(): BoundingBox2D {
        return this._boundingBox;
    }

    getIntersectedSubLine(point: number[], margin: number = 0): SubLine | null {
        if (!this._boundingBox.contains(point, margin)) {
            return null;
        }

        if (this._children.length === 0) {
            return this;
        }

        for (const child of this._children) {
            const result = child.getIntersectedSubLine(point);
            if (result) {
                return result;
            }
        }
        return null;
    }

    contains(point: number[]): boolean {
        return this._boundingBox.contains(point);
    }
}

const MAX_NUMBER_POINTS = 50;

export interface LineIntersectedItem extends IntersectedItem {
    shape: IntersectionItemShape.LINE;
}

export class LineIntersectionCalculator implements IntersectionCalculator {
    private _boundingBox: BoundingBox2D;
    private _points: number[][];
    private _subLines: SubLine[] = [];
    private _margin: number;

    constructor(points: number[][], margin: number = 0) {
        this._points = points;
        this._margin = margin;
        this._boundingBox = this.makeBoundingBoxAndSubLines();
    }

    private makeBoundingBoxAndSubLines(): BoundingBox2D {
        let minX = Number.MAX_VALUE;
        let minY = Number.MAX_VALUE;
        let maxX = Number.MIN_VALUE;
        let maxY = Number.MIN_VALUE;

        let localMinX = Number.MAX_VALUE;
        let localMinY = Number.MAX_VALUE;
        let localMaxX = Number.MIN_VALUE;
        let localMaxY = Number.MIN_VALUE;

        let lastIndex = 0;

        let numPoints = 0;
        let subLines: SubLine[] = [];

        for (const [index, point] of this._points.entries()) {
            minX = Math.min(minX, point[0]);
            minY = Math.min(minY, point[1]);
            maxX = Math.max(maxX, point[0]);
            maxY = Math.max(maxY, point[1]);

            localMinX = Math.min(localMinX, point[0]);
            localMinY = Math.min(localMinY, point[1]);
            localMaxX = Math.max(localMaxX, point[0]);
            localMaxY = Math.max(localMaxY, point[1]);

            if (numPoints === MAX_NUMBER_POINTS || index === this._points.length - 1) {
                const boundingBox = new BoundingBox2D([localMinX, localMinY], [localMaxX, localMaxY]);
                subLines.push(new SubLine(lastIndex, index, boundingBox, []));
                numPoints = 0;
                lastIndex = index;

                localMinX = Number.MAX_VALUE;
                localMinY = Number.MAX_VALUE;
                localMaxX = Number.MIN_VALUE;
                localMaxY = Number.MIN_VALUE;
            }
        }

        while (subLines.length > 1) {
            const newLevelSubLines: SubLine[] = [];
            for (let i = 0; i < subLines.length; i += 2) {
                if (i + 1 <= subLines.length - 1) {
                    const boundingBox1 = subLines[i].getBoundingBox();
                    const boundingBox2 = subLines[i + 1].getBoundingBox();

                    const minX = Math.min(boundingBox1.getMinPoint()[0], boundingBox2.getMinPoint()[0]);
                    const minY = Math.min(boundingBox1.getMinPoint()[1], boundingBox2.getMinPoint()[1]);
                    const maxX = Math.max(boundingBox1.getMaxPoint()[0], boundingBox2.getMaxPoint()[0]);
                    const maxY = Math.max(boundingBox1.getMaxPoint()[1], boundingBox2.getMaxPoint()[1]);

                    const boundingBox = new BoundingBox2D([minX, minY], [maxX, maxY]);

                    const startIndex = subLines[i].getStartIndex();
                    const endIndex = subLines[i].getEndIndex();

                    const subLine = new SubLine(startIndex, endIndex, boundingBox, [subLines[i], subLines[i + 1]]);

                    newLevelSubLines.push(subLine);
                } else {
                    newLevelSubLines.push(subLines[i]);
                }
            }
            subLines = newLevelSubLines;
        }

        this._subLines = subLines;

        return new BoundingBox2D([minX, minY], [maxX, maxY]);
    }

    private calcPointDistance(point1: number[], point2: number[]): number {
        return Math.sqrt(Math.pow(point1[0] - point2[0], 2) + Math.pow(point1[1] - point2[1], 2));
    }

    private findLineSegment(
        point: number[],
        startIndex: number,
        endIndex: number
    ): {
        p1: number[];
        p2: number[];
    } {
        let nearestPoint = this._points[startIndex];
        let smallestDistance = this.calcPointDistance(nearestPoint, point);
        let nearestPointIndex = 0;

        if (startIndex === endIndex) {
            return {
                p1: nearestPoint,
                p2: nearestPoint,
            };
        }

        for (let i = startIndex + 1; i < endIndex; i++) {
            const distance = this.calcPointDistance(this._points[i], point);
            if (distance < smallestDistance) {
                nearestPoint = this._points[i];
                smallestDistance = distance;
                nearestPointIndex = i;
            }
        }

        if (nearestPointIndex === startIndex) {
            return {
                p1: nearestPoint,
                p2: this._points[startIndex + 1],
            };
        }

        if (nearestPointIndex === endIndex) {
            return {
                p1: nearestPoint,
                p2: this._points[endIndex],
            };
        }

        const nearestPointToPointVector = [point[0] - nearestPoint[0], point[1] - nearestPoint[1]];

        const candidateVector1 = [
            this._points[nearestPointIndex + 1][0] - nearestPoint[0],
            this._points[nearestPointIndex + 1][1] - nearestPoint[1],
        ];
        const candidateVector2 = [
            this._points[nearestPointIndex - 1][0] - nearestPoint[0],
            this._points[nearestPointIndex - 1][1] - nearestPoint[1],
        ];

        const scalarProduct1 =
            nearestPointToPointVector[0] * candidateVector1[0] + nearestPointToPointVector[1] * candidateVector1[1];
        const scalarProduct2 =
            nearestPointToPointVector[0] * candidateVector2[0] + nearestPointToPointVector[1] * candidateVector2[1];

        if (scalarProduct1 > 0 && scalarProduct2 > 0) {
            if (scalarProduct1 < scalarProduct2) {
                return {
                    p1: nearestPoint,
                    p2: this._points[nearestPointIndex + 1],
                };
            }
            return {
                p1: nearestPoint,
                p2: this._points[nearestPointIndex - 1],
            };
        }

        if (scalarProduct1 > 0) {
            return {
                p1: nearestPoint,
                p2: this._points[nearestPointIndex + 1],
            };
        }

        return {
            p1: nearestPoint,
            p2: this._points[nearestPointIndex - 1],
        };
    }

    private interpolate(point: number[], startIndex: number, endIndex: number): number[] {
        const lineSegment = this.findLineSegment(point, startIndex, endIndex);

        const p1ToPointVector = [point[0] - lineSegment.p1[0], point[1] - lineSegment.p1[1]];
        const p1ToP2Vector = [lineSegment.p2[0] - lineSegment.p1[0], lineSegment.p2[1] - lineSegment.p1[1]];

        const scalarProduct = p1ToPointVector[0] * p1ToP2Vector[0] + p1ToPointVector[1] * p1ToP2Vector[1];

        const p1ToP2Length = this.calcPointDistance(lineSegment.p1, lineSegment.p2);
        const scalar = scalarProduct / p1ToP2Length ** 2;
        const result = [p1ToP2Vector[0] * scalar, p1ToP2Vector[1] * scalar];

        const resultVector = [lineSegment.p1[0] + result[0], lineSegment.p1[1] + result[1]];

        return resultVector;
    }

    calcIntersection(point: number[]): LineIntersectedItem | null {
        if (!this._boundingBox.contains(point, this._margin)) {
            return null;
        }

        for (const subLine of this._subLines) {
            const intersectedSubline = subLine.getIntersectedSubLine(point, this._margin);
            if (intersectedSubline) {
                const result = this.interpolate(
                    point,
                    intersectedSubline.getStartIndex(),
                    intersectedSubline.getEndIndex()
                );
                return {
                    point: result,
                    shape: IntersectionItemShape.LINE,
                };
            }
        }

        return null;
    }
}
