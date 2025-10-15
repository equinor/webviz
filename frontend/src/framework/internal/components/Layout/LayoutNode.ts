import type { LayoutElement } from "@framework/internal/Dashboard";
import type { Rect2D, Size2D } from "@lib/utils/geometry";
import {
    outerRectContainsInnerRect,
    quadrilateralContainsPoint,
    rectContainsPoint,
    triangleContainsPoint,
} from "@lib/utils/geometry";
import type { Vec2 } from "@lib/utils/vec2";

function layoutElementToRect(layoutElement: LayoutElement): Rect2D {
    return {
        x: layoutElement.relX,
        y: layoutElement.relY,
        width: layoutElement.relWidth,
        height: layoutElement.relHeight,
    };
}

export const LAYOUT_BOX_DROP_MARGIN = 15;
export const LAYOUT_BOX_RESIZE_MARGIN = 15;
export const EDGE_DROP_WEIGHT = 15;
export const EDGE_RESIZE_WEIGHT = 15;
export const MIN_FRAME_PX = 4; // minimal inner frame to keep overlays visible
export const MIN_EDGE_PX = 20; // minimal thickness for drop/resize edges

const EPSILON = 1e-6;

function nearlyEqual(a: number, b: number, epsilon: number = EPSILON): boolean {
    return Math.abs(a - b) <= epsilon;
}

function dedupeWithEpsilon(sortedNumbers: number[], epsilon: number = EPSILON): number[] {
    const result: number[] = [];
    for (let i = 0; i < sortedNumbers.length; i++) {
        const value = sortedNumbers[i];
        if (i === 0 || !nearlyEqual(value, sortedNumbers[i - 1], epsilon)) {
            result.push(value);
        }
    }
    return result;
}

export enum LayoutNodeEdgeType {
    TOP = "top",
    BOTTOM = "bottom",
    LEFT = "left",
    RIGHT = "right",
    HORIZONTAL = "horizontal",
    VERTICAL = "vertical",
}

export enum LayoutDirection {
    HORIZONTAL = "horizontal",
    VERTICAL = "vertical",
    SINGLE = "single",
    MAIN = "main",
}

export enum LayoutAxis {
    HORIZONTAL = "horizontal",
    VERTICAL = "vertical",
}

export enum EdgeShapeType {
    TRIANGLE = "triangle",
    QUADRILATERAL = "quadrilateral",
}

export type Triangle = {
    p1: Vec2;
    p2: Vec2;
    p3: Vec2;
};

export type Quadrilateral = {
    p1: Vec2;
    p2: Vec2;
    p3: Vec2;
    p4: Vec2;
};

export type EdgeShape =
    | {
          type: EdgeShapeType.TRIANGLE;
          shape: Triangle;
      }
    | {
          type: EdgeShapeType.QUADRILATERAL;
          shape: Quadrilateral;
      };

export type LayoutNodeEdge =
    | {
          edge: Exclude<LayoutNodeEdgeType, LayoutNodeEdgeType.HORIZONTAL | LayoutNodeEdgeType.VERTICAL>;
          shape: EdgeShape;
      }
    | {
          position: number;
          edge: LayoutNodeEdgeType.HORIZONTAL | LayoutNodeEdgeType.VERTICAL;
          shape: EdgeShape;
      };

function edgeContainsPoint(edge: LayoutNodeEdge, point: Vec2): boolean {
    if (edge.shape.type === EdgeShapeType.QUADRILATERAL) {
        const { p1, p2, p3, p4 } = edge.shape.shape;
        return quadrilateralContainsPoint(p1, p2, p3, p4, point);
    } else if (edge.shape.type === EdgeShapeType.TRIANGLE) {
        const { p1, p2, p3 } = edge.shape.shape;
        return triangleContainsPoint(p1, p2, p3, point);
    }
    return false;
}

export class LayoutNode {
    private _rectRelativeToParent: Rect2D;
    private _children: LayoutNode[];
    private _level: number;
    private _moduleInstanceId: string | undefined;
    private _moduleName: string;
    private _isWrapper: boolean;
    private _parent: LayoutNode | null;
    private _layoutDirection: LayoutDirection;
    private _isNewInParent: boolean = false;

    constructor(
        rect: Rect2D,
        direction: LayoutDirection,
        parent: LayoutNode | null = null,
        level = 0,
        children: LayoutNode[] = [],
    ) {
        this._rectRelativeToParent = rect;
        this._children = children;
        this._level = level;
        this._isWrapper = true;

        this._moduleInstanceId = "";
        this._moduleName = "";
        this._parent = parent;
        this._layoutDirection = direction;
    }

    getRect(): Rect2D {
        return this._rectRelativeToParent;
    }

    getModuleInstanceId(): string | undefined {
        return this._moduleInstanceId;
    }

    getInsetLevel(): number {
        let lvl = 0;
        const directions: Set<LayoutDirection> = new Set([this._layoutDirection]);
        let parent = this._parent;
        let direction = this._layoutDirection;

        while (parent) {
            directions.add(parent._layoutDirection);
            if (
                directions.size === 2 ||
                parent._layoutDirection === direction ||
                ![LayoutDirection.HORIZONTAL, LayoutDirection.VERTICAL].includes(parent._layoutDirection) ||
                ![LayoutDirection.HORIZONTAL, LayoutDirection.VERTICAL].includes(direction)
            ) {
                lvl++;
                directions.clear();
            }

            direction = parent._layoutDirection;
            parent = parent._parent;
        }
        return lvl;
    }

    getRectWithMargin(realSizeFactor: Size2D): Rect2D {
        const absoluteRect = this.getAbsoluteRect();

        const absoluteWidth = absoluteRect.width * realSizeFactor.width;
        const absoluteHeight = absoluteRect.height * realSizeFactor.height;

        const lvl = this.getInsetLevel();

        // margins in px based on own depth only
        const rawMx = LAYOUT_BOX_DROP_MARGIN * lvl;
        const rawMy = LAYOUT_BOX_DROP_MARGIN * lvl;

        const marginX = Math.min(rawMx, Math.max(0, (absoluteWidth - MIN_FRAME_PX) / 2));
        const marginY = Math.min(rawMy, Math.max(0, (absoluteHeight - MIN_FRAME_PX) / 2));

        return {
            x: absoluteRect.x * realSizeFactor.width + marginX,
            y: absoluteRect.y * realSizeFactor.height + marginY,
            width: Math.max(MIN_FRAME_PX, absoluteWidth - 2 * marginX),
            height: Math.max(MIN_FRAME_PX, absoluteHeight - 2 * marginY),
        };
    }

    toString(): string {
        const parts: string[] = [];

        /* eslint-disable-next-line @typescript-eslint/no-this-alias */
        let current: LayoutNode | null = this;

        while (current) {
            const r = current._rectRelativeToParent;
            parts.push(`LayoutNode(${r.x}, ${r.y}, ${r.width}, ${r.height})`);
            current = current._parent;
        }
        return parts.join(" > ");
    }

