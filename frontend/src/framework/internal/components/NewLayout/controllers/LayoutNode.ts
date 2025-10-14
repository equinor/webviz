import type { LayoutElement } from "@framework/internal/Dashboard";
import {
    outerRectContainsInnerRect,
    rectContainsPoint,
    scaleRectIndividually,
    type Rect2D,
    type Size2D,
} from "@lib/utils/geometry";
import type { Vec2 } from "@lib/utils/vec2";

export enum EdgeType {
    LEFT = "left",
    RIGHT = "right",
    TOP = "top",
    BOTTOM = "bottom",
    VERTICAL_IN_BETWEEN = "vertical-in-between",
    HORIZONTAL_IN_BETWEEN = "horizontal-in-between",
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
          points: Triangle;
      }
    | {
          type: EdgeShapeType.QUADRILATERAL;
          points: Quadrilateral;
      };

export type Edge =
    | {
          edge: Exclude<EdgeType, EdgeType.HORIZONTAL_IN_BETWEEN | EdgeType.VERTICAL_IN_BETWEEN>;
          shape: EdgeShape;
      }
    | {
          position: number;
          edge: EdgeType.HORIZONTAL_IN_BETWEEN | EdgeType.VERTICAL_IN_BETWEEN;
          shape: EdgeShape;
      };

export enum ContainerType {
    HORIZONTAL_BRANCH = "horizontal-branch",
    VERTICAL_BRANCH = "vertical-branch",
    LEAF = "leaf",
    ROOT = "root",
}

type LayoutNodeOptions = {
    occupiedRelativeRect: Rect2D;
    type: ContainerType;
    parent?: LayoutNode | null;
    children?: LayoutNode[];
    level?: number;
};

type LeafMetadata = {
    moduleInstanceId: string | undefined;
    moduleName: string;
};

export class LayoutNode {
    private _occupiedRelativeRect: Rect2D;
    private _type: ContainerType;
    private _parent: LayoutNode | null;
    private _children: LayoutNode[];
    private _level: number = 0;
    private _isNew: boolean = false;
    private _metadata: LeafMetadata | null = null;

    constructor(options: LayoutNodeOptions) {
        this._occupiedRelativeRect = options.occupiedRelativeRect;
        this._type = options.type;
        this._parent = options.parent ?? null;
        this._children = options.children ?? [];
        this._level = options.level ?? 0;
    }

    getOccupiedRelativeRect() {
        return this._occupiedRelativeRect;
    }

    setOccupiedRelativeRect(rect: Rect2D) {
        this._occupiedRelativeRect = rect;
    }

    getType() {
        return this._type;
    }

    getParent() {
        return this._parent;
    }

    getChildren() {
        return this._children;
    }

    getLevel() {
        return this._level;
    }

    setLevel(level: number) {
        this._level = level;
    }

    isNew() {
        return this._isNew;
    }

    setIsNew(isNew: boolean) {
        this._isNew = isNew;
    }

    getMetadata() {
        return this._metadata;
    }

    toString(): string {
        const parts: string[] = [];

        /* eslint-disable-next-line @typescript-eslint/no-this-alias */
        let current: LayoutNode | null = this;

        while (current) {
            const r = current.getOccupiedRelativeRect();
            parts.push(`LayoutNode(${r.x}, ${r.y}, ${r.width}, ${r.height})`);
            current = current._parent;
        }
        return parts.join(" > ");
    }

