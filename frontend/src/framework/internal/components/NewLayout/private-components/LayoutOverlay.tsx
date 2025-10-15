import type { Size2D } from "@lib/utils/geometry";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";

import { LayoutControllerTopic, PreviewPhase, type LayoutController } from "../controllers/LayoutController";
import { EdgeShapeType, EdgeType, type Edge } from "../controllers/LayoutNode";

export type LayoutOverlayProps = {
    layoutController: LayoutController;
    viewportSize: Size2D;
};

export function LayoutOverlay(props: LayoutOverlayProps) {
    const previewPhase = usePublishSubscribeTopicValue(props.layoutController, LayoutControllerTopic.PREVIEW_PHASE);
    const hoveredNode = usePublishSubscribeTopicValue(props.layoutController, LayoutControllerTopic.HOVERED_NODE);
    const hoveredEdge = usePublishSubscribeTopicValue(props.layoutController, LayoutControllerTopic.HOVERED_EDGE);

    if (previewPhase !== PreviewPhase.INDICATING) {
        return null;
    }

    return (
        <svg className="absolute inset-0 w-full h-full z-40">
            {/* Display hovered node as a blue rectangle */}
            {hoveredNode && (
                <rect
                    x={hoveredNode.getOccupiedRelativeRect().x * props.viewportSize.width}
                    y={hoveredNode.getOccupiedRelativeRect().y * props.viewportSize.height}
                    width={hoveredNode.getOccupiedRelativeRect().width * props.viewportSize.width}
                    height={hoveredNode.getOccupiedRelativeRect().height * props.viewportSize.height}
                    fill="rgba(0, 0, 255, 0.1)"
                    stroke="blue"
                    strokeWidth={2}
                />
            )}

            {/* Display hovered edge with an arrow pointing in the edges outward direction */}
            {hoveredEdge && (
                <g>
                    <path
                        d={makeArrowPathForEdge(hoveredEdge, props.viewportSize)}
                        fill="rgba(255, 0, 0, 0.5)"
                        stroke="red"
                        strokeWidth={2}
                    />
                </g>
            )}
        </svg>
    );
}

function makeArrowPathForEdge(edge: Edge, nodeSize: Size2D): string {
    const arrowSize = 20;
    let midPoint = { x: 0, y: 0 };
    if (edge.shape.type === EdgeShapeType.TRIANGLE) {
        const { p1, p2, p3 } = edge.shape.points;
        midPoint = { x: (p1.x + p2.x + p3.x) / 3, y: (p1.y + p2.y + p3.y) / 3 };
    }
    if (edge.shape.type === EdgeShapeType.QUADRILATERAL) {
        const { p1, p2, p3, p4 } = edge.shape.points;
        midPoint = { x: (p1.x + p2.x + p3.x + p4.x) / 4, y: (p1.y + p2.y + p3.y + p4.y) / 4 };
    }

    if (edge.edge === EdgeType.LEFT) {
        return `M ${midPoint.x} ${midPoint.y} L ${midPoint.x + arrowSize} ${midPoint.y - arrowSize / 2} L ${midPoint.x + arrowSize} ${midPoint.y + arrowSize / 2} Z`;
    }
    if (edge.edge === EdgeType.RIGHT) {
        return `M ${midPoint.x} ${midPoint.y} L ${midPoint.x - arrowSize} ${midPoint.y - arrowSize / 2} L ${midPoint.x - arrowSize} ${midPoint.y + arrowSize / 2} Z`;
    }
    if (edge.edge === EdgeType.TOP) {
        return `M ${midPoint.x} ${midPoint.y} L ${midPoint.x - arrowSize / 2} ${midPoint.y + arrowSize} L ${midPoint.x + arrowSize / 2} ${midPoint.y + arrowSize} Z`;
    }
    if (edge.edge === EdgeType.BOTTOM) {
        return `M ${midPoint.x} ${midPoint.y} L ${midPoint.x - arrowSize / 2} ${midPoint.y - arrowSize} L ${midPoint.x + arrowSize / 2} ${midPoint.y - arrowSize} Z`;
    }

    return "";
}