    log(): string {
        let text = "";
        for (let i = 0; i < this._level; i++) {
            text += " ";
        }
        text += `${this._rectRelativeToParent.x}, ${this._rectRelativeToParent.y}, ${this._rectRelativeToParent.width}, ${this._rectRelativeToParent.height}\n`;
        for (const child of this._children) {
            text += child.log();
        }
        return text;
    }

    transformRectToRelative(rect: Rect2D): Rect2D {
        let newRect = {
            x: (rect.x - this._rectRelativeToParent.x) / this._rectRelativeToParent.width,
            y: (rect.y - this._rectRelativeToParent.y) / this._rectRelativeToParent.height,
            width: rect.width / this._rectRelativeToParent.width,
            height: rect.height / this._rectRelativeToParent.height,
        };

        if (this._parent !== null) {
            newRect = this._parent.transformRectToRelative(newRect);
        }

        return newRect;
    }

    getAbsoluteRect(): Rect2D {
        if (this._parent === null) {
            return this._rectRelativeToParent;
        }
        return this._parent.transformRectToAbsolute(this._rectRelativeToParent);
    }

    private transformRectToAbsolute(rect: Rect2D): Rect2D {
        let newRect = {
            x: rect.x * this._rectRelativeToParent.width + this._rectRelativeToParent.x,
            y: rect.y * this._rectRelativeToParent.height + this._rectRelativeToParent.y,
            width: rect.width * this._rectRelativeToParent.width,
            height: rect.height * this._rectRelativeToParent.height,
        };

        if (this._parent !== null) {
            newRect = this._parent.transformRectToAbsolute(newRect);
        }
        return newRect;
    }

    private findVerticalCuts(elements: LayoutElement[], parentBox: Rect2D): number[] {
        // collect all candidate x positions (tile edges + parent edges)
        const candidateEdges: number[] = [];
        candidateEdges.push(parentBox.x);
        candidateEdges.push(parentBox.x + parentBox.width);

        for (const element of elements) {
            const left = element.relX;
            const right = element.relX + element.relWidth;
            candidateEdges.push(left);
            candidateEdges.push(right);
        }

        candidateEdges.sort((a, b) => a - b);
        const uniqueEdges: number[] = dedupeWithEpsilon(candidateEdges);

        const cuts: number[] = [];
        for (const xCut of uniqueEdges) {
            let crosses = false;
            for (const el of elements) {
                const left = el.relX;
                const right = el.relX + el.relWidth;
                if (left + EPSILON < xCut && xCut < right - EPSILON) {
                    crosses = true;
                    break;
                }
            }
            if (!crosses) cuts.push(xCut);
        }

        return cuts;
    }

    private findHorizontalCuts(elements: LayoutElement[], parentBox: Rect2D): number[] {
        const candidateEdges: number[] = [];
        candidateEdges.push(parentBox.y);
        candidateEdges.push(parentBox.y + parentBox.height);

        for (const element of elements) {
            const top = element.relY;
            const bottom = element.relY + element.relHeight;
            candidateEdges.push(top);
            candidateEdges.push(bottom);
        }

        candidateEdges.sort((a, b) => a - b);
        const uniqueEdges: number[] = dedupeWithEpsilon(candidateEdges);

        const cuts: number[] = [];
        for (const yCut of uniqueEdges) {
            let crosses = false;
            for (const el of elements) {
                const top = el.relY;
                const bottom = el.relY + el.relHeight;
                if (top + EPSILON < yCut && yCut < bottom - EPSILON) {
                    crosses = true;
                    break;
                }
            }
            if (!crosses) cuts.push(yCut);
        }

        return cuts;
    }

    private buildVerticalSegments(
        elements: LayoutElement[],
        parent: Rect2D,
        verticalCuts: number[],
    ): { rect: Rect2D; elements: LayoutElement[] }[] {
        if (verticalCuts.length === 0) {
            return [];
        }

        const sortedCuts: number[] = [...verticalCuts].sort((a, b) => a - b);
        const boundaries: number[] = [parent.x, ...sortedCuts, parent.x + parent.width];

        const segments: { rect: Rect2D; elements: LayoutElement[] }[] = [];

        for (let i = 0; i < boundaries.length - 1; i++) {
            const left = boundaries[i];
            const right = boundaries[i + 1];
            const width = right - left;
            if (width <= EPSILON) {
                continue;
            }

            const segmentRect: Rect2D = {
                x: left,
                y: parent.y,
                width: width,
                height: parent.height,
            };

            const elementsInSegment: LayoutElement[] = [];
            for (const element of elements) {
                const elLeft = element.relX;
                const elRight = element.relX + element.relWidth;
                const elTop = element.relY;
                const elBottom = element.relY + element.relHeight;

                const insideHorizontally = elLeft >= left - EPSILON && elRight <= right + EPSILON;
                const insideVertically = elTop >= parent.y - EPSILON && elBottom <= parent.y + parent.height + EPSILON;

                if (insideHorizontally && insideVertically) {
                    elementsInSegment.push(element);
                }
            }

            if (elementsInSegment.length > 0) {
                segments.push({ rect: segmentRect, elements: elementsInSegment });
            }
        }

        return segments;
    }

    private buildHorizontalSegments(
        elements: LayoutElement[],
        parent: Rect2D,
        horizontalCuts: number[],
    ): { rect: Rect2D; elements: LayoutElement[] }[] {
        if (horizontalCuts.length === 0) {
            return [];
        }

        const sortedCuts: number[] = [...horizontalCuts].sort((a, b) => a - b);
        const boundaries: number[] = [parent.y, ...sortedCuts, parent.y + parent.height];

        const segments: { rect: Rect2D; elements: LayoutElement[] }[] = [];

        for (let i = 0; i < boundaries.length - 1; i++) {
            const top = boundaries[i];
            const bottom = boundaries[i + 1];
            const height = bottom - top;
            if (height <= EPSILON) {
                continue;
            }

            const segmentRect: Rect2D = {
                x: parent.x,
                y: top,
                width: parent.width,
                height: height,
            };

            const elementsInSegment: LayoutElement[] = [];
            for (const element of elements) {
                const elLeft = element.relX;
                const elRight = element.relX + element.relWidth;
                const elTop = element.relY;
                const elBottom = element.relY + element.relHeight;

                const insideHorizontally = elLeft >= parent.x - EPSILON && elRight <= parent.x + parent.width + EPSILON;
                const insideVertically = elTop >= top - EPSILON && elBottom <= bottom + EPSILON;

                if (insideHorizontally && insideVertically) {
                    elementsInSegment.push(element);
                }
            }

            if (elementsInSegment.length > 0) {
                segments.push({ rect: segmentRect, elements: elementsInSegment });
            }
        }

        return segments;
    }

