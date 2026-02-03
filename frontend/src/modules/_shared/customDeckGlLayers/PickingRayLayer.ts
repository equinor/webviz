import type { Layer } from "@deck.gl/core";
import { CompositeLayer } from "@deck.gl/core";
import { LineLayer, ScatterplotLayer } from "@deck.gl/layers";

export type PickingRayLayerProps = {
    id: string;
    /** Coordinates in unscaled world space */
    pickInfoCoordinates: [number, number, number][];
    origin: [number, number, number];
    showRay?: boolean;
    sphereRadius?: number;
    cylinderRadius?: number;
    sizeUnits?: "meters" | "pixels";
};

export class PickingRayLayer extends CompositeLayer<PickingRayLayerProps> {
    static layerName: string = "PickingRayLayer";
    static defaultProps = {
        pickable: false,
    };

    renderLayers(): Layer[] {
        const {
            origin,
            pickInfoCoordinates,
            sphereRadius = 8,
            cylinderRadius = 2,
            showRay = true,
            sizeUnits = "pixels",
        } = this.props;

        if (!pickInfoCoordinates?.length) {
            return [];
        }

        // Build line segments from origin through all pick points
        // Positions are in unscaled world space; inherited modelMatrix handles vertical scaling
        const lineData = buildLineData(origin, pickInfoCoordinates);

        const radiusUnits = sizeUnits === "pixels" ? "pixels" : "meters";
        const widthUnits = sizeUnits === "pixels" ? "pixels" : "meters";

        // Scatterplot circles at pick coordinates (glow layer)
        const pointsGlow = new ScatterplotLayer(
            this.getSubLayerProps({
                id: "ray-points-glow",
                data: pickInfoCoordinates,
                getPosition: (d: [number, number, number]) => d,
                getRadius: sphereRadius * 1.8,
                radiusUnits,
                getFillColor: [255, 0, 0, 50],
                billboard: true,
                pickable: false,
                parameters: { depthTest: false },
            }),
        );

        // Scatterplot circles at pick coordinates (core layer)
        const pointsCore = new ScatterplotLayer(
            this.getSubLayerProps({
                id: "ray-points-core",
                data: pickInfoCoordinates,
                getPosition: (d: [number, number, number]) => d,
                getRadius: sphereRadius,
                radiusUnits,
                getFillColor: [255, 0, 0, 200],
                billboard: true,
                pickable: false,
                parameters: { depthTest: false },
            }),
        );

        if (!showRay) {
            return [pointsGlow, pointsCore];
        }

        // Lines between consecutive points (glow layer)
        const linesGlow = new LineLayer(
            this.getSubLayerProps({
                id: "ray-lines-glow",
                data: lineData,
                getSourcePosition: (d: LineSegment) => d.source,
                getTargetPosition: (d: LineSegment) => d.target,
                getWidth: cylinderRadius * 1.8,
                widthUnits,
                getColor: [255, 0, 0, 20], // ~0.08 opacity
                pickable: false,
                parameters: { depthTest: false },
            }),
        );

        // Lines between consecutive points (core layer)
        const linesCore = new LineLayer(
            this.getSubLayerProps({
                id: "ray-lines-core",
                data: lineData,
                getSourcePosition: (d: LineSegment) => d.source,
                getTargetPosition: (d: LineSegment) => d.target,
                getWidth: cylinderRadius,
                widthUnits,
                getColor: [255, 0, 0, 77], // ~0.3 opacity
                pickable: false,
                parameters: { depthTest: false },
            }),
        );

        return [linesGlow, linesCore, pointsGlow, pointsCore];
    }
}

type Vec3 = [number, number, number];
type LineSegment = { source: Vec3; target: Vec3 };

function buildLineData(origin: Vec3, points: Vec3[]): LineSegment[] {
    const all = [origin, ...points];
    const segments: LineSegment[] = [];
    for (let i = 0; i < all.length - 1; i++) {
        segments.push({ source: all[i], target: all[i + 1] });
    }
    return segments;
}
