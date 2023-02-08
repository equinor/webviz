import React from "react";

import { LayoutElement } from "@framework/Workbench";
import {
    Point,
    Rect,
    Size,
    outerRectContainsInnerRect,
    rectContainsPoint,
    rectsAreEqual,
} from "@framework/utils/geometry";

import uniqolor from "uniqolor";

function layoutElementToRect(layoutElement: LayoutElement): Rect {
    return { x: layoutElement.x, y: layoutElement.y, width: layoutElement.width, height: layoutElement.height };
}

const layoutBoxMargin = 8;

export type LayoutBoxEdge =
    | {
          edge: "top" | "bottom" | "left" | "right";
          rect: Rect;
      }
    | {
          position: number;
          edge: "horizontal" | "vertical";
          rect: Rect;
      };

export class LayoutBox {
    private _rectRelativeToParent: Rect;
    private _children: LayoutBox[];
    private _level: number;
    private _moduleInstanceId: string | undefined;
    private _moduleName: string;
    private _innerVerticalEdges: number[];
    private _innerHorizontalEdges: number[];
    private _isWrapper: boolean;
    private _parent: LayoutBox | null;

    constructor(rect: Rect, parent: LayoutBox | null = null, level = 0, children: LayoutBox[] = []) {
        this._rectRelativeToParent = rect;
        this._children = children;
        this._level = level;
        this._innerVerticalEdges = [];
        this._innerHorizontalEdges = [];
        this._isWrapper = true;

        this._moduleInstanceId = "";
        this._moduleName = "";
        this._parent = parent;
    }

    public getRect(): Rect {
        return this._rectRelativeToParent;
    }

    public getRectWithMargin(realSizeFactor: Size): Rect {
        const absoluteRect = this.transformRectToAbsolute(this._rectRelativeToParent);
        return {
            x: absoluteRect.x * realSizeFactor.width + layoutBoxMargin * this._level,
            y: absoluteRect.y * realSizeFactor.height + layoutBoxMargin * this._level,
            width: absoluteRect.width * realSizeFactor.width - layoutBoxMargin * 2 * this._level,
            height: absoluteRect.height * realSizeFactor.height - layoutBoxMargin * 2 * this._level,
        };
    }

    public toString(): string {
        return `LayoutBox(${this._rectRelativeToParent.x}, ${this._rectRelativeToParent.y}, ${this._rectRelativeToParent.width}, ${this._rectRelativeToParent.height})`;
    }

    public transformRectToRelative(rect: Rect): Rect {
        if (this._parent === null) return rect;
        return {
            x: (rect.x - this._parent._rectRelativeToParent.x) / this._rectRelativeToParent.width,
            y: (rect.y - this._parent._rectRelativeToParent.y) / this._rectRelativeToParent.height,
            width: rect.width / this._rectRelativeToParent.width,
            height: rect.height / this._rectRelativeToParent.height,
        };
    }

    public transformRectToAbsolute(rect: Rect): Rect {
        if (this._parent === null) return rect;
        return {
            x: rect.x * this._parent._rectRelativeToParent.width + this._parent._rectRelativeToParent.x,
            y: rect.y * this._parent._rectRelativeToParent.height + this._parent._rectRelativeToParent.y,
            width: rect.width * this._parent._rectRelativeToParent.width,
            height: rect.height * this._parent._rectRelativeToParent.height,
        };
    }