    makeChildren(containedElements: LayoutElement[]) {
        if (containedElements.length === 0) {
            return;
        }
        if (containedElements.length === 1) {
            if (this._layoutDirection === LayoutDirection.MAIN) {
                const elementsInRect = containedElements.filter((layoutElement) =>
                    outerRectContainsInnerRect(this.getAbsoluteRect(), layoutElementToRect(layoutElement)),
                );
                const childBox = new LayoutNode(
                    this._rectRelativeToParent,
                    LayoutDirection.SINGLE,
                    this,
                    this._level + 1,
                );
                childBox._isWrapper = true;
                childBox.makeChildren(elementsInRect);
                childBox.reorderChildren();
                this._children.push(childBox);
                return;
            }
            this._isWrapper = false;
            if (containedElements.length === 1) {
                this._moduleInstanceId = containedElements[0].moduleInstanceId;
                this._moduleName = containedElements[0].moduleName;
                this._layoutDirection = LayoutDirection.SINGLE;
            }
            return;
        }

        const parentRect = this.getAbsoluteRect();
        const verticalCuts: number[] = this.findVerticalCuts(containedElements, parentRect);
        const horizontalCuts: number[] = this.findHorizontalCuts(containedElements, parentRect);

        const chooseVertical = verticalCuts.length > horizontalCuts.length;
        const chooseHorizontal = horizontalCuts.length > verticalCuts.length;

        const tie = verticalCuts.length === horizontalCuts.length;

        if (chooseVertical || (tie && verticalCuts.length > 0)) {
            const segments = this.buildVerticalSegments(containedElements, parentRect, verticalCuts);
            if (segments.length > 1) {
                const children: LayoutNode[] = [];

                for (const segment of segments) {
                    const childRect = this.transformRectToRelative(segment.rect);

                    const child = new LayoutNode(childRect, LayoutDirection.VERTICAL, this, this._level + 1);

                    child.makeChildren(segment.elements);
                    child.reorderChildren();
                    children.push(child);
                }

                this._children = children;

                if (this._layoutDirection === LayoutDirection.MAIN) {
                    this._layoutDirection = LayoutDirection.VERTICAL;
                    const wrapper = new LayoutNode(
                        this._rectRelativeToParent,
                        LayoutDirection.HORIZONTAL,
                        this,
                        1,
                        this._children,
                    );
                    this._children.forEach((child) => (child._parent = wrapper));
                    this._level = 0;
                    this.setChildren([wrapper]);
                }
            }
        }

        if (chooseHorizontal || (tie && horizontalCuts.length > 0)) {
            const segments = this.buildHorizontalSegments(containedElements, parentRect, horizontalCuts);
            if (segments.length > 1) {
                const children: LayoutNode[] = [];

                for (const segment of segments) {
                    const childRect = this.transformRectToRelative(segment.rect);

                    const child = new LayoutNode(childRect, LayoutDirection.HORIZONTAL, this, this._level + 1);

                    child.makeChildren(segment.elements);
                    child.reorderChildren();
                    children.push(child);
                }

                this._children = children;

                if (this._layoutDirection === LayoutDirection.MAIN) {
                    this._layoutDirection = LayoutDirection.HORIZONTAL;
                    const wrapper = new LayoutNode(
                        this._rectRelativeToParent,
                        LayoutDirection.VERTICAL,
                        this,
                        1,
                        this._children,
                    );
                    this._children.forEach((child) => (child._parent = wrapper));
                    this._level = 0;
                    this.setChildren([wrapper]);
                }
            }
        }
    }

    private reorderChildren() {
        if (this._children.length === 0) return;

        const isHorizontalSplit = this._layoutDirection === LayoutDirection.HORIZONTAL;

        const existingChildren = this._children.filter((child) => !child._isNewInParent);
        const numExistingChildren = existingChildren.length;
        const newChildren = this._children.filter((child) => child._isNewInParent);
        const nTotal = existingChildren.length + newChildren.length;

        const evenSharePerChild = 1.0 / nTotal;

        const currentSizeOfExistingChildren = existingChildren.reduce(
            (acc, child) =>
                acc + (isHorizontalSplit ? child._rectRelativeToParent.width : child._rectRelativeToParent.height),
            0,
        );
        const spaceAvailableForExistingChildren = numExistingChildren * evenSharePerChild;

        const scaleExistingChildren =
            numExistingChildren > 0 && currentSizeOfExistingChildren > 0
                ? spaceAvailableForExistingChildren / currentSizeOfExistingChildren
                : 0;

        let cumulativelyAssignedSize = 0;

        if (this._layoutDirection === LayoutDirection.HORIZONTAL) {
            let currentX = 0;
            this._children.forEach((child, index) => {
                let newWidth = child._rectRelativeToParent.width * scaleExistingChildren;
                if (child._isNewInParent) {
                    newWidth = evenSharePerChild;
                }
                if (index === this._children.length - 1) {
                    newWidth = 1 - cumulativelyAssignedSize; // Ensure the last child takes up the remaining space
                }
                cumulativelyAssignedSize += newWidth;
                child._rectRelativeToParent = {
                    x: currentX,
                    y: 0,
                    width: newWidth,
                    height: 1,
                };
                child._level = this._level + 1;
                currentX += newWidth;
            });
        } else {
            let currentY = 0;
            this._children.forEach((child, index) => {
                let newHeight = child._rectRelativeToParent.height * scaleExistingChildren;
                if (child._isNewInParent) {
                    newHeight = evenSharePerChild;
                }
                if (index === this._children.length - 1) {
                    newHeight = 1 - cumulativelyAssignedSize; // Ensure the last child takes up the remaining space
                }
                cumulativelyAssignedSize += newHeight;
                child._rectRelativeToParent = {
                    x: 0,
                    y: currentY,
                    width: 1,
                    height: newHeight,
                };
                child._level = this._level + 1;
                currentY += newHeight;
            });
        }

        for (const child of this._children) {
            child._isNewInParent = false;
        }
    }

    prependChild(child: LayoutNode) {
        this._children.unshift(child);
        this.reorderChildren();
    }

    appendChild(child: LayoutNode) {
        this._children.push(child);
        this.reorderChildren();
    }

    insertChildAt(child: LayoutNode, index: number) {
        this._children.splice(index, 0, child);
        this.reorderChildren();
    }

    removeChild(child: LayoutNode) {
        this._children = this._children.filter((c) => c !== child);
        if (this._children.length > 0) {
            this.reorderChildren();
            if (this._children.length === 1 && this._children[0]._children.length === 0) {
                this.convertWrapperToSingleLayout();
            }
            this.normalizeUpwards();
        } else if (this._parent) {
            this._parent.removeChild(this);
        }
    }

    setChildren(children: LayoutNode[]): void {
        this._children = children;
    }

    getChildren(): LayoutNode[] {
        return this._children;
    }

