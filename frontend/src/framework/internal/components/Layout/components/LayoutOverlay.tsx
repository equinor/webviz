import React from "react";

import { rectContainsPoint, type Rect2D, type Size2D } from "@lib/utils/geometry";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import type { Vec2 } from "@lib/utils/vec2";

import { LayoutNodeEdgeType, type LayoutNode } from "../LayoutNode";

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
    const hovered = activeBox.findEdgeContainingPoint(props.pointer!, props.realSize, props.active!);
    const edgeType = hovered?.edge;
    const rect: Rect2D | undefined = hovered?.rect;

    if (!edgeType || !rect) {
        return null;
    }

    const isRowDirection = [LayoutNodeEdgeType.LEFT, LayoutNodeEdgeType.RIGHT, LayoutNodeEdgeType.VERTICAL].includes(
        edgeType,
    );

    const minDim = Math.min(hovered.rect.width, hovered.rect.height);
    const ARROW_PX = Math.max(8, Math.min(20, Math.floor(minDim * 0.35)));

    return (
        <div
            className="absolute pointer-events-none rounded-sm bg-slate-400 opacity-50 flex justify-center items-center"
            style={{
                left: rect.x,
                top: rect.y,
                width: rect.width,
                height: rect.height,
                zIndex: props.zIndex + 1,
                // NB: using inline style for layout control is fine here
                // since this is a transient overlay.
                display: "flex",
                flexDirection: isRowDirection ? "row" : "column",
            }}
            aria-hidden
        >
            {edgeType === LayoutNodeEdgeType.LEFT && <Arrow direction="left" size={ARROW_PX} />}
            {edgeType === LayoutNodeEdgeType.TOP && <Arrow direction="top" size={ARROW_PX} />}
            {edgeType === LayoutNodeEdgeType.RIGHT && <Arrow direction="right" size={ARROW_PX} />}
            {edgeType === LayoutNodeEdgeType.BOTTOM && <Arrow direction="bottom" size={ARROW_PX} />}
            {edgeType === LayoutNodeEdgeType.VERTICAL && (
                <>
                    <Arrow direction="left" size={ARROW_PX} />
                    <Arrow direction="right" size={ARROW_PX} />
                </>
            )}
            {edgeType === LayoutNodeEdgeType.HORIZONTAL && (
                <>
                    <Arrow direction="top" size={ARROW_PX} />
                    <Arrow direction="bottom" size={ARROW_PX} />
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
    const arrowStyle = {
        width: props.size,
        height: props.size,
        borderColor: "black",
    } as const;

    const borderWidth = Math.max(1, Math.floor(props.size / 4));

    return (
        <div
            className={`rotate-45`}
            style={{
                ...arrowStyle,
                ...(props.direction === "left" && { borderLeftWidth: borderWidth, borderBottomWidth: borderWidth }),
                ...(props.direction === "right" && { borderTopWidth: borderWidth, borderRightWidth: borderWidth }),
                ...(props.direction === "top" && { borderTopWidth: borderWidth, borderLeftWidth: borderWidth }),
                ...(props.direction === "bottom" && { borderRightWidth: borderWidth, borderBottomWidth: borderWidth }),
            }}
        />
    );
}
