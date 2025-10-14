import React from "react";

import type { Size2D } from "@lib/utils/geometry";

import { EdgeShapeType, EdgeType, type LayoutNode } from "../controllers/LayoutNode";

export type DebugOverlayProps = {
    enabled: boolean;
    root: LayoutNode;
    realSize: Size2D;
    draggingModuleInstanceId: string | null;
};

export function DebugOverlay(props: DebugOverlayProps) {
    const nodes = React.useMemo(() => {
        function flatten(node: LayoutNode): LayoutNode[] {
            return [node, ...node.getChildren().flatMap(flatten)];
        }
        return flatten(props.root);
    }, [props.root]);

    if (!props.enabled) {
        return null;
    }

    return (
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-20 opacity-30" aria-hidden>
            {nodes.map((node) => {
                const rect = node.getOccupiedRelativeRect();
                const absoluteRect = {
                    x: rect.x * props.realSize.width,
                    y: rect.y * props.realSize.height,
                    width: rect.width * props.realSize.width,
                    height: rect.height * props.realSize.height,
                };

                const id = node.getMetadata()?.moduleInstanceId;
                if (id && props.draggingModuleInstanceId === id) {
                    return null;
                }
                const edges = node.makeEdges(props.realSize);
                const edgeShapes = edges.map((edge, index) => {
                    let color = "rgba(0, 255, 0)";
                    if (edge.edge === EdgeType.VERTICAL_IN_BETWEEN) {
                        color = "rgba(0, 255, 255)";
                    }
                    if (edge.edge === EdgeType.HORIZONTAL_IN_BETWEEN) {
                        color = "rgba(255, 0, 255)";
                    }
                    if (edge.edge === EdgeType.LEFT || edge.edge === EdgeType.RIGHT) {
                        color = "rgba(255, 255, 0)";
                    }
                    if (edge.edge === EdgeType.TOP || edge.edge === EdgeType.BOTTOM) {
                        color = "rgba(255, 165, 0)";
                    }

                    if (edge.shape.type === EdgeShapeType.QUADRILATERAL) {
                        const { p1, p2, p3, p4 } = edge.shape.points;
                        return (
                            <polygon
                                key={`${id ?? node.toString()}-edge-${index}`}
                                points={`${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y} ${p4.x},${p4.y}`}
                                fill={color}
                                stroke="black"
                                strokeWidth={1}
                            />
                        );
                    }

                    if (edge.shape.type === EdgeShapeType.TRIANGLE) {
                        const { p1, p2, p3 } = edge.shape.points;

                        return (
                            <polygon
                                key={`${id ?? node.toString()}-edge-${index}`}
                                points={`${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`}
                                fill={color}
                                stroke="black"
                                strokeWidth={1}
                            />
                        );
                    }
                });
                return (
                    <>
                        <rect
                            key={node.toString()}
                            x={absoluteRect.x}
                            y={absoluteRect.y}
                            width={absoluteRect.width}
                            height={absoluteRect.height}
                            fill="none"
                            stroke="red"
                            strokeWidth={2}
                        />
                        {edgeShapes}
                    </>
                );
            })}
        </svg>
    );
}