    findBoxContainingPoint(point: Vec2, realSize: Size2D): LayoutNode | null {
        if (!rectContainsPoint(this.getRectWithMargin(realSize), point)) {
            return null;
        }

        let found: LayoutNode | null = null;
        this._children.every((child) => {
            found = child.findBoxContainingPoint(point, realSize);
            if (found) {
                return false;
            }
            return true;
        });

        return found || this;
    }

    findBoxContainingModuleInstance(moduleInstanceId: string): LayoutNode | null {
        if (this._moduleInstanceId === moduleInstanceId) {
            return this;
        }

        let found: LayoutNode | null = null;
        this._children.every((child) => {
            found = child.findBoxContainingModuleInstance(moduleInstanceId);
            if (found) {
                return false;
            }
            return true;
        });

        return found;
    }

    makeEdges(realSize: Size2D, edgeWeight: number, edgeMargin: number): LayoutNodeEdge[] {
        const outerRect = this.getRectWithMargin(realSize);
        const innerRect = outerRect;
        const edges: LayoutNodeEdge[] = [];

        const clampThickness = (t: number, axis: "x" | "y") =>
            Math.max(MIN_EDGE_PX, Math.min(t, axis === "x" ? innerRect.width : innerRect.height));

        const topLeft = { x: innerRect.x, y: innerRect.y };
        const topRight = { x: innerRect.x + innerRect.width, y: innerRect.y };
        const bottomLeft = { x: innerRect.x, y: innerRect.y + innerRect.height };
        const bottomRight = { x: innerRect.x + innerRect.width, y: innerRect.y + innerRect.height };
        const midPoint = { x: innerRect.x + innerRect.width / 2, y: innerRect.y + innerRect.height / 2 };

        if (this._layoutDirection === LayoutDirection.SINGLE && this._parent) {
            edges.push(
                {
                    edge: LayoutNodeEdgeType.LEFT,
                    shape: {
                        type: EdgeShapeType.TRIANGLE,
                        shape: {
                            p1: topLeft,
                            p2: bottomLeft,
                            p3: midPoint,
                        },
                    },
                },
                {
                    edge: LayoutNodeEdgeType.RIGHT,
                    shape: {
                        type: EdgeShapeType.TRIANGLE,
                        shape: {
                            p1: topRight,
                            p2: bottomRight,
                            p3: midPoint,
                        },
                    },
                },
                {
                    edge: LayoutNodeEdgeType.TOP,
                    shape: {
                        type: EdgeShapeType.TRIANGLE,
                        shape: {
                            p1: topLeft,
                            p2: topRight,
                            p3: midPoint,
                        },
                    },
                },
                {
                    edge: LayoutNodeEdgeType.BOTTOM,
                    shape: {
                        type: EdgeShapeType.TRIANGLE,
                        shape: {
                            p1: bottomLeft,
                            p2: bottomRight,
                            p3: midPoint,
                        },
                    },
                },
            );
            /*
            if (
                this._parent._layoutDirection === LayoutDirection.HORIZONTAL ||
                this._parent._layoutDirection === LayoutDirection.MAIN
            ) {
                const th = clampThickness(rect.height * 0.3, "y");
                edges.push({
                    rect: { x: rect.x, y: rect.y, width: rect.width, height: th },
                    edge: LayoutNodeEdgeType.TOP,
                });
                edges.push({
                    rect: { x: rect.x, y: rect.y + rect.height - th, width: rect.width, height: th },
                    edge: LayoutNodeEdgeType.BOTTOM,
                });
            }
            if (
                this._parent._layoutDirection === LayoutDirection.VERTICAL ||
                this._parent._layoutDirection === LayoutDirection.MAIN
            ) {
                const tw = clampThickness(rect.width * 0.3, "x");
                edges.push({
                    rect: { x: rect.x, y: rect.y, width: tw, height: rect.height },
                    edge: LayoutNodeEdgeType.LEFT,
                });
                edges.push({
                    rect: { x: rect.x + rect.width - tw, y: rect.y, width: tw, height: rect.height },
                    edge: LayoutNodeEdgeType.RIGHT,
                });
            }
            */

            return edges;
        }

        if (this._layoutDirection === LayoutDirection.MAIN) {
            edges.push(
                {
                    edge: LayoutNodeEdgeType.LEFT,
                    shape: {
                        type: EdgeShapeType.TRIANGLE,
                        shape: {
                            p1: topLeft,
                            p2: bottomLeft,
                            p3: midPoint,
                        },
                    },
                },
                {
                    edge: LayoutNodeEdgeType.RIGHT,
                    shape: {
                        type: EdgeShapeType.TRIANGLE,
                        shape: {
                            p1: topRight,
                            p2: bottomRight,
                            p3: midPoint,
                        },
                    },
                },
                {
                    edge: LayoutNodeEdgeType.TOP,
                    shape: {
                        type: EdgeShapeType.TRIANGLE,
                        shape: {
                            p1: topLeft,
                            p2: topRight,
                            p3: midPoint,
                        },
                    },
                },
                {
                    edge: LayoutNodeEdgeType.BOTTOM,
                    shape: {
                        type: EdgeShapeType.TRIANGLE,
                        shape: {
                            p1: bottomLeft,
                            p2: bottomRight,
                            p3: midPoint,
                        },
                    },
                },
            );
        }

        if (this._layoutDirection === LayoutDirection.HORIZONTAL && this._children.length > 0) {
            edges.push(
                {
                    edge: LayoutNodeEdgeType.LEFT,
                    shape: {
                        type: EdgeShapeType.QUADRILATERAL,
                        shape: {
                            p1: { x: outerRect.x, y: outerRect.y },
                            p2: { x: outerRect.x + edgeWeight, y: outerRect.y + edgeWeight },
                            p3: { x: outerRect.x + edgeWeight, y: outerRect.y + outerRect.height - edgeWeight },
                            p4: { x: outerRect.x, y: outerRect.y + outerRect.height },
                        },
                    },
                },
                {
                    edge: LayoutNodeEdgeType.RIGHT,
                    shape: {
                        type: EdgeShapeType.QUADRILATERAL,
                        shape: {
                            p1: { x: outerRect.x + outerRect.width - edgeWeight, y: outerRect.y + edgeWeight },
                            p2: { x: outerRect.x + outerRect.width, y: outerRect.y },
                            p3: { x: outerRect.x + outerRect.width, y: outerRect.y + outerRect.height },
                            p4: {
                                x: outerRect.x + outerRect.width - edgeWeight,
                                y: outerRect.y + outerRect.height - edgeWeight,
                            },
                        },
                    },
                },
            );
        }

        if (this._layoutDirection === LayoutDirection.VERTICAL && this._children.length > 0) {
            edges.push(
                {
                    edge: LayoutNodeEdgeType.TOP,
                    shape: {
                        type: EdgeShapeType.QUADRILATERAL,
                        shape: {
                            p1: { x: outerRect.x, y: outerRect.y },
                            p2: { x: outerRect.x + edgeWeight, y: outerRect.y + edgeWeight },
                            p3: { x: outerRect.x + outerRect.width - edgeWeight, y: outerRect.y + edgeWeight },
                            p4: { x: outerRect.x + outerRect.width, y: outerRect.y },
                        },
                    },
                },
                {
                    edge: LayoutNodeEdgeType.BOTTOM,
                    shape: {
                        type: EdgeShapeType.QUADRILATERAL,
                        shape: {
                            p1: { x: outerRect.x + edgeWeight, y: outerRect.y + outerRect.height - edgeWeight },
                            p2: { x: outerRect.x, y: outerRect.y + outerRect.height },
                            p3: { x: outerRect.x + outerRect.width, y: outerRect.y + outerRect.height },
                            p4: {
                                x: outerRect.x + outerRect.width - edgeWeight,
                                y: outerRect.y + outerRect.height - edgeWeight,
                            },
                        },
                    },
                },
            );
        }

        /*
        // Container edges
        if (this._layoutDirection === LayoutDirection.HORIZONTAL) {
            const t = clampThickness(edgeWeight, "x");
            edges.push(
                {
                    shape: { x: rect.x + rect.width - t, y: rect.y, width: t, height: rect.height },
                    edge: LayoutNodeEdgeType.RIGHT,
                },
                { rect: { x: rect.x, y: rect.y, width: t, height: rect.height }, edge: LayoutNodeEdgeType.LEFT },
            );
        }
        if (this._layoutDirection === LayoutDirection.VERTICAL) {
            const t = clampThickness(edgeWeight, "y");
            edges.push(
                { shape: { x: rect.x, y: rect.y, width: rect.width, height: t }, edge: LayoutNodeEdgeType.TOP },
                {
                    rect: { x: rect.x, y: rect.y + rect.height - t, width: rect.width, height: t },
                    edge: LayoutNodeEdgeType.BOTTOM,
                },
            );
        }
        */

        // Sashes between children — base their span on our safe rect,
        // and trim a bit but never below MIN_EDGE_PX
        const trimY = Math.min(edgeMargin * this._level, Math.max(0, innerRect.height / 4));
        const trimX = Math.min(edgeMargin * this._level, Math.max(0, innerRect.width / 4));

        if (this._layoutDirection === LayoutDirection.HORIZONTAL) {
            const t = clampThickness(edgeWeight, "x");
            for (let i = 1; i < this._children.length; i++) {
                const child = this._children[i];
                const abs = child.getAbsoluteRect();
                edges.push({
                    shape: {
                        type: EdgeShapeType.QUADRILATERAL,
                        shape: {
                            p1: { x: abs.x * realSize.width - t / 2, y: innerRect.y + trimY },
                            p2: { x: abs.x * realSize.width - t / 2 + t, y: innerRect.y + trimY },
                            p3: { x: abs.x * realSize.width - t / 2 + t, y: innerRect.y + innerRect.height - trimY },
                            p4: { x: abs.x * realSize.width - t / 2, y: innerRect.y + innerRect.height - trimY },
                        },
                    },
                    edge: LayoutNodeEdgeType.VERTICAL,
                    position: abs.x,
                });
            }
        }

        if (this._layoutDirection === LayoutDirection.VERTICAL) {
            const t = clampThickness(edgeWeight, "y");
            for (let i = 1; i < this._children.length; i++) {
                const child = this._children[i];
                const abs = child.getAbsoluteRect();
                edges.push({
                    shape: {
                        type: EdgeShapeType.QUADRILATERAL,
                        shape: {
                            p1: { x: innerRect.x, y: abs.y * realSize.height - t / 2 },
                            p2: {
                                x: innerRect.x,
                                y: abs.y * realSize.height - t / 2 + t,
                            },
                            p3: {
                                x: innerRect.x + innerRect.width,
                                y: abs.y * realSize.height - t / 2 + t,
                            },
                            p4: { x: innerRect.x + innerRect.width, y: abs.y * realSize.height - t / 2 },
                        },
                    },
                    edge: LayoutNodeEdgeType.HORIZONTAL,
                    position: abs.y,
                });
            }
        }

        return edges;
    }