    makeChildren(containedElements: LayoutElement[]) {
        if (containedElements.length <= 1) {
            this._isWrapper = false;
            if (containedElements.length === 1) {
                this._moduleInstanceId = containedElements[0].moduleInstanceId;
                this._moduleName = containedElements[0].moduleName;
            }
            return;
        }
        const layoutBoxes: LayoutBox[] = [];

        const rasterY: number[] = [];
        const rasterX: number[] = [];

        // First rasterize vertically
        let y = this._rectRelativeToParent.y;
        while (y < this._rectRelativeToParent.y + this._rectRelativeToParent.height) {
            const elementsAtY = containedElements.filter((layoutElement) => layoutElement.y === y);
            const maxHeight = Math.max(...elementsAtY.map((layoutElement) => layoutElement.height));
            y += maxHeight;
            rasterY.push(y);
        }

        // Then rasterize horizontally
        let x = this._rectRelativeToParent.x;
        while (x < this._rectRelativeToParent.x + this._rectRelativeToParent.width) {
            const elementsAtX = containedElements.filter((layoutElement) => layoutElement.x === x);
            const maxWidth = Math.max(...elementsAtX.map((layoutElement) => layoutElement.width));
            x += maxWidth;
            rasterX.push(x);
        }

        let lastY = this._rectRelativeToParent.y;
        rasterY.forEach((y) => {
            let lastX = this._rectRelativeToParent.x;
            rasterX.forEach((x) => {
                const rect: Rect = { x: lastX, y: lastY, width: x - lastX, height: y - lastY };
                const elementsInRect = containedElements.filter((layoutElement) =>
                    outerRectContainsInnerRect(rect, layoutElementToRect(layoutElement))
                );
                const childBox = new LayoutBox(this.transformRectToRelative(rect), this, this._level + 1);
                childBox.makeChildren(elementsInRect);
                layoutBoxes.push(childBox);
                if (x !== this._rectRelativeToParent.x + this._rectRelativeToParent.width) {
                    this._innerVerticalEdges.push(x);
                }
                lastX = x;
            });
            if (y !== this._rectRelativeToParent.y + this._rectRelativeToParent.height) {
                this._innerHorizontalEdges.push(y);
            }
            lastY = y;
        });

        this._children = layoutBoxes;
    }

    static sortChildrenByX(a: LayoutBox, b: LayoutBox): number {
        return a._rectRelativeToParent.x - b._rectRelativeToParent.x;
    }

    static sortChildrenByY(a: LayoutBox, b: LayoutBox): number {
        return a._rectRelativeToParent.y - b._rectRelativeToParent.y;
    }

    public removeChild(child: LayoutBox) {
        this._children = this._children.filter((c) => c !== child);
        if (child._rectRelativeToParent.width !== 1) {
            const newWidth = 1 - child._rectRelativeToParent.width;
            let currentX = 0;
            this._children.sort(LayoutBox.sortChildrenByX).forEach((c) => {
                const width = c._rectRelativeToParent.width / newWidth;
                c._rectRelativeToParent = {
                    ...c._rectRelativeToParent,
                    x: currentX,
                    width,
                };
                currentX += width;
            });
        } else if (child._rectRelativeToParent.height !== 1) {
            const newHeight = 1 - child._rectRelativeToParent.height;
            let currentY = 0;
            this._children.sort(LayoutBox.sortChildrenByY).forEach((c) => {
                const height = c._rectRelativeToParent.height / newHeight;
                c._rectRelativeToParent = {
                    ...c._rectRelativeToParent,
                    y: currentY,
                    height,
                };
                currentY += height;
            });
        }
    }

    public insertChild(child: LayoutBox) {
        this._children.push(child);
        if (child._rectRelativeToParent.width !== 1) {
            const newWidth = 1 + child._rectRelativeToParent.width;
            let currentX = 0;
            this._children.sort(LayoutBox.sortChildrenByX).forEach((c) => {
                const width = c._rectRelativeToParent.width / newWidth;
                c._rectRelativeToParent = {
                    ...c._rectRelativeToParent,
                    x: currentX,
                    width,
                };
                currentX += width;
            });
        } else if (child._rectRelativeToParent.height !== 1) {
            const newHeight = 1 + child._rectRelativeToParent.height;
            let currentY = 0;
            this._children.sort(LayoutBox.sortChildrenByY).forEach((c) => {
                const height = c._rectRelativeToParent.height / newHeight;
                c._rectRelativeToParent = {
                    ...c._rectRelativeToParent,
                    y: currentY,
                    height,
                };
                currentY += height;
            });
        }
    }

    public setChildren(children: LayoutBox[]): void {
        this._children = children;
    }

    public getChildren(): LayoutBox[] {
        return this._children;
    }

