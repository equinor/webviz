import React from "react";

import { LayoutElement } from "@framework/Workbench";
import {
    Point2D,
    Rect2D,
    Size2D,
    outerRectContainsInnerRect,
    rectContainsPoint,
    rectsAreEqual,
} from "@lib/utils/geometry";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

function layoutElementToRect(layoutElement: LayoutElement): Rect2D {
    return {
        x: layoutElement.relX,
        y: layoutElement.relY,
        width: layoutElement.relWidth,
        height: layoutElement.relHeight,
    };
}

const layoutBoxMargin = 25;
const edgeWeight = 50;

export enum LayoutBoxEdgeType {
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

export type LayoutBoxEdge =
    | {
          edge: Exclude<LayoutBoxEdgeType, LayoutBoxEdgeType.HORIZONTAL | LayoutBoxEdgeType.VERTICAL>;
          rect: Rect2D;
      }
    | {
          position: number;
          edge: LayoutBoxEdgeType.HORIZONTAL | LayoutBoxEdgeType.VERTICAL;
          rect: Rect2D;
      };

export class LayoutBox {
    private _rectRelativeToParent: Rect2D;
    private _children: LayoutBox[];
    private _level: number;
    private _moduleInstanceId: string | undefined;
    private _moduleName: string;
    private _isWrapper: boolean;
    private _parent: LayoutBox | null;
    private _layoutDirection: LayoutDirection;

    constructor(
        rect: Rect2D,
        direction: LayoutDirection,
        parent: LayoutBox | null = null,
        level = 0,
        children: LayoutBox[] = []
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
        if (this._parent === null) {
            return {
                x: absoluteRect.x * realSizeFactor.width + layoutBoxMargin * this._level,
                y: absoluteRect.y * realSizeFactor.height + layoutBoxMargin * this._level,
                width: absoluteRect.width * realSizeFactor.width - layoutBoxMargin * 2 * this._level,
                height: absoluteRect.height * realSizeFactor.height - layoutBoxMargin * 2 * this._level,
            };
        }
        if (this._parent._layoutDirection === LayoutDirection.HORIZONTAL) {
            return {
                x: absoluteRect.x * realSizeFactor.width + layoutBoxMargin * this._level,
                y: absoluteRect.y * realSizeFactor.height + layoutBoxMargin * this._parent._level,
                width: absoluteRect.width * realSizeFactor.width - layoutBoxMargin * 2 * this._level,
                height: absoluteRect.height * realSizeFactor.height - layoutBoxMargin * 2 * this._parent._level,
            };
        }
        return {
            x: absoluteRect.x * realSizeFactor.width + layoutBoxMargin * this._parent._level,
            y: absoluteRect.y * realSizeFactor.height + layoutBoxMargin * this._level,
            width: absoluteRect.width * realSizeFactor.width - layoutBoxMargin * 2 * this._parent._level,
            height: absoluteRect.height * realSizeFactor.height - layoutBoxMargin * 2 * this._level,
        };
    }