    findEdgeContainingPoint(point: Vec2, realSize: Size2D, draggedModuleInstanceId: string): LayoutNodeEdge | null {
        const edgeRects = this.makeEdges(realSize, EDGE_DROP_WEIGHT, LAYOUT_BOX_DROP_MARGIN);
        const edge = edgeRects.find((edge) => edgeContainsPoint(edge, point));
        if (!edge) {
            return null;
        }

        if (
            [LayoutNodeEdgeType.LEFT, LayoutNodeEdgeType.TOP].includes(edge.edge) &&
            this._children.at(0)?.getModuleInstanceId() === draggedModuleInstanceId
        ) {
            return null;
        }
        if (
            [LayoutNodeEdgeType.RIGHT, LayoutNodeEdgeType.BOTTOM].includes(edge.edge) &&
            this._children.at(this._children.length - 1)?.getModuleInstanceId() === draggedModuleInstanceId
        ) {
            return null;
        }

        if (
            edge.edge === LayoutNodeEdgeType.RIGHT &&
            this._parent &&
            this._parent._layoutDirection === LayoutDirection.HORIZONTAL
        ) {
            if (this._parent._children.at(0)?.getModuleInstanceId() === draggedModuleInstanceId) {
                return null;
            }
        }

        if (edge.edge === LayoutNodeEdgeType.VERTICAL) {
            const reversedLayoutBoxChildren = [...this._children].reverse();
            const prevChild = reversedLayoutBoxChildren.find((child) => child.getAbsoluteRect().x < edge.position);
            if (prevChild?.getModuleInstanceId() === draggedModuleInstanceId) {
                return null;
            }
            const nextChild = this._children.find((child) => child.getAbsoluteRect().x >= edge.position);
            if (nextChild?.getModuleInstanceId() === draggedModuleInstanceId) {
                return null;
            }
        }

        if (edge.edge === LayoutNodeEdgeType.HORIZONTAL) {
            const reversedLayoutBoxChildren = [...this._children].reverse();
            const prevChild = reversedLayoutBoxChildren.find((child) => child.getAbsoluteRect().y < edge.position);
            if (prevChild?.getModuleInstanceId() === draggedModuleInstanceId) {
                return null;
            }
            const nextChild = this._children.find((child) => child.getAbsoluteRect().y >= edge.position);
            if (nextChild?.getModuleInstanceId() === draggedModuleInstanceId) {
                return null;
            }
        }
        return edge || null;
    }