    makeChildrenFromLayoutElements(elements: LayoutElement[]) {
        // If there are no elements, do nothing
        if (elements.length === 0) {
            return;
        }

        // If there is only one element, make a leaf node
        if (elements.length === 1) {
            const singleElement = elements[0];

            // If this is the root, we have to make at least one leaf
            if (this._type === ContainerType.ROOT) {
                const leaf = new LayoutNode({
                    occupiedRelativeRect: layoutElementToRect(singleElement),
                    type: ContainerType.LEAF,
                    parent: this,
                    level: this._level + 1,
                });
                leaf.makeChildrenFromLayoutElements([singleElement]);
                this._children.push(leaf);
                return;
            }
            // If this is a leaf, we set its metadata
            this._metadata = {
                moduleInstanceId: singleElement.moduleInstanceId,
                moduleName: singleElement.moduleName,
            };
            return;
        }

        // We have more than one element, we need to split
        // We determine the split direction based on the number of cuts
        // in each direction (we want to split in the direction with the most cuts)
        const rect = this.getOccupiedRelativeRect();

        const verticalCuts = findVerticalCuts(elements, rect);
        const horizontalCuts = findHorizontalCuts(elements, rect);

        const chooseVerticalDirection = verticalCuts.length > horizontalCuts.length;
        const chooseHorizontalDirection = horizontalCuts.length > verticalCuts.length;
        const tie = verticalCuts.length === horizontalCuts.length;

        if (chooseVerticalDirection || (tie && verticalCuts.length > 0)) {
            const segments = buildVerticalSegments(elements, rect, verticalCuts);
            if (segments.length <= 1) {
                // We have more than one element, but we couldn't split them
                // This should never happen and indicates a bug in the cut finding logic or in the layout
                // throw new Error("Could not split layout elements vertically");
                return;
            }
            const children: LayoutNode[] = [];
            for (const segment of segments) {
                const childNode = new LayoutNode({
                    occupiedRelativeRect: segment.rect,
                    type: ContainerType.VERTICAL_BRANCH,
                    parent: this,
                    level: this._level + 1,
                });
                childNode.makeChildrenFromLayoutElements(segment.elements);
                children.push(childNode);
            }
            this._children = children;
        }
        if (chooseHorizontalDirection || (tie && horizontalCuts.length > 0)) {
            const segments = buildHorizontalSegments(elements, rect, horizontalCuts);
            if (segments.length <= 1) {
                // We have more than one element, but we couldn't split them
                // This should never happen and indicates a bug in the cut finding logic or in the layout
                // throw new Error("Could not split layout elements horizontally");
                return;
            }
            const children: LayoutNode[] = [];
            for (const segment of segments) {
                const childNode = new LayoutNode({
                    occupiedRelativeRect: segment.rect,
                    type: ContainerType.HORIZONTAL_BRANCH,
                    parent: this,
                    level: this._level + 1,
                });
                childNode.makeChildrenFromLayoutElements(segment.elements);
                children.push(childNode);
            }
            this._children = children;
        }
    }

    private relayoutChildren() {
        if (this._type === ContainerType.LEAF) {
            return;
        }

        if (this._children.length === 0) {
            return;
        }

        const isHorizontalBranch = this._type === ContainerType.HORIZONTAL_BRANCH;

        const existingChildren: LayoutNode[] = [];
        const newChildren: LayoutNode[] = [];

        let currentSizeOfExistingChildren = 0;
        for (const child of this._children) {
            if (child.isNew()) {
                newChildren.push(child);
            } else {
                existingChildren.push(child);
                currentSizeOfExistingChildren += isHorizontalBranch
                    ? child.getOccupiedRelativeRect().width
                    : child.getOccupiedRelativeRect().height;
            }
        }

        const numExistingChildren = existingChildren.length;
        const numNewChildren = newChildren.length;
        const numTotalChildren = numExistingChildren + numNewChildren;

        const totalSize = isHorizontalBranch ? this._occupiedRelativeRect.width : this._occupiedRelativeRect.height;
        const relativeTotalSizeOfExistingChildren = currentSizeOfExistingChildren / totalSize;

        const evenSizeSharePerChild = 1.0 / numTotalChildren;

        const spaceAvailableForExistingChildren = numExistingChildren * evenSizeSharePerChild;

        const scaleExistingChildren =
            numExistingChildren > 0 && relativeTotalSizeOfExistingChildren > 0
                ? spaceAvailableForExistingChildren / relativeTotalSizeOfExistingChildren
                : 0;

        if (isHorizontalBranch) {
            let currentX = 0;
            for (const [index, child] of this._children.entries()) {
                let newWidth = child.getOccupiedRelativeRect().width * scaleExistingChildren;
                if (child.isNew()) {
                    newWidth = evenSizeSharePerChild * totalSize;
                    child.setIsNew(false);
                }
                if (index === this._children.length - 1) {
                    // Last child, assign all remaining space to avoid rounding errors
                    newWidth = this._occupiedRelativeRect.width - currentX;
                }

                child.setOccupiedRelativeRect({
                    x: this._occupiedRelativeRect.x + currentX,
                    y: this._occupiedRelativeRect.y,
                    width: newWidth,
                    height: this._occupiedRelativeRect.height,
                });

                currentX += newWidth;
            }
        } else {
            let currentY = 0;
            for (const [index, child] of this._children.entries()) {
                let newHeight = child.getOccupiedRelativeRect().height * scaleExistingChildren;
                if (child.isNew()) {
                    newHeight = evenSizeSharePerChild * totalSize;
                    child.setIsNew(false);
                }
                if (index === this._children.length - 1) {
                    // Last child, assign all remaining space to avoid rounding errors
                    newHeight = this._occupiedRelativeRect.height - currentY;
                }

                child.setOccupiedRelativeRect({
                    x: this._occupiedRelativeRect.x,
                    y: this._occupiedRelativeRect.y + currentY,
                    width: this._occupiedRelativeRect.width,
                    height: newHeight,
                });

                currentY += newHeight;
            }
        }
    }

