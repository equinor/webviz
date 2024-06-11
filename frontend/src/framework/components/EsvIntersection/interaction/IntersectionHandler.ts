import { Controller, OverlayMouseMoveEvent } from "@equinor/esv-intersection";

import { isEqual } from "lodash";

import { IntersectedItem, IntersectionCalculator, IntersectionItem } from "../types/types";
import { makeIntersectionCalculatorFromIntersectionItem } from "../utils/intersectionConversion";

export enum IntersectionHandlerTopic {
    INTERSECTION = "INTERSECTION",
}

export type Intersection = {
    id: string;
    item: IntersectedItem;
};

export type IntersectionHandlerTopicPayload = {
    [IntersectionHandlerTopic.INTERSECTION]: {
        intersections: Intersection[];
    };
};

export type IntersectionHandlerOptions = {
    threshold?: number;
};

export class IntersectionHandler {
    private _controller: Controller;
    private _options: IntersectionHandlerOptions;
    private _intersectionCalculators: Map<string, IntersectionCalculator> = new Map();
    private _subscribers: Map<IntersectionHandlerTopic, Set<(payload: any) => void>> = new Map();
    private _previousIntersections: Intersection[] = [];

    constructor(controller: Controller, options?: IntersectionHandlerOptions) {
        this._controller = controller;
        this._options = options || { threshold: 10 };

        this.makeOverlay();
    }

    addIntersectionItem(intersectionItem: IntersectionItem) {
        const intersectionCalculator = makeIntersectionCalculatorFromIntersectionItem(
            intersectionItem,
            this._options,
            this._controller
        );
        this._intersectionCalculators.set(intersectionItem.id, intersectionCalculator);
    }

    removeIntersectionObject(id: string) {
        this._intersectionCalculators.delete(id);
    }

    subscribe<T extends IntersectionHandlerTopic>(
        topic: T,
        callback: (payload: IntersectionHandlerTopicPayload[T]) => void
    ): () => void {
        const subscribers = this._subscribers.get(topic) || new Set();
        subscribers.add(callback);
        this._subscribers.set(topic, subscribers);

        return () => {
            subscribers.delete(callback);
        };
    }

    private publish<T extends IntersectionHandlerTopic>(topic: T, payload: IntersectionHandlerTopicPayload[T]) {
        const subscribers = this._subscribers.get(topic);
        if (subscribers) {
            subscribers.forEach((callback) => callback(payload));
        }
    }

    destroy() {
        this._controller.overlay.remove("intersection-overlay");
    }

    private makeOverlay() {
        const overlay = this._controller.overlay.create("intersection-overlay", {
            onMouseMove: this.handleMouseMove.bind(this),
            onMouseExit: this.handleMouseExit.bind(this),
        });

        if (overlay === undefined) {
            throw new Error("Overlay not found");
        }

        overlay.style.position = "absolute";
        overlay.style.inset = "0";
        overlay.style.pointerEvents = "none";
        overlay.style.visibility = "hidden";
        overlay.style.zIndex = "100";
    }

    private calcMd(point: number[]): number {
        const { referenceSystem } = this._controller;

        if (!referenceSystem) {
            return 0;
        }

        const curtain = referenceSystem.interpolators.curtain;

        const nearestPosition = curtain.getNearestPosition(point);
        return curtain.getArcLength(1 - nearestPosition.u) + referenceSystem.offset;
    }

    private handleMouseMove(event: OverlayMouseMoveEvent<Controller>) {
        const { x, y } = event;
        const { xScale, yScale } = this._controller.currentStateAsEvent;

        const referenceSystemCoordinates = [xScale.invert(x), yScale.invert(y)];

        this._controller.currentStateAsEvent.xScale;

        const intersections: Intersection[] = [];

        const calcDistance = (point: number[]): number => {
            const x1 = xScale(point[0]);
            const y1 = yScale(point[1]);
            const distance = Math.sqrt(Math.pow(x1 - x, 2) + Math.pow(y1 - y, 2));
            return distance;
        };

        for (const [id, calculator] of this._intersectionCalculators) {
            const intersection = calculator.calcIntersection(referenceSystemCoordinates);
            if (intersection && calcDistance(intersection.point) < (this._options.threshold ?? 0)) {
                const intersectionWithMd = { ...intersection, md: this.calcMd(intersection.point) };
                intersections.push({ id, item: intersectionWithMd });
            }
        }

        if (isEqual(intersections, this._previousIntersections)) {
            return;
        }

        this._previousIntersections = intersections;

        this.publish(IntersectionHandlerTopic.INTERSECTION, {
            intersections,
        });
    }

    private handleMouseExit() {
        this.publish(IntersectionHandlerTopic.INTERSECTION, {
            intersections: [],
        });
    }
}