    clone(parent: LayoutNode | null = null): LayoutNode {
        const rect = this._rectRelativeToParent;
        const clone = new LayoutNode(
            { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
            this._layoutDirection,
            parent,
            this._level,
        );
        clone._moduleInstanceId = this._moduleInstanceId;
        clone._moduleName = this._moduleName;
        clone._children = this._children.map((child) => child.clone(clone));
        clone._isWrapper = this._isWrapper;
        return clone;
    }

    previewLayout(
        pointerLocalPx: Vec2,
        viewport: Size2D,
        draggedModuleInstanceId: string,
        isNewModule: boolean,
    ): LayoutNode | null {
        if (this._parent) return null; // only root orchestrates preview

        const preview = this.clone();

        // If empty and it's a new module, fill full area
        if (isNewModule && preview._children.length === 0) {
            const dragged = new LayoutNode(
                { x: 0, y: 0, width: 1, height: 1 },
                LayoutDirection.SINGLE,
                preview,
                preview._level + 1,
            );
            dragged._moduleInstanceId = draggedModuleInstanceId;
            dragged._isWrapper = false;
            preview._children.push(dragged);
            preview._isWrapper = true;
            return preview;
        }

        // Find node under pointer (existing code used findBoxContainingPoint)
        const layoutBox = preview.findBoxContainingPoint(pointerLocalPx, viewport);
        if (!layoutBox) return null;

        // Edge/sash hit test (existing code: findEdgeContainingPoint)
        const edge = layoutBox.findEdgeContainingPoint(pointerLocalPx, viewport, draggedModuleInstanceId);
        if (!edge) return null;

        // Move existing or add new (existing code: moveLayoutElement / addLayoutElement)
        let dragged = preview.findBoxContainingModuleInstance(draggedModuleInstanceId);
        if (!dragged) {
            if (!isNewModule) return null;
            dragged = new LayoutNode(
                { x: 0, y: 0, width: 1, height: 1 },
                LayoutDirection.SINGLE,
                preview,
                preview._level + 1,
            );
            dragged._moduleInstanceId = draggedModuleInstanceId;
            dragged._isWrapper = false;
            preview.addLayoutElement(dragged, layoutBox, edge);
        } else {
            preview.moveLayoutElement(dragged, layoutBox, edge);
        }

        preview.normalizeDeep();

        return preview;
    }

    private convertSingleLayoutToWrapper(convertTo: LayoutDirection.HORIZONTAL | LayoutDirection.VERTICAL): void {
        if (this._layoutDirection === convertTo) {
            return;
        }

        const newLayoutBox = new LayoutNode(
            { x: 0, y: 0, width: 1, height: 1 },
            LayoutDirection.SINGLE,
            this,
            this._level + 1,
        );

        newLayoutBox._moduleInstanceId = this._moduleInstanceId;
        newLayoutBox._isWrapper = false;
        newLayoutBox._moduleName = this._moduleName;

        this.setChildren([newLayoutBox]);
        this._moduleInstanceId = "";
        this._moduleName = "";
        this._isWrapper = true;
        this._layoutDirection = convertTo;
    }

    private convertWrapperToSingleLayout(): void {
        if (this._layoutDirection === LayoutDirection.SINGLE) {
            return;
        }

        if (this._children.length !== 1) {
            return;
        }

        const child = this._children[0];
        this._moduleInstanceId = child._moduleInstanceId;
        this._moduleName = child._moduleName;
        this._isWrapper = false;
        this._layoutDirection = LayoutDirection.SINGLE;
        this._children = [];
    }

    private positionToIndex(position: number, ignoreBoxes: LayoutNode[]): number {
        if (this._layoutDirection === LayoutDirection.HORIZONTAL) {
            const elementsBeforePosition = this._children.filter((child) => {
                if (ignoreBoxes.includes(child)) return false;
                const abs = child.getAbsoluteRect();
                return abs.x < position;
            });
            return elementsBeforePosition.length;
        }
        if (this._layoutDirection === LayoutDirection.VERTICAL) {
            const elementsBeforePosition = this._children.filter((child) => {
                if (ignoreBoxes.includes(child)) return false;
                const abs = child.getAbsoluteRect();
                return abs.y < position;
            });
            return elementsBeforePosition.length;
        }
        return 0;
    }

    moveLayoutElement(source: LayoutNode, destination: LayoutNode, edge: LayoutNodeEdge): void {
        if (source === destination) {
            return;
        }

        const oldParent = source._parent;

        if (edge.edge === LayoutNodeEdgeType.LEFT || edge.edge === LayoutNodeEdgeType.TOP) {
            if (destination._layoutDirection === LayoutDirection.SINGLE) {
                const layoutType =
                    edge.edge === LayoutNodeEdgeType.LEFT ? LayoutDirection.HORIZONTAL : LayoutDirection.VERTICAL;
                destination.convertSingleLayoutToWrapper(layoutType);
            }
            if (source._parent !== destination) {
                source._parent?.removeChild(source);
                source._isNewInParent = true;
                destination.prependChild(source);
                source._parent = destination;
            } else {
                destination._children = [source, ...destination._children.filter((child) => child !== source)];
                destination.reorderChildren();
            }
            return;
        }

        if (edge.edge === LayoutNodeEdgeType.RIGHT || edge.edge === LayoutNodeEdgeType.BOTTOM) {
            if (destination._layoutDirection === LayoutDirection.SINGLE) {
                const layoutType =
                    edge.edge === LayoutNodeEdgeType.RIGHT ? LayoutDirection.HORIZONTAL : LayoutDirection.VERTICAL;
                destination.convertSingleLayoutToWrapper(layoutType);
            }
            if (source._parent !== destination) {
                source._parent?.removeChild(source);
                source._isNewInParent = true;
                destination.appendChild(source);
                source._parent = destination;
            } else {
                destination._children = [...destination._children.filter((child) => child !== source), source];
                destination.reorderChildren();
            }
            return;
        }

        if (edge.edge === LayoutNodeEdgeType.VERTICAL || edge.edge === LayoutNodeEdgeType.HORIZONTAL) {
            const index = destination.positionToIndex(edge.position, [source]);
            if (source._parent !== destination) {
                source._parent?.removeChild(source);
                source._isNewInParent = true;
                destination.insertChildAt(source, index);
                source._parent = destination;
            } else {
                const otherElements = destination._children.filter((child) => child !== source);
                const elementsBefore = otherElements.slice(0, index);
                const elementsAfter = otherElements.slice(index);
                destination._children = [...elementsBefore, source, ...elementsAfter];
                destination.reorderChildren();
            }
            return;
        }

        // Normalize both the destination chain and the old parent chain
        destination.normalizeUpwards();
        if (oldParent && oldParent !== destination) oldParent.normalizeUpwards();
    }

    addLayoutElement(newBox: LayoutNode, destination: LayoutNode, edge: LayoutNodeEdge): void {
        if (edge.edge === LayoutNodeEdgeType.LEFT || edge.edge === LayoutNodeEdgeType.TOP) {
            if (destination._layoutDirection === LayoutDirection.SINGLE) {
                const layoutType =
                    edge.edge === LayoutNodeEdgeType.LEFT ? LayoutDirection.HORIZONTAL : LayoutDirection.VERTICAL;
                destination.convertSingleLayoutToWrapper(layoutType);
            }
            newBox._isNewInParent = true;
            destination.prependChild(newBox);
            newBox._parent = destination;
            return;
        }

        if (edge.edge === LayoutNodeEdgeType.RIGHT || edge.edge === LayoutNodeEdgeType.BOTTOM) {
            if (destination._layoutDirection === LayoutDirection.SINGLE) {
                const layoutType =
                    edge.edge === LayoutNodeEdgeType.RIGHT ? LayoutDirection.HORIZONTAL : LayoutDirection.VERTICAL;
                destination.convertSingleLayoutToWrapper(layoutType);
            }
            newBox._isNewInParent = true;
            destination.appendChild(newBox);
            newBox._parent = destination;
            return;
        }

        if (edge.edge === LayoutNodeEdgeType.VERTICAL || edge.edge === LayoutNodeEdgeType.HORIZONTAL) {
            const index = destination.positionToIndex(edge.position, []);
            newBox._isNewInParent = true;
            destination.insertChildAt(newBox, index);
            newBox._parent = destination;
            return;
        }

        destination.normalizeUpwards();
    }

    removeLayoutElement(moduleInstanceId: string): void {
        if (this._isWrapper) {
            this._children.forEach((child) => child.removeLayoutElement(moduleInstanceId));
        } else if (this._moduleInstanceId === moduleInstanceId) {
            if (this._parent) {
                this._parent.removeChild(this);
            }
        }
    }

    toLayout(): LayoutElement[] {
        const layout: LayoutElement[] = [];

        if (this._isWrapper) {
            this._children.forEach((child) => {
                layout.push(...child.toLayout());
            });
        } else {
            const absoluteRect = this.getAbsoluteRect();
            layout.push({
                relX: absoluteRect.x,
                relY: absoluteRect.y,
                relWidth: absoluteRect.width,
                relHeight: absoluteRect.height,
                moduleInstanceId: this._moduleInstanceId || undefined,
                moduleName: this._moduleName,
            });
        }

        return layout;
    }

    pathFromRoot(): number[] {
        const path: number[] = [];
        /* eslint-disable @typescript-eslint/no-this-alias */
        let node: LayoutNode | null = this;
        while (node && node._parent) {
            const idx = node._parent._children.indexOf(node);
            path.unshift(idx);
            node = node._parent;
        }
        return path;
    }

    static findByPath(root: LayoutNode, path: number[]): LayoutNode | null {
        let cur: LayoutNode | null = root;
        for (const idx of path) {
            if (!cur) return null;
            cur = cur._children[idx] ?? null;
        }
        return cur;
    }

    resizeAtDivider(index: number, axis: "vertical" | "horizontal", pos01: number, minFractions: Size2D): void {
        // Only valid on split containers of the right axis
        const isVerticalSplit = this._layoutDirection === LayoutDirection.HORIZONTAL; // vertical sash between columns
        const isHorizontalSplit = this._layoutDirection === LayoutDirection.VERTICAL; // horizontal sash between rows

        if ((axis === "vertical" && !isVerticalSplit) || (axis === "horizontal" && !isHorizontalSplit)) {
            return;
        }
        if (index <= 0 || index >= this._children.length) return;

        // Normalize children rects to 0..1 within this container
        const totalSpan =
            axis === "vertical"
                ? this._children.reduce((acc, ch) => acc + ch._rectRelativeToParent.width, 0)
                : this._children.reduce((acc, ch) => acc + ch._rectRelativeToParent.height, 0);

        // Guard: if someone left non-normalized, renormalize first
        if (Math.abs(totalSpan - 1) > 1e-6) {
            if (axis === "vertical") {
                let sum = 0;
                for (const ch of this._children) sum += ch._rectRelativeToParent.width;
                for (const ch of this._children) ch._rectRelativeToParent.width /= sum || 1;
                // recompute x
                let x = 0;
                for (const ch of this._children) {
                    ch._rectRelativeToParent.x = x;
                    x += ch._rectRelativeToParent.width;
                }
            } else {
                let sum = 0;
                for (const ch of this._children) sum += ch._rectRelativeToParent.height;
                for (const ch of this._children) ch._rectRelativeToParent.height /= sum || 1;
                // recompute y
                let y = 0;
                for (const ch of this._children) {
                    ch._rectRelativeToParent.y = y;
                    y += ch._rectRelativeToParent.height;
                }
            }
        }

        // Compute cumulative spans to get neighbor sizes
        if (axis === "vertical") {
            // reposition sash between index-1 and index to pos01 in [0..1]
            const left = this._children[index - 1];
            const right = this._children[index];

            const leftStart = left._rectRelativeToParent.x;
            const rightEnd = right._rectRelativeToParent.x + right._rectRelativeToParent.width;

            // Clamp pos01 within [leftStart + min, rightEnd - min]
            const min = minFractions.width;
            const newPos = Math.max(leftStart + min, Math.min(rightEnd - min, pos01));

            const newLeftWidth = newPos - leftStart;
            const newRightWidth = rightEnd - newPos;

            left._rectRelativeToParent.width = newLeftWidth;
            right._rectRelativeToParent.x = newPos;
            right._rectRelativeToParent.width = newRightWidth;
        } else {
            // axis === "horizontal"
            const top = this._children[index - 1];
            const bottom = this._children[index];

            const topStart = top._rectRelativeToParent.y;
            const bottomEnd = bottom._rectRelativeToParent.y + bottom._rectRelativeToParent.height;

            const min = minFractions.height;
            const newPos = Math.max(topStart + min, Math.min(bottomEnd - min, pos01));

            const newTopHeight = newPos - topStart;
            const newBottomHeight = bottomEnd - newPos;

            top._rectRelativeToParent.height = newTopHeight;
            bottom._rectRelativeToParent.y = newPos;
            bottom._rectRelativeToParent.height = newBottomHeight;
        }
    }

    /** Hit-test for a sash (divider) at a pointer in local px. Returns the owning container and divider index. */
    hitTestDivider(
        pointLocalPx: Vec2,
        viewport: Size2D,
    ): { containerPath: number[]; axis: LayoutAxis; index: number } | null {
        // Only containers (not SINGLE leaves) can own dividers.
        // We recurse so deepest container wins (most specific).
        if (
            this._layoutDirection === LayoutDirection.HORIZONTAL ||
            this._layoutDirection === LayoutDirection.VERTICAL
        ) {
            // test children first
            for (let i = 0; i < this._children.length; i++) {
                const child = this._children[i];
                const hit = child.hitTestDivider(pointLocalPx, viewport);
                if (hit) return hit;
            }

            // then test our own dividers
            const edges = this.makeEdges(viewport, EDGE_RESIZE_WEIGHT, LAYOUT_BOX_RESIZE_MARGIN);

            // vertical dividers exist when we're HORIZONTAL (columns)
            if (this._layoutDirection === LayoutDirection.HORIZONTAL) {
                const verticals = edges.filter((e) => e.edge === LayoutNodeEdgeType.VERTICAL);
                for (let idx = 0; idx < verticals.length; idx++) {
                    if (edgeContainsPoint(verticals[idx], pointLocalPx)) {
                        return { containerPath: this.pathFromRoot(), axis: LayoutAxis.VERTICAL, index: idx + 1 };
                    }
                }
            }

            // horizontal dividers exist when we're VERTICAL (rows)
            if (this._layoutDirection === LayoutDirection.VERTICAL) {
                const horizontals = edges.filter((e) => e.edge === LayoutNodeEdgeType.HORIZONTAL);
                for (let idx = 0; idx < horizontals.length; idx++) {
                    if (edgeContainsPoint(horizontals[idx], pointLocalPx)) {
                        return { containerPath: this.pathFromRoot(), axis: LayoutAxis.HORIZONTAL, index: idx + 1 };
                    }
                }
            }
        }

        return null;
    }

    /** Return true if this node is a split container (HORIZONTAL or VERTICAL). */
    private isContainer(): boolean {
        return (
            this._layoutDirection === LayoutDirection.HORIZONTAL || this._layoutDirection === LayoutDirection.VERTICAL
        );
    }

    /** Remove any empty child containers (recursively) and convert to SINGLE if 1 useful child remains. */
    private pruneEmptyContainers(): void {
        if (!this.isContainer()) return;

        // Remove empty children entirely
        this._children = this._children.filter((c) => c._moduleInstanceId || c._children.length > 0);

        // If any child is a container with no children after prune, drop it
        this._children = this._children.filter((c) => !(c.isContainer() && c._children.length === 0));

        // If no children left and we aren't root, let parent remove us in its pass
        if (this._children.length === 0) return;

        // If exactly one child remains, adopt it appropriately
        if (this._children.length === 1) {
            const only = this._children[0];

            // If child's a container with same direction, flatten (handled below)
            if (!only.isContainer()) {
                // Leaf: become SINGLE leaf
                this._moduleInstanceId = only._moduleInstanceId;
                this._moduleName = only._moduleName;
                this._isWrapper = false;
                this._layoutDirection = LayoutDirection.SINGLE;
                this._children = [];
                return;
            }
        }
    }

    /** If a child is a container with the same layoutDirection, pull its children up (flatten). */
    private flattenSameDirectionChildren(): void {
        if (!this.isContainer()) return;

        const sameDir = this._layoutDirection;
        const flattened: LayoutNode[] = [];

        for (const child of this._children) {
            if (child.isContainer() && child._layoutDirection === sameDir) {
                // Pull up grandchildren, remap their rects from child's 0..1 into this child's rect
                const base = child._rectRelativeToParent; // relative to "this"
                for (const gc of child._children) {
                    // Map gc rect (relative to child) into this
                    const r = {
                        x: base.x + gc._rectRelativeToParent.x * base.width,
                        y: base.y + gc._rectRelativeToParent.y * base.height,
                        width: gc._rectRelativeToParent.width * base.width,
                        height: gc._rectRelativeToParent.height * base.height,
                    };
                    gc._rectRelativeToParent = r;
                    gc._parent = this;
                    flattened.push(gc);
                }
            } else {
                flattened.push(child);
            }
        }

        this._children = flattened;
    }

    /** Normalize child spans so they are contiguous and sum to 1 along the split axis. */
    private normalizeSpans(): void {
        if (!this.isContainer() || this._children.length === 0) return;

        const horizontal = this._layoutDirection === LayoutDirection.HORIZONTAL;
        let total = 0;

        for (const ch of this._children) {
            total += horizontal ? ch._rectRelativeToParent.width : ch._rectRelativeToParent.height;
        }
        if (total <= 0) {
            // even split
            const even = 1 / this._children.length;
            let cursor = 0;
            for (const ch of this._children) {
                if (horizontal) {
                    ch._rectRelativeToParent = { x: cursor, y: 0, width: even, height: 1 };
                    cursor += even;
                } else {
                    ch._rectRelativeToParent = { x: 0, y: cursor, width: 1, height: even };
                    cursor += even;
                }
            }
            return;
        }

        // Normalize and make contiguous
        let cursor = 0;
        for (let i = 0; i < this._children.length; i++) {
            const ch = this._children[i];
            if (horizontal) {
                const w = ch._rectRelativeToParent.width / total;
                const width = i === this._children.length - 1 ? 1 - cursor : w; // last child takes remainder
                ch._rectRelativeToParent = { x: cursor, y: 0, width, height: 1 };
                cursor += width;
            } else {
                const h = ch._rectRelativeToParent.height / total;
                const height = i === this._children.length - 1 ? 1 - cursor : h;
                ch._rectRelativeToParent = { x: 0, y: cursor, width: 1, height };
                cursor += height;
            }
        }
    }

    /** If this node is SINGLE, ensure it has no children; if a container ends up with one leaf, unwrap it. */
    private enforceLeafVsContainer(): void {
        if (this._layoutDirection === LayoutDirection.SINGLE) {
            this._children = [];
            this._isWrapper = false;
            return;
        }
        if (this.isContainer() && this._children.length === 1 && !this._children[0].isContainer()) {
            // container with one leaf -> become leaf in place
            const only = this._children[0];
            this._moduleInstanceId = only._moduleInstanceId;
            this._moduleName = only._moduleName;
            this._layoutDirection = LayoutDirection.SINGLE;
            this._isWrapper = false;
            this._children = [];
        }
    }

    /** Run a full normalization pass on this subtree, bottom-up. */
    normalizeDeep(): void {
        for (const ch of this._children) ch.normalizeDeep();

        // local fixes
        this.pruneEmptyContainers();
        this.flattenSameDirectionChildren();
        this.enforceLeafVsContainer();

        // If still a container, normalize spans & re-level / re-parent metadata
        if (this.isContainer() && this._children.length > 0) {
            this.normalizeSpans();
            for (const ch of this._children) {
                ch._parent = this;
                ch._level = this._level + 1;
            }
        }
    }

    /** Normalize up the chain to the root (useful after a local move/insert/remove). */
    private normalizeUpwards(): void {
        let n: LayoutNode | null = this;
        while (n) {
            // local pass
            n.pruneEmptyContainers();
            n.flattenSameDirectionChildren();
            n.enforceLeafVsContainer();
            if (n.isContainer() && n._children.length > 0) {
                n.normalizeSpans();
                for (const ch of n._children) {
                    ch._parent = n;
                    ch._level = n._level + 1;
                }
            }
            n = n._parent;
        }
    }
}

export function makeLayoutNodes(layoutElements: LayoutElement[]): LayoutNode {
    const root = new LayoutNode({ x: 0, y: 0, width: 1, height: 1 }, LayoutDirection.MAIN, null, 1);
    root.makeChildren(layoutElements);
    return root;
}