    removeModuleInstanceNode(moduleInstanceId: string) {
        if (this._type === ContainerType.LEAF) {
            if (this._metadata?.moduleInstanceId === moduleInstanceId) {
                if (this._parent) {
                    this._parent.removeChild(this);
                }
            }
            return;
        }

        for (const child of this._children) {
            child.removeModuleInstanceNode(moduleInstanceId);
        }
    }

    removeChild(child: LayoutNode) {
        this._children = this._children.filter((c) => c !== child);
        child._parent = null;

        // If this was the last child, we need to tell the parent to remove this node as well
        if (this._children.length === 0 && this._parent) {
            this._parent.removeChild(this);
            return;
        }

        // If there is only one child left, we need to promote that child to take this node's place
        if (this._children.length === 1 && this._parent) {
            const onlyChild = this._children[0];
            onlyChild._parent = this._parent;
            onlyChild.setLevel(this._level);
            this._parent._children = this._parent._children.map((c) => (c === this ? onlyChild : c));
            return;
        }

        // Otherwise, we just need to relayout the remaining children
        this.relayoutChildren();
    }

    findNodeContainingPoint(point: Vec2): LayoutNode | undefined {
        const rect = this.getOccupiedRelativeRect();
        if (!rectContainsPoint(rect, point)) {
            return undefined;
        }

        if (this._type === ContainerType.LEAF) {
            return this;
        }

        for (const child of this._children) {
            const found = child.findNodeContainingPoint(point);
            if (found) {
                return found;
            }
        }

        return undefined;
    }

    private calcAbsoluteRect(absoluteSize: Size2D): Rect2D {
        const relativeRect = this.getOccupiedRelativeRect();
        return scaleRectIndividually(relativeRect, absoluteSize.width, absoluteSize.height);
    }

    private calcAbsoluteRectWithLevelMargins(absoluteSize: Size2D, marginPerLevel: number): Rect2D {
        const relativeRect = this.getOccupiedRelativeRect();
        const insetLevel = this.getInsetLevel();

        const absoluteRect = scaleRectIndividually(relativeRect, absoluteSize.width, absoluteSize.height);

        const marginX = insetLevel * marginPerLevel;
        const marginY = insetLevel * marginPerLevel;

        return {
            x: absoluteRect.x + marginX,
            y: absoluteRect.y + marginY,
            width: Math.max(0, absoluteRect.width - 2 * marginX),
            height: Math.max(0, absoluteRect.height - 2 * marginY),
        };
    }

    private getInsetLevel(): number {
        let lvl = 0;
        const directions: Set<ContainerType> = new Set([this.getType()]);
        let parent = this.getParent();
        let type = this.getType();

        while (parent) {
            directions.add(parent.getType());
            if (
                directions.size === 2 ||
                parent.getType() === type ||
                ![ContainerType.HORIZONTAL_BRANCH, ContainerType.VERTICAL_BRANCH].includes(parent.getType()) ||
                ![ContainerType.HORIZONTAL_BRANCH, ContainerType.VERTICAL_BRANCH].includes(type)
            ) {
                lvl++;
                directions.clear();
            }

            type = parent.getType();
            parent = parent.getParent();
        }
        return lvl;
    }

    makeEdges(absoluteSize: Size2D, edgeWeightPx: number = 10): Edge[] {
        const edges: Edge[] = [];
        const rect = this.calcAbsoluteRectWithLevelMargins(absoluteSize, edgeWeightPx);

        const topLeft: Vec2 = { x: rect.x, y: rect.y };
        const topRight: Vec2 = { x: rect.x + rect.width, y: rect.y };
        const bottomLeft: Vec2 = { x: rect.x, y: rect.y + rect.height };
        const bottomRight: Vec2 = { x: rect.x + rect.width, y: rect.y + rect.height };
        const center: Vec2 = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };

