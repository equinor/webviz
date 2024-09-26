import { Controller } from "@equinor/esv-intersection";

import { BoundingBox2D } from "./BoundingBox2D";

import { IntersectedItem, IntersectionCalculator, IntersectionItemShape } from "../types/types";

export interface WellborePathIntersectedItem extends IntersectedItem {
    shape: IntersectionItemShape.WELLBORE_PATH;
    md: number;
}

export class WellborePathIntersectionCalculator implements IntersectionCalculator {
    private _boundingBox: BoundingBox2D;
    private _controller: Controller;

    constructor(controller: Controller, margin: number = 0) {
        if (!controller.referenceSystem) {
            throw new Error("Controller must have a reference system");
        }
        this._controller = controller;

        const { curtain } = controller.referenceSystem.interpolators;
        this._boundingBox = this.makeBoundingBox(curtain.getPoints(), margin);
    }

    private makeBoundingBox(points: number[][], margin: number): BoundingBox2D {
        const xValues = points.map((point) => point[0]);
        const yValues = points.map((point) => point[1]);
        const xMin = Math.min(...xValues) - margin;
        const xMax = Math.max(...xValues) + margin;
        const yMin = Math.min(...yValues) - margin;
        const yMax = Math.max(...yValues) + margin;
        return new BoundingBox2D([xMin, yMin], [xMax, yMax]);
    }

    calcIntersection(point: number[]): WellborePathIntersectedItem | null {
        if (!this._boundingBox.contains(point)) {
            return null;
        }

        if (!this._controller.referenceSystem) {
            throw new Error("Controller must have a reference system");
        }

        const { curtain } = this._controller.referenceSystem.interpolators;

        const nearestPosition = curtain.getNearestPosition(point);
        const md = curtain.getArcLength(1 - nearestPosition.u) + this._controller.referenceSystem.offset;

        return {
            shape: IntersectionItemShape.WELLBORE_PATH,
            md,
            point: [nearestPosition.point[0], nearestPosition.point[1]],
        };
    }
}