    toString(): string {
        let text = `LayoutBox(${this._rectRelativeToParent.x}, ${this._rectRelativeToParent.y}, ${this._rectRelativeToParent.width}, ${this._rectRelativeToParent.height})`;
        let currentParent = this._parent;
        while (currentParent) {
            text += currentParent.toString();
            currentParent = currentParent._parent;
        }
        return text;
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

    private getAbsoluteRect(): Rect2D {
        if (this._parent === null) {
            return this._rectRelativeToParent;
        }
        return this._parent.transformRectToAbsolute(this._rectRelativeToParent);
    }

    transformRectToAbsolute(rect: Rect2D): Rect2D {
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

    makeChildren(containedElements: LayoutElement[]) {
        if (containedElements.length === 0) {
            return;
        }
        if (containedElements.length === 1) {
            if (this._layoutDirection === LayoutDirection.MAIN) {
                const elementsInRect = containedElements.filter((layoutElement) =>
                    outerRectContainsInnerRect(this.getAbsoluteRect(), layoutElementToRect(layoutElement))
                );
                const childBox = new LayoutBox(
                    this._rectRelativeToParent,
                    LayoutDirection.SINGLE,
                    this,
                    this._level + 1
                );
                childBox._isWrapper = true;
                childBox.makeChildren(elementsInRect);
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
        const layoutBoxes: LayoutBox[] = [];

        // First try to rasterize vertically
        const rasterY: number[] = [];
        const absoluteRect = this.getAbsoluteRect();
        let y = absoluteRect.y;
        while (y < absoluteRect.y + absoluteRect.height) {
            const elementsAtY = containedElements.filter((layoutElement) => layoutElement.relY === y);
            if (elementsAtY.length === 0) {
                break;
            }
            const maxHeight = Math.max(...elementsAtY.map((layoutElement) => layoutElement.relHeight));
            y += maxHeight;
            rasterY.push(y);
        }

        if (rasterY.length > 1) {
            let lastY = absoluteRect.y;
            rasterY.forEach((y) => {
                const rect: Rect2D = {
                    x: absoluteRect.x,
                    y: lastY,
                    width: absoluteRect.width,
                    height: y - lastY,
                };
                const elementsInRect = containedElements.filter((layoutElement) =>
                    outerRectContainsInnerRect(rect, layoutElementToRect(layoutElement))
                );
                const childBox = new LayoutBox(
                    this.transformRectToRelative(rect),
                    LayoutDirection.HORIZONTAL,
                    this,
                    this._level + 1
                );
                childBox.makeChildren(elementsInRect);
                layoutBoxes.push(childBox);
                lastY = y;
            });
            this._children = layoutBoxes;
            if (this._layoutDirection === LayoutDirection.MAIN) {
                this._layoutDirection = LayoutDirection.HORIZONTAL;
                const wrapper = new LayoutBox(
                    this._rectRelativeToParent,
                    LayoutDirection.VERTICAL,
                    this,
                    1,
                    this._children
                );
                this._children.forEach((child) => (child._parent = wrapper));
                this._level = 0;
                this.setChildren([wrapper]);
            }
            return;
        }

        // Then try to rasterize horizontally
        const rasterX: number[] = [];
        let x = absoluteRect.x;
        while (x < absoluteRect.x + absoluteRect.width) {
            const elementsAtX = containedElements.filter((layoutElement) => layoutElement.relX === x);
            if (elementsAtX.length === 0) {
                break;
            }
            const maxWidth = Math.max(...elementsAtX.map((layoutElement) => layoutElement.relWidth));
            x += maxWidth;
            rasterX.push(x);
        }

        if (rasterX.length > 1) {
            let lastX = absoluteRect.x;
            rasterX.forEach((x) => {
                const rect: Rect2D = {
                    x: lastX,
                    y: absoluteRect.y,
                    width: x - lastX,
                    height: absoluteRect.height,
                };
                const elementsInRect = containedElements.filter((layoutElement) =>
                    outerRectContainsInnerRect(rect, layoutElementToRect(layoutElement))
                );
                const childBox = new LayoutBox(
                    this.transformRectToRelative(rect),
                    LayoutDirection.VERTICAL,
                    this,
                    this._level + 1
                );
                childBox.makeChildren(elementsInRect);
                layoutBoxes.push(childBox);
                lastX = x;
            });
            this._children = layoutBoxes;
            if (this._layoutDirection === LayoutDirection.MAIN) {
                this._layoutDirection = LayoutDirection.VERTICAL;
                const wrapper = new LayoutBox(
                    this._rectRelativeToParent,
                    LayoutDirection.HORIZONTAL,
                    this,
                    1,
                    this._children
                );
                this._children.forEach((child) => (child._parent = wrapper));
                this._level = 0;
                this.setChildren([wrapper]);
            }
            return;
        }

        this._children = layoutBoxes;
    }

    private reorderChildren() {
        if (this._layoutDirection === LayoutDirection.HORIZONTAL) {
            let currentX = 0;
            // const totalWidth = this.getTotalWidth();
            const newWidth = 1 / this._children.length;
            this._children.forEach((child) => {
                // const newWidth = child._rectRelativeToParent.width / totalWidth;
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
            // const totalHeight = this.getTotalHeight();
            const newHeight = 1 / this._children.length;
            this._children.forEach((child) => {
                // const newHeight = child._rectRelativeToParent.height / totalHeight;
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
    }

    prependChild(child: LayoutBox) {
        this._children.unshift(child);
        this.reorderChildren();
    }

    appendChild(child: LayoutBox) {
        this._children.push(child);
        this.reorderChildren();
    }

    insertChildAt(child: LayoutBox, index: number) {
        this._children.splice(index, 0, child);
        this.reorderChildren();
    }

    removeChild(child: LayoutBox) {
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

    setChildren(children: LayoutBox[]): void {
        this._children = children;
    }

    getChildren(): LayoutBox[] {
        return this._children;
    }

    findBoxContainingPoint(point: Point2D, realSize: Size2D): LayoutBox | null {
        if (!rectContainsPoint(this.getRectWithMargin(realSize), point)) {
            return null;
        }

        let found: LayoutBox | null = null;
        this._children.every((child) => {
            found = child.findBoxContainingPoint(point, realSize);
            if (found) {
                return false;
            }
            return true;
        });

        return found || this;
    }

    findBoxContainingModuleInstance(moduleInstanceId: string): LayoutBox | null {
        if (this._moduleInstanceId === moduleInstanceId) {
            return this;
        }

        let found: LayoutBox | null = null;
        this._children.every((child) => {
            found = child.findBoxContainingModuleInstance(moduleInstanceId);
            if (found) {
                return false;
            }
            return true;
        });

        return found;
    }

    getEdgeRects(realSize: Size2D): LayoutBoxEdge[] {
        const rect = this.getRectWithMargin(realSize);
        const edges: LayoutBoxEdge[] = [];

        if (this._layoutDirection === LayoutDirection.SINGLE && this._parent) {
            if (this._parent._layoutDirection === LayoutDirection.HORIZONTAL) {
                edges.push({
                    rect: { x: rect.x, y: rect.y, width: rect.width, height: 0.25 * rect.height },
                    edge: LayoutBoxEdgeType.TOP,
                });
                edges.push({
                    rect: { x: rect.x, y: rect.y + 0.75 * rect.height, width: rect.width, height: 0.25 * rect.height },
                    edge: LayoutBoxEdgeType.BOTTOM,
                });
            }
            if (this._parent._layoutDirection === LayoutDirection.VERTICAL) {
                edges.push({
                    rect: { x: rect.x, y: rect.y, width: 0.25 * rect.width, height: rect.height },
                    edge: LayoutBoxEdgeType.LEFT,
                });
                edges.push({
                    rect: { x: rect.x + 0.75 * rect.width, y: rect.y, width: 0.25 * rect.width, height: rect.height },
                    edge: LayoutBoxEdgeType.RIGHT,
                });
            }
            if (this._parent._layoutDirection === LayoutDirection.MAIN) {
                edges.push({
                    rect: { x: rect.x, y: rect.y, width: rect.width, height: 0.25 * rect.height },
                    edge: LayoutBoxEdgeType.TOP,
                });
                edges.push({
                    rect: { x: rect.x, y: rect.y + 0.75 * rect.height, width: rect.width, height: 0.25 * rect.height },
                    edge: LayoutBoxEdgeType.BOTTOM,
                });
                edges.push({
                    rect: { x: rect.x, y: rect.y, width: 0.25 * rect.width, height: rect.height },
                    edge: LayoutBoxEdgeType.LEFT,
                });
                edges.push({
                    rect: { x: rect.x + 0.75 * rect.width, y: rect.y, width: 0.25 * rect.width, height: rect.height },
                    edge: LayoutBoxEdgeType.RIGHT,
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
                    edge: LayoutBoxEdgeType.RIGHT,
                },
                {
                    rect: { x: rect.x, y: rect.y, width: edgeWeight, height: rect.height },
                    edge: LayoutBoxEdgeType.LEFT,
                }
            );
        }
        if (this._layoutDirection === LayoutDirection.VERTICAL) {
            edges.push(
                {
                    rect: { x: rect.x, y: rect.y, width: rect.width, height: edgeWeight },
                    edge: LayoutBoxEdgeType.TOP,
                },
                {
                    rect: {
                        x: rect.x,
                        y: rect.y + rect.height - edgeWeight,
                        width: rect.width,
                        height: edgeWeight,
                    },
                    edge: LayoutBoxEdgeType.BOTTOM,
                }
            );
        }

        if (this._layoutDirection === LayoutDirection.HORIZONTAL) {
            for (let i = 1; i < this._children.length; i++) {
                const child = this._children[i];
                const absoluteRect = child.getAbsoluteRect();
                edges.push({
                    rect: {
                        x: absoluteRect.x * realSize.width - edgeWeight / 2,
                        y: absoluteRect.y * realSize.height + layoutBoxMargin * this._level,
                        width: edgeWeight,
                        height: absoluteRect.height * realSize.height - layoutBoxMargin * this._level * 2,
                    },
                    edge: LayoutBoxEdgeType.VERTICAL,
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
                        x: absoluteRect.x * realSize.width + layoutBoxMargin * this._level,
                        y: absoluteRect.y * realSize.height - edgeWeight / 2,
                        width: absoluteRect.width * realSize.width - layoutBoxMargin * this._level * 2,
                        height: edgeWeight,
                    },
                    edge: LayoutBoxEdgeType.HORIZONTAL,
                    position: absoluteRect.y,
                });
            }
        }

        return edges;
    }

    findEdgeContainingPoint(point: Point2D, realSize: Size2D, draggedModuleInstanceId: string): LayoutBoxEdge | null {
        const edgeRects = this.getEdgeRects(realSize);
        const edge = edgeRects.find((edgeRect) => rectContainsPoint(edgeRect.rect, point));
        if (!edge) {
            return null;
        }

        if (
            [LayoutBoxEdgeType.LEFT, LayoutBoxEdgeType.TOP].includes(edge.edge) &&
            this._children.at(0)?.getModuleInstanceId() === draggedModuleInstanceId
        ) {
            return null;
        }
        if (
            [LayoutBoxEdgeType.RIGHT, LayoutBoxEdgeType.BOTTOM].includes(edge.edge) &&
            this._children.at(this._children.length - 1)?.getModuleInstanceId() === draggedModuleInstanceId
        ) {
            return null;
        }

        if (
            edge.edge === LayoutBoxEdgeType.RIGHT &&
            this._parent &&
            this._parent._layoutDirection === LayoutDirection.HORIZONTAL
        ) {
            if (this._parent._children.at(0)?.getModuleInstanceId() === draggedModuleInstanceId) {
                return null;
            }
        }

        if (edge.edge === LayoutBoxEdgeType.VERTICAL) {
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

        if (edge.edge === LayoutBoxEdgeType.HORIZONTAL) {
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

    private clone(parent: LayoutBox | null = null): LayoutBox {
        const clone = new LayoutBox(this._rectRelativeToParent, this._layoutDirection, parent, this._level);
        clone._moduleInstanceId = this._moduleInstanceId;
        clone._moduleName = this._moduleName;
        clone._children = this._children.map((child) => child.clone(clone));
        clone._isWrapper = this._isWrapper;
        return clone;
    }

    previewLayout(
        pointerPoint: Point2D,
        realSize: Size2D,
        draggedModuleInstanceId: string,
        isNewModule: boolean
    ): LayoutBox | null {
        if (this._parent) {
            return null;
        }

        const preview = this.clone();

        if (isNewModule && preview._children.length === 0) {
            const draggedBox = new LayoutBox(
                { x: 0, y: 0, width: 1, height: 1 },
                LayoutDirection.SINGLE,
                preview,
                preview._level + 1
            );
            draggedBox._moduleInstanceId = draggedModuleInstanceId;
            draggedBox._isWrapper = false;
            preview._children.push(draggedBox);
            preview._isWrapper = true;
            return preview;
        }

        const layoutBox = preview.findBoxContainingPoint(pointerPoint, realSize);
        if (!layoutBox) {
            return null;
        }

        const edge = layoutBox.findEdgeContainingPoint(pointerPoint, realSize, draggedModuleInstanceId);
        if (!edge) {
            return null;
        }

        let draggedBox = preview.findBoxContainingModuleInstance(draggedModuleInstanceId);
        if (!draggedBox) {
            if (isNewModule) {
                draggedBox = new LayoutBox(
                    { x: 0, y: 0, width: 1, height: 1 },
                    LayoutDirection.SINGLE,
                    preview,
                    preview._level + 1
                );
                draggedBox._moduleInstanceId = draggedModuleInstanceId;
                draggedBox._isWrapper = false;
                preview.addLayoutElement(draggedBox, layoutBox, edge);
            } else {
                return null;
            }
        } else {
            preview.moveLayoutElement(draggedBox, layoutBox, edge);
        }

        return preview;
    }

    private convertSingleLayoutToWrapper(convertTo: LayoutDirection.HORIZONTAL | LayoutDirection.VERTICAL): void {
        if (this._layoutDirection === convertTo) {
            return;
        }

        const newLayoutBox = new LayoutBox(
            { x: 0, y: 0, width: 1, height: 1 },
            LayoutDirection.SINGLE,
            this,
            this._level + 1
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

    private positionToIndex(position: number, ignoreBoxes: LayoutBox[]): number {
        if (this._layoutDirection === LayoutDirection.HORIZONTAL) {
            const elementsBeforePosition = this._children.filter(
                (child) => !ignoreBoxes.includes(child) && child._rectRelativeToParent.x < position
            );
            return elementsBeforePosition.length;
        }
        if (this._layoutDirection === LayoutDirection.VERTICAL) {
            const elementsBeforePosition = this._children.filter(
                (child) => !ignoreBoxes.includes(child) && child._rectRelativeToParent.y < position
            );
            return elementsBeforePosition.length;
        }

        return position;
    }

    moveLayoutElement(source: LayoutBox, destination: LayoutBox, edge: LayoutBoxEdge): void {
        if (source === destination) {
            return;
        }

        if (edge.edge === LayoutBoxEdgeType.LEFT || edge.edge === LayoutBoxEdgeType.TOP) {
            if (destination._layoutDirection === LayoutDirection.SINGLE) {
                const layoutType =
                    edge.edge === LayoutBoxEdgeType.LEFT ? LayoutDirection.HORIZONTAL : LayoutDirection.VERTICAL;
                destination.convertSingleLayoutToWrapper(layoutType);
            }
            if (source._parent !== destination) {
                destination.prependChild(source);
                source._parent?.removeChild(source);
                source._parent = destination;
            } else {
                destination._children = [source, ...destination._children.filter((child) => child !== source)];
                destination.reorderChildren();
            }
            return;
        }

        if (edge.edge === LayoutBoxEdgeType.RIGHT || edge.edge === LayoutBoxEdgeType.BOTTOM) {
            if (destination._layoutDirection === LayoutDirection.SINGLE) {
                const layoutType =
                    edge.edge === LayoutBoxEdgeType.RIGHT ? LayoutDirection.HORIZONTAL : LayoutDirection.VERTICAL;
                destination.convertSingleLayoutToWrapper(layoutType);
            }
            if (source._parent !== destination) {
                destination.appendChild(source);
                source._parent?.removeChild(source);
                source._parent = destination;
            } else {
                destination._children = [...destination._children.filter((child) => child !== source), source];
                destination.reorderChildren();
            }
            return;
        }

        if (edge.edge === LayoutBoxEdgeType.VERTICAL || edge.edge === LayoutBoxEdgeType.HORIZONTAL) {
            const index = destination.positionToIndex(edge.position, [source]);
            if (source._parent !== destination) {
                destination.insertChildAt(source, index);
                source._parent?.removeChild(source);
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

    addLayoutElement(newBox: LayoutBox, destination: LayoutBox, edge: LayoutBoxEdge): void {
        if (edge.edge === LayoutBoxEdgeType.LEFT || edge.edge === LayoutBoxEdgeType.TOP) {
            if (destination._layoutDirection === LayoutDirection.SINGLE) {
                const layoutType =
                    edge.edge === LayoutBoxEdgeType.LEFT ? LayoutDirection.HORIZONTAL : LayoutDirection.VERTICAL;
                destination.convertSingleLayoutToWrapper(layoutType);
            }
            destination.prependChild(newBox);
            newBox._parent = destination;
            return;
        }

        if (edge.edge === LayoutBoxEdgeType.RIGHT || edge.edge === LayoutBoxEdgeType.BOTTOM) {
            if (destination._layoutDirection === LayoutDirection.SINGLE) {
                const layoutType =
                    edge.edge === LayoutBoxEdgeType.RIGHT ? LayoutDirection.HORIZONTAL : LayoutDirection.VERTICAL;
                destination.convertSingleLayoutToWrapper(layoutType);
            }
            destination.appendChild(newBox);
            newBox._parent = destination;
            return;
        }

        if (edge.edge === LayoutBoxEdgeType.VERTICAL || edge.edge === LayoutBoxEdgeType.HORIZONTAL) {
            const index = destination.positionToIndex(edge.position, []);
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
}

export function makeLayoutBoxes(layoutElements: LayoutElement[]): LayoutBox {
    const mainBox = new LayoutBox({ x: 0, y: 0, width: 1, height: 1 }, LayoutDirection.MAIN, null, 1);
    mainBox.makeChildren(layoutElements);
    return mainBox;
}

function flattenLayoutBoxes(layoutBox: LayoutBox): LayoutBox[] {
    return [layoutBox, ...layoutBox.getChildren().flatMap(flattenLayoutBoxes)];
}

export const LayoutBoxComponents: React.FC<{
    layoutBox: LayoutBox;
    active: string | null;
    realSize: Size2D;
    zIndex: number;
    pointer: Point2D;
}> = (props) => {
    const flatBoxes = flattenLayoutBoxes(props.layoutBox);
    const activeBox = props.layoutBox.findBoxContainingPoint(props.pointer, props.realSize);

    const makeBoxEdges = (box: LayoutBox) => {
        const edges: LayoutBoxEdge[] = box.getEdgeRects(props.realSize);
        let hoveredEdge: Rect2D | null = null;
        if (props.active && props.active !== box.getModuleInstanceId() && activeBox === box) {
            hoveredEdge = box.findEdgeContainingPoint(props.pointer, props.realSize, props.active)?.rect || null;
        }

        return (
            <div key={box.toString()}>
                {edges.map((edge) => (
                    <div
                        key={`${edge.edge}-${edge.rect.x}-${edge.rect.y}-${edge.rect.width}-${edge.rect.height}`}
                        className="absolute rounded bg-slate-400 justify-center items-center opacity-50"
                        style={{
                            left: edge.rect.x,
                            top: edge.rect.y,
                            width: edge.rect.width,
                            height: edge.rect.height,
                            zIndex: props.zIndex + 1,
                            display: hoveredEdge && rectsAreEqual(hoveredEdge, edge.rect) ? "flex" : "none",
                            flexDirection: [
                                LayoutBoxEdgeType.LEFT,
                                LayoutBoxEdgeType.RIGHT,
                                LayoutBoxEdgeType.VERTICAL,
                            ].includes(edge.edge)
                                ? "row"
                                : "column",
                        }}
                    >
                        {edge.edge === LayoutBoxEdgeType.LEFT && (
                            <div className="border-b-4 border-l-4 border-black rotate-45 w-4 h-4" />
                        )}
                        {edge.edge === LayoutBoxEdgeType.TOP && (
                            <div className="border-t-4 border-l-4 border-black rotate-45 w-4 h-4" />
                        )}
                        {edge.edge === LayoutBoxEdgeType.RIGHT && (
                            <div className="border-t-4 border-r-4 border-black rotate-45 w-4 h-4" />
                        )}
                        {edge.edge === LayoutBoxEdgeType.BOTTOM && (
                            <div className="border-r-4 border-b-4 border-black rotate-45 w-4 h-4" />
                        )}
                        {edge.edge === LayoutBoxEdgeType.VERTICAL && (
                            <>
                                <div className="border-b-4 border-l-4 border-black rotate-45 w-4 h-4" />
                                <div className="border-t-4 border-r-4 border-black rotate-45 w-4 h-4" />
                            </>
                        )}
                        {edge.edge === LayoutBoxEdgeType.HORIZONTAL && (
                            <>
                                <div className="border-t-4 border-l-4 border-black rotate-45 w-4 h-4" />
                                <div className="border-r-4 border-b-4 border-black rotate-45 w-4 h-4" />
                            </>
                        )}
                    </div>
                ))}
            </div>
        );
    };
    if (flatBoxes.length === 1) {
        const rect = flatBoxes[0].getRectWithMargin(props.realSize);
        const hovered = rectContainsPoint(rect, props.pointer);
        return (
            <div
                className={resolveClassNames(
                    "absolute pointer-events-none flex justify-center items-center text-white",
                    { "bg-blue-300": hovered, "bg-transparent": !hovered }
                )}
                key={flatBoxes[0].toString()}
                style={{
                    left: rect.x,
                    top: rect.y,
                    width: rect.width,
                    height: rect.height,
                    zIndex: props.zIndex,
                }}
            >
                Drag a module here
            </div>
        );
    }
    return <>{flatBoxes.map((box) => makeBoxEdges(box))}</>;
};
