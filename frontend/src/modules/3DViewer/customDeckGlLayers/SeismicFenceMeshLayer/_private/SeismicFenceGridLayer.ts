import { CompositeLayer } from "@deck.gl/core";
import type { FilterContext, Layer, LayerProps, UpdateParameters } from "@deck.gl/core";
import { LineLayer, ScatterplotLayer } from "@deck.gl/layers";
import { isEqual } from "lodash-es";

import type { SeismicFence } from "../SeismicFenceMeshLayer";

import {
    buildFenceLatticeWindow,
    fenceExtent,
    fenceNumTraces,
    getFencePointFromGridNode,
    type FenceLatticeWindow,
    type LatticeSegment,
} from "./fenceSampling";

export type SeismicFenceGridLayerProps = {
    id: string;
    data: SeismicFence;
    zIncreaseDownwards?: boolean;
    /** Trace/sample index the spotlight is centred on, or null when nothing is hovered. */
    highlightNode?: { traceIndex: number; sampleIndex: number } | null;
    /** Radius of the fade, in grid cells. */
    fadeRadiusCells?: number;
} & LayerProps;

// Lattice lines and node rings are a fixed pixel size at every zoom. The nearest-node marker is a
// fixed *world* size (a small fraction of the slice) clamped to a pixel range, so it grows as you
// zoom in and stays prominent, while behaving the same on every slice.
const NODE_RADIUS_PX = 2;
const NODE_STROKE_PX = 1;
const MARKER_STROKE_PX = 1.5;
const MARKER_WORLD_FRACTION = 0.006;
const MARKER_MIN_PX = 6;
const MARKER_MAX_PX = 18;
// Lattice lines stop this many pixels short of a node so they meet the rings with a clean gap.
const LINE_GAP_PX = NODE_RADIUS_PX + NODE_STROKE_PX + 1;
// Hide the whole spotlight once one grid cell shrinks below this on screen — the lattice would
// otherwise just be visual noise when zoomed out.
const MIN_CELL_SIZE_PX = 5;

type MarkPoint = { position: [number, number, number]; alpha?: number };

const alphaColor = (rgb: [number, number, number], alpha: number, scale: number): [number, number, number, number] => [
    rgb[0],
    rgb[1],
    rgb[2],
    Math.round(alpha * scale),
];

/**
 * A LineLayer whose segments are trimmed by a fixed pixel amount at both ends, so lattice lines
 * meet the node rings with a clean gap rather than crossing through them.
 */
class TrimmedLineLayer<DataT> extends LineLayer<DataT> {
    static layerName = "TrimmedLineLayer";

    getShaders() {
        const shaders = super.getShaders();
        return {
            ...shaders,
            inject: {
                ...(shaders.inject ?? {}),
                "vs:#main-end": /* glsl */ `
                    {
                        vec2 endA = source.xy / source.w;
                        vec2 endB = target.xy / target.w;
                        float pxLen = length((endB - endA) * project.viewportSize * 0.5);
                        if (pxLen > 1.0) {
                            float trim = clamp(float(${LINE_GAP_PX}) / pxLen, 0.0, 0.45);
                            vec4 trimmed = mix(source, target, mix(trim, 1.0 - trim, positions.x));
                            gl_Position = trimmed + vec4(project_pixel_size_to_clipspace(offset.xy), 0.0, 0.0);
                        }
                    }
                `,
            },
        };
    }
}

/**
 * Draws the seismic slice's `trace x sample` lattice as a soft spotlight around the hovered sample:
 * outline-only points and connecting lines fading to nothing a few cells out, plus a ring marking
 * the nearest node. Only the small patch around `highlightNode` is built, and the whole thing is
 * filtered out when zoomed out far enough that the cells collapse. Not pickable — the hovered node
 * comes from `SeismicSlicesLayer` inverting the mesh pick coordinate.
 */
export class SeismicFenceGridLayer extends CompositeLayer<SeismicFenceGridLayerProps> {
    static layerName = "SeismicFenceGridLayer";
    static defaultProps = {
        pickable: false,
        fadeRadiusCells: { type: "number", value: 8 },
    };

    // Runs every frame with the current viewport: drop the spotlight once a cell is too small.
    filterSubLayer(context: FilterContext): boolean {
        const { data, highlightNode, zIncreaseDownwards } = this.props;
        if (!data || !highlightNode) {
            return false;
        }

        const numTraces = fenceNumTraces(data);
        const { traceIndex, sampleIndex } = highlightNode;
        const traceNeighbour = traceIndex + 1 < numTraces ? traceIndex + 1 : Math.max(traceIndex - 1, 0);
        const sampleNeighbour = sampleIndex + 1 < data.numSamples ? sampleIndex + 1 : Math.max(sampleIndex - 1, 0);

        const zScale = (this.props.modelMatrix as ArrayLike<number> | undefined)?.[10] || 1;
        const project = (t: number, s: number): number[] => {
            const p = getFencePointFromGridNode(data, zIncreaseDownwards ?? false, t, s);
            return context.viewport.project([p[0], p[1], p[2] * zScale]);
        };

        const center = project(traceIndex, sampleIndex);
        const alongTrace = project(traceNeighbour, sampleIndex);
        const alongSample = project(traceIndex, sampleNeighbour);
        const cellSizePx = Math.min(
            Math.hypot(alongTrace[0] - center[0], alongTrace[1] - center[1]),
            Math.hypot(alongSample[0] - center[0], alongSample[1] - center[1]),
        );

        return cellSizePx >= MIN_CELL_SIZE_PX;
    }

