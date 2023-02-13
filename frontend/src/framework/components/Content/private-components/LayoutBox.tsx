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
          rect: Rect;
      }
    | {
          position: number;
          edge: LayoutBoxEdgeType.HORIZONTAL | LayoutBoxEdgeType.VERTICAL;
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
    private _layoutDirection: LayoutDirection;

    constructor(
        rect: Rect,
        direction: LayoutDirection,
        parent: LayoutBox | null = null,
        level = 0,
        children: LayoutBox[] = []
    ) {
        this._rectRelativeToParent = rect;
        this._children = children;
        this._level = level;
        this._innerVerticalEdges = [];
        this._innerHorizontalEdges = [];
        this._isWrapper = true;

        this._moduleInstanceId = "";
        this._moduleName = "";
        this._parent = parent;
        this._layoutDirection = direction;
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

    public log(): string {
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

    public transformRectToRelative(rect: Rect): Rect {
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

    private getAbsoluteRect(): Rect {
        if (this._parent === null) {
            return this._rectRelativeToParent;
        }
        return this._parent.transformRectToAbsolute(this._rectRelativeToParent);
    }

    public transformRectToAbsolute(rect: Rect): Rect {
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
        if (containedElements.length <= 1) {
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
            const elementsAtY = containedElements.filter((layoutElement) => layoutElement.y === y);
            if (elementsAtY.length === 0) {
                break;
            }
            const maxHeight = Math.max(...elementsAtY.map((layoutElement) => layoutElement.height));
            y += maxHeight;
            rasterY.push(y);
        }

        if (rasterY.length > 1) {
            let lastY = absoluteRect.y;
            rasterY.forEach((y) => {
                const rect: Rect = {
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

                if (y !== absoluteRect.y + absoluteRect.height) {
                    this._innerHorizontalEdges.push(y);
                }
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
            const elementsAtX = containedElements.filter((layoutElement) => layoutElement.x === x);
            if (elementsAtX.length === 0) {
                break;
            }
            const maxWidth = Math.max(...elementsAtX.map((layoutElement) => layoutElement.width));
            x += maxWidth;
            rasterX.push(x);
        }

        if (rasterX.length > 1) {
            let lastX = absoluteRect.x;
            rasterX.forEach((x) => {
                const rect: Rect = {
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
                if (x !== absoluteRect.x + absoluteRect.width) {
                    this._innerVerticalEdges.push(x);
                }
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

    private getTotalWidth(): number {
        // Usually returns 1, unless the layout box is not adjusted yet
        return this._children.reduce((acc, child) => acc + child._rectRelativeToParent.width, 0);
    }

    private getTotalHeight(): number {
        // Usually returns 1, unless the layout box is not adjusted yet
        return this._children.reduce((acc, child) => acc + child._rectRelativeToParent.height, 0);
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

    public prependChild(child: LayoutBox) {
        this._children.unshift(child);
        this.reorderChildren();
    }

    public appendChild(child: LayoutBox) {
        this._children.push(child);
        this.reorderChildren();
    }

    public insertChildAt(child: LayoutBox, index: number) {
        this._children.splice(index, 0, child);
        this.reorderChildren();
    }

    public removeChild(child: LayoutBox) {
        this._children = this._children.filter((c) => c !== child);
        if (this._children.length > 0) {
            this.reorderChildren();
        } else if (this._parent) {
            this._parent.removeChild(this);
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
        const edges: LayoutBoxEdge[] = [];

        if (this._layoutDirection === LayoutDirection.SINGLE && this._parent) {
            if (this._parent._layoutDirection === LayoutDirection.HORIZONTAL) {
                edges.push({
                    rect: { x: rect.x, y: rect.y, width: rect.width, height: edgeWeight },
                    edge: LayoutBoxEdgeType.TOP,
                });
                edges.push({
                    rect: { x: rect.x, y: rect.y + rect.height - edgeWeight, width: rect.width, height: edgeWeight },
                    edge: LayoutBoxEdgeType.BOTTOM,
                });
            }
            if (this._parent._layoutDirection === LayoutDirection.VERTICAL) {
                edges.push({
                    rect: { x: rect.x, y: rect.y, width: edgeWeight, height: rect.height },
                    edge: LayoutBoxEdgeType.LEFT,
                });
                edges.push({
                    rect: { x: rect.x + rect.width - edgeWeight, y: rect.y, width: edgeWeight, height: rect.height },
                    edge: LayoutBoxEdgeType.RIGHT,
                });
            }
        }
        if (this._layoutDirection === LayoutDirection.HORIZONTAL) {
            edges.push(
                {
                    rect: { x: rect.x, y: rect.y + rect.height - edgeWeight, width: rect.width, height: edgeWeight },
                    edge: LayoutBoxEdgeType.RIGHT,
                },
                { rect: { x: rect.x, y: rect.y, width: edgeWeight, height: rect.height }, edge: LayoutBoxEdgeType.LEFT }
            );
        }
        if (this._layoutDirection === LayoutDirection.VERTICAL) {
            edges.push(
                { rect: { x: rect.x, y: rect.y, width: rect.width, height: edgeWeight }, edge: LayoutBoxEdgeType.TOP },
                {
                    rect: { x: rect.x + rect.width - edgeWeight, y: rect.y, width: edgeWeight, height: rect.height },
                    edge: LayoutBoxEdgeType.BOTTOM,
                }
            );
        }
        if (this._layoutDirection === LayoutDirection.MAIN) {
            edges.push(
                {
                    rect: { x: rect.x, y: rect.y + rect.height - edgeWeight, width: rect.width, height: edgeWeight },
                    edge: LayoutBoxEdgeType.RIGHT,
                },
                {
                    rect: { x: rect.x, y: rect.y, width: edgeWeight, height: rect.height },
                    edge: LayoutBoxEdgeType.LEFT,
                },
                { rect: { x: rect.x, y: rect.y, width: rect.width, height: edgeWeight }, edge: LayoutBoxEdgeType.TOP },
                {
                    rect: { x: rect.x + rect.width - edgeWeight, y: rect.y, width: edgeWeight, height: rect.height },
                    edge: LayoutBoxEdgeType.BOTTOM,
                }
            );
        }

        this._innerVerticalEdges.forEach((x) => {
            edges.push({
                rect: {
                    x: x * realSize.width - 2 * layoutBoxMargin,
                    y: rect.y,
                    width: layoutBoxMargin * 4,
                    height: rect.height,
                },
                edge: LayoutBoxEdgeType.VERTICAL,
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
                edge: LayoutBoxEdgeType.HORIZONTAL,
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

    private clone(parent: LayoutBox | null = null): LayoutBox {
        const clone = new LayoutBox(this._rectRelativeToParent, this._layoutDirection, parent, this._level);
        clone._moduleInstanceId = this._moduleInstanceId;
        clone._moduleName = this._moduleName;
        clone._children = this._children.map((child) => child.clone(clone));
        clone._isWrapper = this._isWrapper;
        return clone;
    }

    public previewLayout(pointerPoint: Point, realSize: Size, draggedModuleInstanceId: string): LayoutBox | null {
        if (this._parent) {
            return null;
        }

        const preview = this.clone();

        const layoutBox = preview.findBoxContainingPoint(pointerPoint, realSize);
        if (!layoutBox) {
            return null;
        }

        const edge = layoutBox.findEdgeContainingPoint(pointerPoint, realSize);
        if (!edge) {
            return null;
        }

        const draggedBox = preview.findBoxContainingModuleInstance(draggedModuleInstanceId);
        if (!draggedBox) {
            return null;
        }

        preview.moveLayoutElement(draggedBox, layoutBox, edge);
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

    public moveLayoutElement(source: LayoutBox, destination: LayoutBox, edge: LayoutBoxEdge): void {
        if (source === destination) {
            return;
        }

        console.log(edge.edge);

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
            }
            return;
        }

        /*
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
        */
    }

    public toLayout(): LayoutElement[] {
        const layout: LayoutElement[] = [];

        if (this._isWrapper) {
            this._children.forEach((child) => {
                layout.push(...child.toLayout());
            });
        } else {
            const absoluteRect = this.getAbsoluteRect();
            layout.push({
                x: absoluteRect.x,
                y: absoluteRect.y,
                width: absoluteRect.width,
                height: absoluteRect.height,
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
    console.log(mainBox.log());
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
                    backgroundColor: "transparent",
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
