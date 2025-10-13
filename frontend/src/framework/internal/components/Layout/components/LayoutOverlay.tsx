import React from "react";

import { rectContainsPoint, type Size2D } from "@lib/utils/geometry";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import type { Vec2 } from "@lib/utils/vec2";

import { EdgeShapeType, LayoutNodeEdgeType, type LayoutNode } from "../LayoutNode";

function flatten(node: LayoutNode): LayoutNode[] {
    return [node, ...node.getChildren().flatMap(flatten)];
}

export type LayoutOverlayProps = {
    root: LayoutNode;
    active: string | null;
    realSize: Size2D;
    zIndex: number;
    pointer: Vec2 | null;
};

export function LayoutOverlay(props: LayoutOverlayProps) {
    const flat = React.useMemo(() => flatten(props.root), [props.root]);

    const activeBox = React.useMemo(
        () => (props.pointer ? props.root.findBoxContainingPoint(props.pointer, props.realSize) : null),
        [props.root, props.pointer, props.realSize],
    );

    // If there’s only one box, show a simple hover highlight for the whole area.
    if (flat.length === 1) {
        const rect = flat[0].getRectWithMargin(props.realSize);
        const hovered = props.pointer ? rectContainsPoint(rect, props.pointer) : false;

        return (
            <div
                className={resolveClassNames(
                    "absolute pointer-events-none flex justify-center items-center text-white",
                    { "bg-blue-300": hovered, "bg-transparent": !hovered },
                )}
                key={flat[0].getModuleInstanceId?.() ?? flat[0].toString()}
                style={{
                    left: rect.x,
                    top: rect.y,
                    width: rect.width,
                    height: rect.height,
                    zIndex: props.zIndex,
                }}
                aria-hidden
            />
        );
    }

    // only show an edge when we have a drag source (active)
    const shouldShowEdge =
        !!props.pointer && !!props.active && !!activeBox && activeBox.getModuleInstanceId?.() !== props.active;

    if (!shouldShowEdge) {
        return null;
    }

    // Compute hovered edge and rect once for the active box.
    const hoveredEdge = activeBox.findEdgeContainingPoint(props.pointer!, props.realSize, props.active!);
    if (!hoveredEdge) {
        return null;
    }

    const edgeType = hoveredEdge.edge;
    const isRowDirection = [LayoutNodeEdgeType.LEFT, LayoutNodeEdgeType.RIGHT, LayoutNodeEdgeType.VERTICAL].includes(
        edgeType,
    );

    const arrowSize = 20;
    let midPoint = { x: 0, y: 0 };
    if (hoveredEdge.shape.type === EdgeShapeType.TRIANGLE) {
        const { p1, p2, p3 } = hoveredEdge.shape.shape;
        midPoint = { x: (p1.x + p2.x + p3.x) / 3, y: (p1.y + p2.y + p3.y) / 3 };
    }
    if (hoveredEdge.shape.type === EdgeShapeType.QUADRILATERAL) {
        const { p1, p2, p3, p4 } = hoveredEdge.shape.shape;
        midPoint = { x: (p1.x + p2.x + p3.x + p4.x) / 4, y: (p1.y + p2.y + p3.y + p4.y) / 4 };
    }

    const activeBoxRect = activeBox.getRectWithMargin(props.realSize);

    let rect = {
        x: midPoint.x - activeBoxRect.width / 2,
        y: midPoint.y - activeBoxRect.height / 4,
        width: activeBoxRect.width,
        height: activeBoxRect.height / 2,
    };
    if (isRowDirection) {
        rect = {
            x: midPoint.x - activeBoxRect.width / 4,
            y: midPoint.y - activeBoxRect.height / 2,
            width: activeBoxRect.width / 2,
            height: activeBoxRect.height,
        };
    }

    return (
        <div
            className="absolute pointer-events-none rounded-sm bg-slate-400 opacity-50 flex justify-center items-center"
            style={{
                left: rect.x,
                top: rect.y,
                width: rect.width,
                height: rect.height,
                zIndex: props.zIndex + 1,
                display: "flex",
                flexDirection: isRowDirection ? "row" : "column",
            }}
            aria-hidden
        >
            {edgeType === LayoutNodeEdgeType.LEFT && <Arrow direction="left" size={arrowSize} />}
            {edgeType === LayoutNodeEdgeType.TOP && <Arrow direction="top" size={arrowSize} />}
            {edgeType === LayoutNodeEdgeType.RIGHT && <Arrow direction="right" size={arrowSize} />}
            {edgeType === LayoutNodeEdgeType.BOTTOM && <Arrow direction="bottom" size={arrowSize} />}
            {edgeType === LayoutNodeEdgeType.VERTICAL && (
                <>
                    <Arrow direction="left" size={arrowSize} />
                    <Arrow direction="right" size={arrowSize} />
                </>
            )}
            {edgeType === LayoutNodeEdgeType.HORIZONTAL && (
                <>
                    <Arrow direction="top" size={arrowSize} />
                    <Arrow direction="bottom" size={arrowSize} />
                </>
            )}
        </div>
    );
}

type ArrowProps = {
    direction: "left" | "right" | "top" | "bottom";
    size: number;
};

function Arrow(props: ArrowProps) {
    const borderWidth = Math.max(1, Math.floor(props.size / 4));

    return (
        <div
            className="transform rotate-45"
            style={{
                width: props.size,
                height: props.size,
                boxSizing: "border-box",
                borderStyle: "solid",
                borderColor: "black",
                ...(props.direction === "left" && { borderLeftWidth: borderWidth, borderBottomWidth: borderWidth }),
                ...(props.direction === "right" && { borderTopWidth: borderWidth, borderRightWidth: borderWidth }),
                ...(props.direction === "top" && { borderTopWidth: borderWidth, borderLeftWidth: borderWidth }),
                ...(props.direction === "bottom" && { borderRightWidth: borderWidth, borderBottomWidth: borderWidth }),
            }}
        />
    );
}