    // @ts-expect-error - deck.gl state typing
    state!: { window: FenceLatticeWindow | null; markerRadiusWorld: number };

    initializeState(): void {
        this.setState({ window: this.computeWindow(), markerRadiusWorld: this.computeMarkerRadius() });
    }

    updateState(params: UpdateParameters<Layer<SeismicFenceGridLayerProps>>): void {
        const { props, oldProps } = params;
        if (props.data !== oldProps.data) {
            this.setState({ markerRadiusWorld: this.computeMarkerRadius() });
        }
        if (
            props.data !== oldProps.data ||
            props.zIncreaseDownwards !== oldProps.zIncreaseDownwards ||
            props.fadeRadiusCells !== oldProps.fadeRadiusCells ||
            !isEqual(props.highlightNode, oldProps.highlightNode)
        ) {
            this.setState({ window: this.computeWindow() });
        }
    }

    private computeMarkerRadius(): number {
        return this.props.data ? fenceExtent(this.props.data) * MARKER_WORLD_FRACTION : 0;
    }

    private computeWindow(): FenceLatticeWindow | null {
        const { data, zIncreaseDownwards, highlightNode, fadeRadiusCells = 8 } = this.props;
        if (!data || !highlightNode) {
            return null;
        }
        return buildFenceLatticeWindow(
            data,
            zIncreaseDownwards ?? false,
            highlightNode.traceIndex,
            highlightNode.sampleIndex,
            fadeRadiusCells,
        );
    }

    renderLayers(): Layer[] {
        const window = this.state.window;
        if (!window) {
            return [];
        }

        const circle = (
            id: string,
            data: MarkPoint[],
            radius: number,
            strokePx: number,
            color: [number, number, number],
            alphaScale: number,
            worldRadius = false,
        ) =>
            new ScatterplotLayer<MarkPoint>(
                this.getSubLayerProps({
                    id,
                    data,
                    getPosition: (d: MarkPoint) => d.position,
                    getRadius: radius,
                    radiusUnits: worldRadius ? "common" : "pixels",
                    radiusMinPixels: worldRadius ? MARKER_MIN_PX : radius,
                    radiusMaxPixels: worldRadius ? MARKER_MAX_PX : radius,
                    stroked: true,
                    filled: false,
                    getLineColor: (d: MarkPoint) => alphaColor(color, d.alpha ?? 1, alphaScale),
                    getLineWidth: strokePx,
                    lineWidthUnits: "pixels",
                    lineWidthMinPixels: strokePx,
                    lineWidthMaxPixels: strokePx,
                    billboard: true,
                    parameters: { depthTest: false },
                    updateTriggers: { getLineColor: window },
                }),
            );

        const line = (id: string, color: [number, number, number], widthPx: number, alphaScale: number) =>
            new TrimmedLineLayer<LatticeSegment>(
                this.getSubLayerProps({
                    id,
                    data: window.segments,
                    getSourcePosition: (d: LatticeSegment) => d.source,
                    getTargetPosition: (d: LatticeSegment) => d.target,
                    getColor: (d: LatticeSegment) => alphaColor(color, d.alpha, alphaScale),
                    getWidth: widthPx,
                    widthUnits: "pixels",
                    widthMinPixels: widthPx,
                    widthMaxPixels: widthPx,
                    parameters: { depthTest: false },
                    updateTriggers: { getColor: window },
                }),
            );

        const center: MarkPoint[] = [{ position: window.center }];
        const markerRadius = this.state.markerRadiusWorld;

        // Each mark is a faint, slightly wider dark underlay beneath a light core: just enough edge
        // contrast to stay legible on bright seismic, without the underlay reading as its own line.
        return [
            line("lines-underlay", [0, 0, 0], 1.6, 35),
            line("lines-core", [255, 255, 255], 1, 235),
            circle("nodes-underlay", window.nodes, NODE_RADIUS_PX, NODE_STROKE_PX + 0.75, [0, 0, 0], 35),
            circle("nodes", window.nodes, NODE_RADIUS_PX, NODE_STROKE_PX, [255, 255, 255], 235),
            circle("marker-underlay", center, markerRadius, MARKER_STROKE_PX + 1, [0, 0, 0], 130, true),
            circle("marker", center, markerRadius, MARKER_STROKE_PX, [255, 255, 255], 255, true),
        ];
    }
}
