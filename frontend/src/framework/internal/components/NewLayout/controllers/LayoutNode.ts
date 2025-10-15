import type { LayoutElement } from "@framework/internal/Dashboard";
import {
    outerRectContainsInnerRect,
    quadrilateralContainsPoint,
    rectContainsPoint,
    scaleRectIndividually,
    triangleContainsPoint,
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

export enum NodeType {
    HORIZONTAL_BRANCH = "horizontal-branch",
    VERTICAL_BRANCH = "vertical-branch",
    LEAF = "leaf",
    ROOT = "root",
}

type LayoutNodeOptions = {
    occupiedRelativeRect: Rect2D;
    type: NodeType;
    parent?: LayoutNode | null;
    children?: LayoutNode[];
    level?: number;
};

type LeafMetadata = {
    moduleInstanceId?: string;
    moduleName?: string;
};

export const TEMP_MODULE_INSTANCE_ID = "TEMP_MODULE_INSTANCE_ID";

export class LayoutNode {
    private _occupiedRelativeRect: Rect2D;
    private _type: NodeType;
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

    setType(type: NodeType) {
        this._type = type;
    }

    getParent() {
        return this._parent;
    }

    setParent(parent: LayoutNode | null) {
        this._parent = parent;
    }

    getChildren() {
        return this._children;
    }

    setChildren(children: LayoutNode[]) {
        this._children = children;
        this.relayoutChildren();
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

    setMetadata(metadata: LeafMetadata) {
        this._metadata = metadata;
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
            if (this._type === NodeType.ROOT) {
                const leaf = new LayoutNode({
                    occupiedRelativeRect: layoutElementToRect(singleElement),
                    type: NodeType.LEAF,
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
            this._type = NodeType.LEAF;
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
                    type: NodeType.VERTICAL_BRANCH,
                    parent: this,
                    level: this._level + 1,
                });
                childNode.makeChildrenFromLayoutElements(segment.elements);
                children.push(childNode);
            }
            this._children = children;

            if (this._type === NodeType.ROOT) {
                const branch = new LayoutNode({
                    occupiedRelativeRect: this._occupiedRelativeRect,
                    type: NodeType.HORIZONTAL_BRANCH,
                    parent: this,
                    level: this._level + 1,
                    children: this._children,
                });
                this._children.forEach((c) => {
                    c.setParent(branch);
                    c.setLevel(branch.getLevel() + 1);
                });
                this._children = [branch];
            }
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
                    type: NodeType.HORIZONTAL_BRANCH,
                    parent: this,
                    level: this._level + 1,
                });
                childNode.makeChildrenFromLayoutElements(segment.elements);
                children.push(childNode);
            }
            this._children = children;

            if (this._type === NodeType.ROOT) {
                const branch = new LayoutNode({
                    occupiedRelativeRect: this._occupiedRelativeRect,
                    type: NodeType.VERTICAL_BRANCH,
                    parent: this,
                    level: this._level + 1,
                    children: this._children,
                });
                this._children.forEach((c) => {
                    c.setParent(branch);
                    c.setLevel(branch.getLevel() + 1);
                });
                this._children = [branch];
            }
        }
    }

    private relayoutChildren() {
        if (this._type === NodeType.LEAF) {
            return;
        }

        if (this._children.length === 0) {
            return;
        }

        const isHorizontalBranch = this._type === NodeType.HORIZONTAL_BRANCH;

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
        if (this._type === NodeType.LEAF) {
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
            onlyChild.setOccupiedRelativeRect(this._occupiedRelativeRect);
            this._parent._children = this._parent._children.map((c) => (c === this ? onlyChild : c));
            return;
        }

        // Otherwise, we just need to relayout the remaining children
        this.relayoutChildren();
    }

    findNodeContainingPoint(point: Vec2, viewportSize: Size2D): LayoutNode | undefined {
        const rect = this.calcAbsoluteRectWithLevelMargins(viewportSize, 10);
        if (!rectContainsPoint(rect, point)) {
            return undefined;
        }

        if (this._type === NodeType.LEAF) {
            return this;
        }

        for (const child of this._children) {
            const found = child.findNodeContainingPoint(point, viewportSize);
            if (found) {
                return found;
            }
        }

        return undefined;
    }

    findEdgeContainingPoint(point: Vec2, viewportSize: Size2D): Edge | undefined {
        const edges = this.makeEdges(viewportSize);
        const edge = edges.find((edge) => edgeContainsPoint(edge, point));
        if (!edge) {
            return undefined;
        }

        return edge;
    }

    calcAbsoluteRect(absoluteSize: Size2D): Rect2D {
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
        const directions: Set<NodeType> = new Set([this.getType()]);
        let parent = this.getParent();
        let type = this.getType();

        while (parent) {
            directions.add(parent.getType());
            if (
                directions.size === 2 ||
                parent.getType() === type ||
                ![NodeType.HORIZONTAL_BRANCH, NodeType.VERTICAL_BRANCH].includes(parent.getType()) ||
                ![NodeType.HORIZONTAL_BRANCH, NodeType.VERTICAL_BRANCH].includes(type)
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

        if (this.getType() === NodeType.LEAF) {
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

        if (this.getType() === NodeType.VERTICAL_BRANCH) {
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
        } else if (this.getType() === NodeType.HORIZONTAL_BRANCH) {
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

    clone(parent: LayoutNode | null = null): LayoutNode {
        const rect = this.getOccupiedRelativeRect();
        const clone = new LayoutNode({
            occupiedRelativeRect: { ...rect },
            type: this.getType(),
            parent,
            level: this.getLevel(),
        });

        clone._isNew = this._isNew;
        clone._metadata = this._metadata ? { ...this._metadata } : null;
        clone._children = this._children.map((child) => child.clone(clone));

        return clone;
    }

    toLayout(): LayoutElement[] {
        const elements: LayoutElement[] = [];

        if (this._type === NodeType.LEAF) {
            const relativeRect = this.getOccupiedRelativeRect();
            elements.push({
                moduleInstanceId: this._metadata?.moduleInstanceId,
                moduleName: this._metadata?.moduleName ?? "unknown",
                relX: relativeRect.x,
                relY: relativeRect.y,
                relWidth: relativeRect.width,
                relHeight: relativeRect.height,
            });
        } else {
            for (const child of this._children) {
                const childElements = child.toLayout();
                elements.push(...childElements);
            }
        }

        return elements;
    }

    private convertLeafToBranch(newType: NodeType) {
        if (this.getType() !== NodeType.LEAF) {
            throw new Error("Can only convert leaf nodes to branches");
        }

        // Clone this node to preserve its properties
        const nodeClone = this.clone(this);
        nodeClone.setLevel(this.getLevel() + 1);

        // Convert this node to the new branch type
        this._type = newType;
        this._metadata = null;
        this._children = [nodeClone];

        // Relayout the new branch
        this.relayoutChildren();
    }

    prependChild(child: LayoutNode) {
        this._children.unshift(child);
        child.setParent(this);
        child.setLevel(this.getLevel() + 1);
        this.relayoutChildren();
    }

    appendChild(child: LayoutNode) {
        this._children.push(child);
        child.setParent(this);
        child.setLevel(this.getLevel() + 1);
        this.relayoutChildren();
    }

    insertChildAt(child: LayoutNode, index: number) {
        this._children.splice(index, 0, child);
        child.setParent(this);
        child.setLevel(this.getLevel() + 1);
        this.relayoutChildren();
    }

    private positionToIndex(position: number, ignoreBoxes: LayoutNode[] = []): number {
        if (this._type === NodeType.HORIZONTAL_BRANCH) {
            const elementsBeforePosition = this._children.filter((child) => {
                if (ignoreBoxes.includes(child)) return false;
                const abs = child.getOccupiedRelativeRect();
                return abs.x < position;
            });
            return elementsBeforePosition.length;
        }
        if (this._type === NodeType.VERTICAL_BRANCH) {
            const elementsBeforePosition = this._children.filter((child) => {
                if (ignoreBoxes.includes(child)) return false;
                const abs = child.getOccupiedRelativeRect();
                return abs.y < position;
            });
            return elementsBeforePosition.length;
        }
        return 0;
    }

    private insertNodeAtEdge(edge: Edge, newNode: LayoutNode) {
        // When this is a leaf, we need to convert it to a branch
        if (this.getType() === NodeType.LEAF) {
            let newBranchType: NodeType = NodeType.VERTICAL_BRANCH;
            if (edge.edge === EdgeType.LEFT || edge.edge === EdgeType.RIGHT) {
                newBranchType = NodeType.HORIZONTAL_BRANCH;
            }
            this.convertLeafToBranch(newBranchType);
        }
        newNode.setIsNew(true);

        if (edge.edge === EdgeType.LEFT || edge.edge === EdgeType.TOP) {
            this.prependChild(newNode);
            return;
        }
        if (edge.edge === EdgeType.RIGHT || edge.edge === EdgeType.BOTTOM) {
            this.appendChild(newNode);
            return;
        }

        if (edge.edge === EdgeType.VERTICAL_IN_BETWEEN || edge.edge === EdgeType.HORIZONTAL_IN_BETWEEN) {
            const index = this.positionToIndex(edge.position);
            this.insertChildAt(newNode, index);
            return;
        }
    }

    private moveNode(source: LayoutNode, destination: LayoutNode, edge: Edge) {
        if (source === destination) {
            return;
        }

        const oldParent = source.getParent();

        oldParent?.removeChild(source);
        destination.insertNodeAtEdge(edge, source);
    }

    private findNodeContainingModuleInstance(moduleInstanceId: string): LayoutNode | null {
        if (this._metadata?.moduleInstanceId === moduleInstanceId) {
            return this;
        }

        let found: LayoutNode | null = null;
        this._children.every((child) => {
            found = child.findNodeContainingModuleInstance(moduleInstanceId);
            if (found) {
                return false;
            }
            return true;
        });

        return found;
    }

    makePreviewLayout(
        pointerPos: Vec2,
        viewportSize: Size2D,
        draggedModuleInstanceId: string,
        isNewModuleInstance: boolean,
    ): { root: LayoutNode; hoveredNode: LayoutNode; hoveredEdge: Edge | null } | null {
        // Should only be called from root node
        if (this._parent) {
            return null;
        }

        const previewClone = this.clone();

        // New module instance
        if (isNewModuleInstance && previewClone.getChildren().length === 0) {
            const draggedNode = new LayoutNode({
                occupiedRelativeRect: { x: 0, y: 0, width: 1, height: 1 },
                type: NodeType.LEAF,
                parent: previewClone,
                level: previewClone.getLevel() + 1,
            });

            draggedNode.setIsNew(true);
            draggedNode.setMetadata({
                moduleInstanceId: draggedModuleInstanceId,
            });

            previewClone._children.push(draggedNode);

            return { root: previewClone, hoveredNode: previewClone, hoveredEdge: null };
        }

        // Find node under pointer
        const hoveredNode = previewClone.findNodeContainingPoint(pointerPos, viewportSize);
        if (!hoveredNode) {
            return null;
        }

        // Find the edge under pointer
        const hoveredEdge = hoveredNode.findEdgeContainingPoint(pointerPos, viewportSize);
        if (!hoveredEdge) {
            return null;
        }

        if (isNewModuleInstance) {
            if (draggedModuleInstanceId === hoveredNode.getMetadata()?.moduleInstanceId) {
                return null;
            }
            const currentNode = previewClone.findNodeContainingModuleInstance(draggedModuleInstanceId);
            if (currentNode) {
                previewClone.moveNode(currentNode, hoveredNode, hoveredEdge);
                return { root: previewClone, hoveredNode, hoveredEdge };
            }

            const draggedNode = new LayoutNode({
                occupiedRelativeRect: { x: 0, y: 0, width: 1, height: 1 },
                type: NodeType.LEAF,
                parent: null,
                level: 0,
            });
            draggedNode.setIsNew(true);
            draggedNode.setMetadata({
                moduleInstanceId: draggedModuleInstanceId,
            });
            hoveredNode.insertNodeAtEdge(hoveredEdge, draggedNode);
            return { root: previewClone, hoveredNode, hoveredEdge };
        }

        // Existing module instance
        const draggedNode = previewClone.findNodeContainingModuleInstance(draggedModuleInstanceId);
        if (!draggedNode) {
            return null;
        }
        previewClone.moveNode(draggedNode, hoveredNode, hoveredEdge);

        return { root: previewClone, hoveredNode, hoveredEdge };
    }
}

export function makeLayoutTreeFromLayout(layout: LayoutElement[]): LayoutNode {
    const root = new LayoutNode({
        occupiedRelativeRect: { x: 0, y: 0, width: 1, height: 1 },
        type: NodeType.ROOT,
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

function edgeContainsPoint(edge: Edge, point: Vec2): boolean {
    if (edge.shape.type === EdgeShapeType.QUADRILATERAL) {
        const { p1, p2, p3, p4 } = edge.shape.points;
        return quadrilateralContainsPoint(p1, p2, p3, p4, point);
    } else if (edge.shape.type === EdgeShapeType.TRIANGLE) {
        const { p1, p2, p3 } = edge.shape.points;
        return triangleContainsPoint(p1, p2, p3, point);
    }
    return false;
}