    public findBoxContainingPoint(point: Point, realSize: Size): LayoutBox | null {
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

    public findBoxContainingModuleInstance(moduleInstanceId: string): LayoutBox | null {
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

    public getEdgeRects(realSize: Size): LayoutBoxEdge[] {
        const rect = this.getRectWithMargin(realSize);
        const edgeWeight = 50;
        const edges: LayoutBoxEdge[] = [
            { rect: { x: rect.x, y: rect.y, width: rect.width, height: edgeWeight }, edge: "top" },
            {
                rect: { x: rect.x + rect.width - edgeWeight, y: rect.y, width: edgeWeight, height: rect.height },
                edge: "bottom",
            },
            {
                rect: { x: rect.x, y: rect.y + rect.height - edgeWeight, width: rect.width, height: edgeWeight },
                edge: "right",
            },
            { rect: { x: rect.x, y: rect.y, width: edgeWeight, height: rect.height }, edge: "left" },
        ];

        this._innerVerticalEdges.forEach((x) => {
            edges.push({
                rect: {
                    x: x * realSize.width - 2 * layoutBoxMargin,
                    y: rect.y,
                    width: layoutBoxMargin * 4,
                    height: rect.height,
                },
                edge: "vertical",
                position: x,
            });
        });

        this._innerHorizontalEdges.forEach((y) => {
            edges.push({
                rect: {
                    x: rect.x,
                    y: y * realSize.height - 2 * layoutBoxMargin,
                    width: rect.width,
                    height: layoutBoxMargin * 4,
                },
                edge: "horizontal",
                position: y,
            });
        });

        return edges;
    }

    public findEdgeContainingPoint(point: Point, realSize: Size): LayoutBoxEdge | null {
        const edgeRects = this.getEdgeRects(realSize);
        const edge = edgeRects.find((edgeRect) => rectContainsPoint(edgeRect.rect, point));
        return edge || null;
    }

    public moveLayoutElement(source: LayoutBox, destination: LayoutBox, edge: LayoutBoxEdge): void {
        if (source === destination) {
            return;
        }

        if (edge.edge === "vertical") {
            source._rectRelativeToParent = {
                ...source._rectRelativeToParent,
                x: edge.position,
            };
        } else if (edge.edge === "horizontal") {
            source._rectRelativeToParent = {
                ...source._rectRelativeToParent,
                y: edge.position,
            };
        } else if (edge.edge === "top") {
            destination.insertChild(source);
            source._parent?.removeChild(source);
            source._parent = destination;
            return;
        }
    }

    public toLayout(): LayoutElement[] {
        const layout: LayoutElement[] = [];

        if (this._isWrapper) {
            this._children.forEach((child) => {
                layout.push(...child.toLayout());
            });
        } else {
            layout.push({
                x: this._rectRelativeToParent.x,
                y: this._rectRelativeToParent.y,
                width: this._rectRelativeToParent.width,
                height: this._rectRelativeToParent.height,
                moduleInstanceId: this._moduleInstanceId || undefined,
                moduleName: this._moduleName,
            });
        }

        return layout;
    }
}

export function makeLayoutBoxes(layoutElements: LayoutElement[]): LayoutBox {
    const mainBox = new LayoutBox({ x: 0, y: 0, width: 1, height: 1 });
    mainBox.makeChildren(layoutElements);
    return mainBox;
}

function flattenLayoutBoxes(layoutBox: LayoutBox): LayoutBox[] {
    return [layoutBox, ...layoutBox.getChildren().flatMap(flattenLayoutBoxes)];
}

export const LayoutBoxComponents: React.FC<{
    layoutBox: LayoutBox;
    active: string | null;
    realSize: Size;
    zIndex: number;
    pointer: Point | null;
}> = (props) => {
    const flatBoxes = flattenLayoutBoxes(props.layoutBox);

    const makeBox = (box: LayoutBox) => {
        const rect = box.getRectWithMargin(props.realSize);
        const color = uniqolor(box.toString());
        const edges = box.getEdgeRects(props.realSize);
        let hoveredEdge: Rect | null = null;
        if (props.active === box.toString() && props.pointer) {
            hoveredEdge = box.findEdgeContainingPoint(props.pointer, props.realSize)?.rect || null;
        }
        return (
            <div
                key={box.toString()}
                style={{
                    backgroundColor: props.active === box.toString() ? "red" : "transparent",
                    pointerEvents: "none",
                    outline: `2px solid ${color.color}`,
                    position: "absolute",
                    left: rect.x,
                    top: rect.y,
                    width: rect.width,
                    height: rect.height,
                    zIndex: props.zIndex,
                }}
            >
                {edges.map((edge, index) => (
                    <div
                        style={{
                            position: "absolute",
                            left: edge.rect.x - rect.x,
                            top: edge.rect.y - rect.y,
                            width: edge.rect.width,
                            height: edge.rect.height,
                            zIndex: props.zIndex + 1,
                            backgroundColor:
                                hoveredEdge && rectsAreEqual(hoveredEdge, edge.rect) ? "darkred" : "transparent",
                        }}
                    />
                ))}
            </div>
        );
    };

    return <>{flatBoxes.map((box) => makeBox(box))}</>;
};
