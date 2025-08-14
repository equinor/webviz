import React from "react";

import { rectContainsPoint, rectsAreEqual, type Rect2D, type Size2D } from "@lib/utils/geometry";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import type { Vec2 } from "@lib/utils/vec2";

import {
    EDGE_DROP_WEIGHT,
    LAYOUT_BOX_DROP_MARGIN,
    LayoutNodeEdgeType,
    type LayoutNode,
    type LayoutNodeEdge,
} from "./LayoutNode";

function flatten(node: LayoutNode): LayoutNode[] {
    return [node, ...node.getChildren().flatMap(flatten)];
}

export type LayoutOverlayProps = {
    root: LayoutNode;
    active: string | null;
    realSize: Size2D;
    zIndex: number;
    pointer: Vec2;
};

export function LayoutOverlay(props: LayoutOverlayProps) {
    const flat = React.useMemo(() => flatten(props.root), [props.root]);
    const activeBox = props.pointer ? props.root.findBoxContainingPoint(props.pointer, props.realSize) : null;

    const makeBoxEdges = (box: LayoutNode) => {
        if (props.realSize.width === 0 || props.realSize.height === 0) {
            return null;
        }
        const edges: LayoutNodeEdge[] = box.getEdgeRects(props.realSize, EDGE_DROP_WEIGHT, LAYOUT_BOX_DROP_MARGIN);
        let hoveredEdge: Rect2D | null = null;
        if (props.active && props.active !== box.getModuleInstanceId() && activeBox === box) {
            hoveredEdge = box.findEdgeContainingPoint(props.pointer, props.realSize, props.active)?.rect || null;
        }

        return (
            <div key={box.toString()}>
                {edges.map((edge) => (
                    <div
                        key={`${edge.edge}-${edge.rect.x}-${edge.rect.y}-${edge.rect.width}-${edge.rect.height}`}
                        className="absolute rounded-sm bg-slate-400 justify-center items-center opacity-50"
                        style={{
                            left: edge.rect.x,
                            top: edge.rect.y,
                            width: edge.rect.width,
                            height: edge.rect.height,
                            zIndex: props.zIndex + 1,
                            display: hoveredEdge && rectsAreEqual(hoveredEdge, edge.rect) ? "flex" : "none",
                            flexDirection: [
                                LayoutNodeEdgeType.LEFT,
                                LayoutNodeEdgeType.RIGHT,
                                LayoutNodeEdgeType.VERTICAL,
                            ].includes(edge.edge)
                                ? "row"
                                : "column",
                        }}
                    >
                        {edge.edge === LayoutNodeEdgeType.LEFT && (
                            <div className="border-b-4 border-l-4 border-black rotate-45 w-4 h-4" />
                        )}
                        {edge.edge === LayoutNodeEdgeType.TOP && (
                            <div className="border-t-4 border-l-4 border-black rotate-45 w-4 h-4" />
                        )}
                        {edge.edge === LayoutNodeEdgeType.RIGHT && (
                            <div className="border-t-4 border-r-4 border-black rotate-45 w-4 h-4" />
                        )}
                        {edge.edge === LayoutNodeEdgeType.BOTTOM && (
                            <div className="border-r-4 border-b-4 border-black rotate-45 w-4 h-4" />
                        )}
                        {edge.edge === LayoutNodeEdgeType.VERTICAL && (
                            <>
                                <div className="border-b-4 border-l-4 border-black rotate-45 w-4 h-4" />
                                <div className="border-t-4 border-r-4 border-black rotate-45 w-4 h-4" />
                            </>
                        )}
                        {edge.edge === LayoutNodeEdgeType.HORIZONTAL && (
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
    if (flat.length === 1) {
        const rect = flat[0].getRectWithMargin(props.realSize);
        const hovered = rectContainsPoint(rect, props.pointer);
        return (
            <div
                className={resolveClassNames(
                    "absolute pointer-events-none flex justify-center items-center text-white",
                    { "bg-blue-300": hovered, "bg-transparent": !hovered },
                )}
                key={flat[0].toString()}
                style={{
                    left: rect.x,
                    top: rect.y,
                    width: rect.width,
                    height: rect.height,
                    zIndex: props.zIndex,
                }}
            ></div>
        );
    }
    return <>{flat.map((box) => makeBoxEdges(box))}</>;
}