        if (this.getType() === ContainerType.LEAF) {
            edges.push(
                {
                    edge: EdgeType.LEFT,
                    shape: {
                        type: EdgeShapeType.TRIANGLE,
                        points: {
                            p1: topLeft,
                            p2: bottomLeft,
                            p3: center,
                        },
                    },
                },
                {
                    edge: EdgeType.RIGHT,
                    shape: {
                        type: EdgeShapeType.TRIANGLE,
                        points: {
                            p1: topRight,
                            p2: bottomRight,
                            p3: center,
                        },
                    },
                },
                {
                    edge: EdgeType.TOP,
                    shape: {
                        type: EdgeShapeType.TRIANGLE,
                        points: {
                            p1: topLeft,
                            p2: topRight,
                            p3: center,
                        },
                    },
                },
                {
                    edge: EdgeType.BOTTOM,
                    shape: {
                        type: EdgeShapeType.TRIANGLE,
                        points: {
                            p1: bottomLeft,
                            p2: bottomRight,
                            p3: center,
                        },
                    },
                },
            );

            return edges;
        } else {
            edges.push(
                {
                    edge: EdgeType.LEFT,
                    shape: {
                        type: EdgeShapeType.QUADRILATERAL,
                        points: {
                            p1: topLeft,
                            p2: bottomLeft,
                            p3: { x: bottomLeft.x + edgeWeightPx, y: bottomLeft.y - edgeWeightPx },
                            p4: { x: topLeft.x + edgeWeightPx, y: topLeft.y + edgeWeightPx },
                        },
                    },
                },
                {
                    edge: EdgeType.RIGHT,
                    shape: {
                        type: EdgeShapeType.QUADRILATERAL,
                        points: {
                            p1: topRight,
                            p2: bottomRight,
                            p3: { x: bottomRight.x - edgeWeightPx, y: bottomRight.y - edgeWeightPx },
                            p4: { x: topRight.x - edgeWeightPx, y: topRight.y + edgeWeightPx },
                        },
                    },
                },
                {
                    edge: EdgeType.TOP,
                    shape: {
                        type: EdgeShapeType.QUADRILATERAL,
                        points: {
                            p1: topLeft,
                            p2: topRight,
                            p3: { x: topRight.x - edgeWeightPx, y: topRight.y + edgeWeightPx },
                            p4: { x: topLeft.x + edgeWeightPx, y: topLeft.y + edgeWeightPx },
                        },
                    },
                },
                {
                    edge: EdgeType.BOTTOM,
                    shape: {
                        type: EdgeShapeType.QUADRILATERAL,
                        points: {
                            p1: bottomLeft,
                            p2: bottomRight,
                            p3: { x: bottomRight.x - edgeWeightPx, y: bottomRight.y - edgeWeightPx },
                            p4: { x: bottomLeft.x + edgeWeightPx, y: bottomLeft.y - edgeWeightPx },
                        },
                    },
                },
            );
        }

        if (this._children.length <= 1) {
            return edges;
        }

        if (this.getType() === ContainerType.VERTICAL_BRANCH) {
            for (let i = 1; i < this._children.length; i++) {
                const child = this._children[i];
                const childRect = child.calcAbsoluteRect(absoluteSize);
                const position = childRect.x;
                edges.push({
                    shape: {
                        type: EdgeShapeType.QUADRILATERAL,
                        points: {
                            p1: { x: position - edgeWeightPx / 2, y: rect.y },
                            p2: { x: position + edgeWeightPx / 2, y: rect.y },
                            p3: { x: position + edgeWeightPx / 2, y: rect.y + rect.height },
                            p4: { x: position - edgeWeightPx / 2, y: rect.y + rect.height },
                        },
                    },
                    position,
                    edge: EdgeType.VERTICAL_IN_BETWEEN,
                });
            }
        } else if (this.getType() === ContainerType.HORIZONTAL_BRANCH) {
            for (let i = 1; i < this._children.length; i++) {
                const child = this._children[i];
                const childRect = child.calcAbsoluteRect(absoluteSize);
                const position = childRect.y;
                edges.push({
                    shape: {
                        type: EdgeShapeType.QUADRILATERAL,
                        points: {
                            p1: { x: rect.x, y: position - edgeWeightPx / 2 },
                            p2: { x: rect.x + rect.width, y: position - edgeWeightPx / 2 },
                            p3: { x: rect.x + rect.width, y: position + edgeWeightPx / 2 },
                            p4: { x: rect.x, y: position + edgeWeightPx / 2 },
                        },
                    },
                    position,
                    edge: EdgeType.HORIZONTAL_IN_BETWEEN,
                });
            }
        }

