import type { LayoutElement } from "@framework/internal/WorkbenchSession/Dashboard";
import type { Rect2D, Size2D } from "@lib/utils/geometry";
import { outerRectContainsInnerRect, rectContainsPoint } from "@lib/utils/geometry";
import type { Vec2 } from "@lib/utils/vec2";

function layoutElementToRect(layoutElement: LayoutElement): Rect2D {
    return {
        x: layoutElement.relX,
        y: layoutElement.relY,
        width: layoutElement.relWidth,
        height: layoutElement.relHeight,
    };
}

export const LAYOUT_BOX_DROP_MARGIN = 25;
export const LAYOUT_BOX_RESIZE_MARGIN = 5;
export const EDGE_DROP_WEIGHT = 50;
export const EDGE_RESIZE_WEIGHT = 5;

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

export type LayoutNodeEdge =
    | {
          edge: Exclude<LayoutNodeEdgeType, LayoutNodeEdgeType.HORIZONTAL | LayoutNodeEdgeType.VERTICAL>;
          rect: Rect2D;
      }
    | {
          position: number;
          edge: LayoutNodeEdgeType.HORIZONTAL | LayoutNodeEdgeType.VERTICAL;
          rect: Rect2D;
      };

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

    getRectWithMargin(realSizeFactor: Size2D): Rect2D {
        const absoluteRect = this.getAbsoluteRect();

        const lvl = this._level;
        const parentLvl = this._parent?._level ?? lvl;

        let mx = parentLvl;
        if (this._parent === null || this._parent._layoutDirection === LayoutDirection.HORIZONTAL) {
            mx = lvl;
        }

        let my = parentLvl;
        if (this._parent === null || this._parent._layoutDirection !== LayoutDirection.HORIZONTAL) {
            my = lvl;
        }

        return {
            x: absoluteRect.x * realSizeFactor.width + LAYOUT_BOX_DROP_MARGIN * mx,
            y: absoluteRect.y * realSizeFactor.height + LAYOUT_BOX_DROP_MARGIN * my,
            width: absoluteRect.width * realSizeFactor.width - LAYOUT_BOX_DROP_MARGIN * 2 * mx,
            height: absoluteRect.height * realSizeFactor.height - LAYOUT_BOX_DROP_MARGIN * 2 * my,
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

    getEdgeRects(realSize: Size2D, edgeWeight: number, edgeMargin: number): LayoutNodeEdge[] {
        const rect = this.getRectWithMargin(realSize);
        const edges: LayoutNodeEdge[] = [];

        if (this._layoutDirection === LayoutDirection.SINGLE && this._parent) {
            if (this._parent._layoutDirection === LayoutDirection.HORIZONTAL) {
                edges.push({
                    rect: { x: rect.x, y: rect.y, width: rect.width, height: 0.25 * rect.height },
                    edge: LayoutNodeEdgeType.TOP,
                });
                edges.push({
                    rect: { x: rect.x, y: rect.y + 0.75 * rect.height, width: rect.width, height: 0.25 * rect.height },
                    edge: LayoutNodeEdgeType.BOTTOM,
                });
            }
            if (this._parent._layoutDirection === LayoutDirection.VERTICAL) {
                edges.push({
                    rect: { x: rect.x, y: rect.y, width: 0.25 * rect.width, height: rect.height },
                    edge: LayoutNodeEdgeType.LEFT,
                });
                edges.push({
                    rect: { x: rect.x + 0.75 * rect.width, y: rect.y, width: 0.25 * rect.width, height: rect.height },
                    edge: LayoutNodeEdgeType.RIGHT,
                });
            }
            if (this._parent._layoutDirection === LayoutDirection.MAIN) {
                edges.push({
                    rect: { x: rect.x, y: rect.y, width: rect.width, height: 0.25 * rect.height },
                    edge: LayoutNodeEdgeType.TOP,
                });
                edges.push({
                    rect: { x: rect.x, y: rect.y + 0.75 * rect.height, width: rect.width, height: 0.25 * rect.height },
                    edge: LayoutNodeEdgeType.BOTTOM,
                });
                edges.push({
                    rect: { x: rect.x, y: rect.y, width: 0.25 * rect.width, height: rect.height },
                    edge: LayoutNodeEdgeType.LEFT,
                });
                edges.push({
                    rect: { x: rect.x + 0.75 * rect.width, y: rect.y, width: 0.25 * rect.width, height: rect.height },
                    edge: LayoutNodeEdgeType.RIGHT,
                });
            }
        }
        if (this._layoutDirection === LayoutDirection.HORIZONTAL) {
            edges.push(
                {
                    rect: {
                        x: rect.x + rect.width - edgeWeight,
                        y: rect.y,
                        width: edgeWeight,
                        height: rect.height,
                    },
                    edge: LayoutNodeEdgeType.RIGHT,
                },
                {
                    rect: { x: rect.x, y: rect.y, width: edgeWeight, height: rect.height },
                    edge: LayoutNodeEdgeType.LEFT,
                },
            );
        }
        if (this._layoutDirection === LayoutDirection.VERTICAL) {
            edges.push(
                {
                    rect: { x: rect.x, y: rect.y, width: rect.width, height: edgeWeight },
                    edge: LayoutNodeEdgeType.TOP,
                },
                {
                    rect: {
                        x: rect.x,
                        y: rect.y + rect.height - edgeWeight,
                        width: rect.width,
                        height: edgeWeight,
                    },
                    edge: LayoutNodeEdgeType.BOTTOM,
                },
            );
        }

        if (this._layoutDirection === LayoutDirection.HORIZONTAL) {
            for (let i = 1; i < this._children.length; i++) {
                const child = this._children[i];
                const absoluteRect = child.getAbsoluteRect();
                edges.push({
                    rect: {
                        x: absoluteRect.x * realSize.width - edgeWeight / 2,
                        y: absoluteRect.y * realSize.height + edgeMargin * this._level,
                        width: edgeWeight,
                        height: absoluteRect.height * realSize.height - edgeMargin * this._level * 2,
                    },
                    edge: LayoutNodeEdgeType.VERTICAL,
                    position: absoluteRect.x,
                });
            }
        }

        if (this._layoutDirection === LayoutDirection.VERTICAL) {
            for (let i = 1; i < this._children.length; i++) {
                const child = this._children[i];
                const absoluteRect = child.getAbsoluteRect();
                edges.push({
                    rect: {
                        x: absoluteRect.x * realSize.width + edgeMargin * this._level,
                        y: absoluteRect.y * realSize.height - edgeWeight / 2,
                        width: absoluteRect.width * realSize.width - edgeMargin * this._level * 2,
                        height: edgeWeight,
                    },
                    edge: LayoutNodeEdgeType.HORIZONTAL,
                    position: absoluteRect.y,
                });
            }
        }

        return edges;
    }

    findEdgeContainingPoint(point: Vec2, realSize: Size2D, draggedModuleInstanceId: string): LayoutNodeEdge | null {
        const edgeRects = this.getEdgeRects(realSize, EDGE_DROP_WEIGHT, LAYOUT_BOX_DROP_MARGIN);
        const edge = edgeRects.find((edgeRect) => rectContainsPoint(edgeRect.rect, point));
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
            const elementsBeforePosition = this._children.filter(
                (child) => !ignoreBoxes.includes(child) && child._rectRelativeToParent.x < position,
            );
            return elementsBeforePosition.length;
        }
        if (this._layoutDirection === LayoutDirection.VERTICAL) {
            const elementsBeforePosition = this._children.filter(
                (child) => !ignoreBoxes.includes(child) && child._rectRelativeToParent.y < position,
            );
            return elementsBeforePosition.length;
        }

        return position;
    }

    moveLayoutElement(source: LayoutNode, destination: LayoutNode, edge: LayoutNodeEdge): void {
        if (source === destination) {
            return;
        }

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
    ): { containerPath: number[]; axis: "vertical" | "horizontal"; index: number } | null {
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
            const edges = this.getEdgeRects(viewport, EDGE_RESIZE_WEIGHT, LAYOUT_BOX_RESIZE_MARGIN);

            // vertical dividers exist when we're HORIZONTAL (columns)
            if (this._layoutDirection === LayoutDirection.HORIZONTAL) {
                const verticals = edges.filter((e) => e.edge === LayoutNodeEdgeType.VERTICAL);
                for (let idx = 0; idx < verticals.length; idx++) {
                    const r = verticals[idx].rect;
                    if (rectContainsPoint(r, pointLocalPx)) {
                        return { containerPath: this.pathFromRoot(), axis: "vertical", index: idx + 1 };
                    }
                }
            }

            // horizontal dividers exist when we're VERTICAL (rows)
            if (this._layoutDirection === LayoutDirection.VERTICAL) {
                const horizontals = edges.filter((e) => e.edge === LayoutNodeEdgeType.HORIZONTAL);
                for (let idx = 0; idx < horizontals.length; idx++) {
                    const r = horizontals[idx].rect;
                    if (rectContainsPoint(r, pointLocalPx)) {
                        return { containerPath: this.pathFromRoot(), axis: "horizontal", index: idx + 1 };
                    }
                }
            }
        }

        return null;
    }
}

export function makeLayoutNodes(layoutElements: LayoutElement[]): LayoutNode {
    const root = new LayoutNode({ x: 0, y: 0, width: 1, height: 1 }, LayoutDirection.MAIN, null, 1);
    root.makeChildren(layoutElements);
    return root;
}
