import { quadrilateralContainsPoint, triangleContainsPoint, type Size2D } from "@lib/utils/geometry";
import {
    EDGE_RESIZE_WEIGHT,
    EdgeShapeType,
    LAYOUT_BOX_RESIZE_MARGIN,
    LayoutNodeEdgeType,
    type LayoutNode,
} from "../LayoutNode";
import React from "react";
import type { Vec2 } from "@lib/utils/vec2";

export type DebugEdgesProps = {
    root: LayoutNode;
    realSize: Size2D;
    zIndex: number;
    pointer: Vec2 | null;
    draggingModuleInstanceId: string | null;
};

export function DebugEdges(props: DebugEdgesProps) {
    const boxes = React.useMemo(() => {
        function flatten(node: LayoutNode): LayoutNode[] {
            return [node, ...node.getChildren().flatMap(flatten)];
        }
        return flatten(props.root);
    }, [props.root]);

    return (
        <svg
            className="absolute top-0 left-0 pointer-events-none opacity-50"
            style={{ width: props.realSize.width, height: props.realSize.height, zIndex: props.zIndex }}
            aria-hidden
        >
            {boxes.map((box) => {
                const id = box.getModuleInstanceId();
                if (id && props.draggingModuleInstanceId === id) {
                    return null;
                }
                const edges = box.makeEdges(props.realSize, EDGE_RESIZE_WEIGHT, LAYOUT_BOX_RESIZE_MARGIN);
                return edges.map((edge, index) => {
                    let color = "rgba(0, 255, 0)";
                    if (edge.edge === LayoutNodeEdgeType.VERTICAL) {
                        color = "rgba(0, 255, 255)";
                    }
                    if (edge.edge === LayoutNodeEdgeType.HORIZONTAL) {
                        color = "rgba(255, 0, 255)";
                    }
                    if (edge.edge === LayoutNodeEdgeType.LEFT || edge.edge === LayoutNodeEdgeType.RIGHT) {
                        color = "rgba(255, 255, 0)";
                    }
                    if (edge.edge === LayoutNodeEdgeType.TOP || edge.edge === LayoutNodeEdgeType.BOTTOM) {
                        color = "rgba(255, 165, 0)";
                    }

                    if (edge.shape.type === EdgeShapeType.QUADRILATERAL) {
                        const { p1, p2, p3, p4 } = edge.shape.shape;
                        if (props.pointer && quadrilateralContainsPoint(p1, p2, p3, p4, props.pointer)) {
                            color = "red";
                        }
                        return (
                            <polygon
                                key={`${box.getModuleInstanceId?.() ?? box.toString()}-edge-${index}`}
                                points={`${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y} ${p4.x},${p4.y}`}
                                fill={color}
                                stroke="black"
                                strokeWidth={1}
                            />
                        );
                    }

                    if (edge.shape.type === EdgeShapeType.TRIANGLE) {
                        const { p1, p2, p3 } = edge.shape.shape;
                        if (props.pointer && triangleContainsPoint(p1, p2, p3, props.pointer)) {
                            color = "red";
                        }
                        return (
                            <polygon
                                key={`${box.getModuleInstanceId?.() ?? box.toString()}-edge-${index}`}
                                points={`${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`}
                                fill={color}
                                stroke="black"
                                strokeWidth={1}
                            />
                        );
                    }
                    return null;
                });
            })}
        </svg>
    );
}