        return edges;
    }
}

export function makeLayoutTreeFromLayout(layout: LayoutElement[]): LayoutNode {
    const root = new LayoutNode({
        occupiedRelativeRect: { x: 0, y: 0, width: 1, height: 1 },
        type: ContainerType.ROOT,
    });
    root.makeChildrenFromLayoutElements(layout);

    return root;
}

function getLayoutElementsInRect(layout: LayoutElement[], rect: Rect2D): LayoutElement[] {
    return layout.filter((el) => outerRectContainsInnerRect(rect, layoutElementToRect(el), EPSILON));
}

function layoutElementToRect(layoutElement: LayoutElement): Rect2D {
    return {
        x: layoutElement.relX,
        y: layoutElement.relY,
        width: layoutElement.relWidth,
        height: layoutElement.relHeight,
    };
}

const EPSILON = 1e-6;

function findVerticalCuts(elements: LayoutElement[], rect: Rect2D): number[] {
    const candidateEdges: number[] = [];

    // Add left and right edges of the container
    candidateEdges.push(rect.x);
    candidateEdges.push(rect.x + rect.width);

    for (const element of elements) {
        const left = element.relX;
        const right = element.relX + element.relWidth;
        candidateEdges.push(left);
        candidateEdges.push(right);
    }

    candidateEdges.sort((a, b) => a - b);
    const uniqueEdges = dedupeWithEpsilon(candidateEdges);

    const cuts: number[] = [];
    for (const edge of uniqueEdges) {
        let crossesElement = false;
        for (const element of elements) {
            const left = element.relX;
            const right = element.relX + element.relWidth;
            if (edge > left + EPSILON && edge < right - EPSILON) {
                crossesElement = true;
                break;
            }
        }
        if (!crossesElement) {
            cuts.push(edge);
        }
    }

    return cuts;
}

function findHorizontalCuts(elements: LayoutElement[], rect: Rect2D): number[] {
    const candidateEdges: number[] = [];

    // Add top and bottom edges of the container
    candidateEdges.push(rect.y);
    candidateEdges.push(rect.y + rect.height);

    for (const element of elements) {
        const top = element.relY;
        const bottom = element.relY + element.relHeight;
        candidateEdges.push(top);
        candidateEdges.push(bottom);
    }

    candidateEdges.sort((a, b) => a - b);
    const uniqueEdges = dedupeWithEpsilon(candidateEdges);

    const cuts: number[] = [];
    for (const edge of uniqueEdges) {
        let crossesElement = false;
        for (const element of elements) {
            const top = element.relY;
            const bottom = element.relY + element.relHeight;
            if (edge > top + EPSILON && edge < bottom - EPSILON) {
                crossesElement = true;
                break;
            }
        }
        if (!crossesElement) {
            cuts.push(edge);
        }
    }

    return cuts;
}

type Segment = {
    rect: Rect2D;
    elements: LayoutElement[];
};

function buildVerticalSegments(elements: LayoutElement[], parent: Rect2D, cuts: number[]): Segment[] {
    if (cuts.length === 0) {
        return [];
    }

    const sortedCuts = [...cuts].sort((a, b) => a - b);
    const boundaries = [...sortedCuts];

    const segments: Segment[] = [];

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

        const elementsInSegment = getLayoutElementsInRect(elements, segmentRect);
        if (elementsInSegment.length > 0) {
            segments.push({
                rect: segmentRect,
                elements: elementsInSegment,
            });
        }
    }

    return segments;
}

function buildHorizontalSegments(elements: LayoutElement[], parent: Rect2D, cuts: number[]): Segment[] {
    if (cuts.length === 0) {
        return [];
    }

    const sortedCuts = [...cuts].sort((a, b) => a - b);
    const boundaries = [...sortedCuts];

    const segments: Segment[] = [];

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

        const elementsInSegment = getLayoutElementsInRect(elements, segmentRect);
        if (elementsInSegment.length > 0) {
            segments.push({
                rect: segmentRect,
                elements: elementsInSegment,
            });
        }
    }

    return segments;
}

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
