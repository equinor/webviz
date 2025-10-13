import type { Size2D } from "@lib/utils/geometry";
import type { LayoutNode } from "../controllers/LayoutNode";
import React from "react";

export type DebugOverlayProps = {
    enabled: boolean;
    root: LayoutNode;
    realSize: Size2D;
};

export function DebugOverlay(props: DebugOverlayProps) {
    if (!props.enabled) {
        return null;
    }

    const nodes = React.useMemo(() => {
        function flatten(node: LayoutNode): LayoutNode[] {
            return [node, ...node.getChildren().flatMap(flatten)];
        }
        return flatten(props.root);
    }, [props.root]);

    return (
        <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden>
            {nodes.map((node) => {
                const rect = node.getOccupiedRelativeRect();
                const absoluteRect = {
                    x: rect.x * props.realSize.width,
                    y: rect.y * props.realSize.height,
                    width: rect.width * props.realSize.width,
                    height: rect.height * props.realSize.height,
                };
                return (
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
                );
            })}
        </svg>
    );
}
