import type { Accessor, AccessorFunction, LayerContext, Position } from "@deck.gl/core";
import { CompositeLayer } from "@deck.gl/core";
import type { SolidPolygonLayerProps, TextLayerProps } from "@deck.gl/layers";
import { LineLayer, SolidPolygonLayer, TextLayer } from "@deck.gl/layers";

import type { GridCell } from "./types";

export type GridCellLayerProps = {
    data: GridCell[];
    getCorners: Accessor<GridCell, number[][]>;
};

const DIRECTIONS = ["x", "y", "z", "neg-x", "neg-y", "neg-z"] as const;
const DIRECTIONS_TO_INDEX = {
    x: 0,
    y: 1,
    z: 2,
    "neg-x": 3,
    "neg-y": 4,
    "neg-z": 5,
} as const;

const DEBUG_DIRECTION_COLORS = {
    x: [255, 0, 0],
    y: [0, 255, 0],
    z: [0, 0, 255],
    "neg-x": [255, 255, 0],
    "neg-y": [255, 0, 255],
    "neg-z": [0, 255, 255],
} as const;

const DEBUG_NEIGHBOR_INDEX_LABEL_OFFSET = {
    x: [0.5, 0, 0] as Position,
    y: [0, 0.5, 0] as Position,
    z: [0, 0, 0.5] as Position,
    "neg-x": [-0.5, 0, 0] as Position,
    "neg-y": [0, -0.5, 0] as Position,
    "neg-z": [0, 0, -0.5] as Position,
} as const;

const DEBUG_VEL_ARROW_CENTER_OFFSET = {
    x: [1.5, 0, 0] as Position,
    y: [0, 1.5, 0] as Position,
    z: [0, 0, 1.5] as Position,
    "neg-x": [-1.5, 0, 0] as Position,
    "neg-y": [0, -1.5, 0] as Position,
    "neg-z": [0, 0, -1.5] as Position,
} as const;

type LineDatum = { sourcePosition: Position; targetPosition: Position };

function applyAccessor<In, Out>(accessor: Accessor<In, Out>, datum: In): Out {
    if (typeof accessor === "function") {
        return (accessor as AccessorFunction<In, Out>)(datum, { index: -1, data: [], target: [] });
    }

    return accessor;
}

export class GridCellLayer extends CompositeLayer<GridCellLayerProps> {
    static layerName = "GridCellLayer";
    static defaultProps = {
        data: { value: [], compare: true },
        getCorners: { type: "accessor", value: (cell: GridCell) => cell.corners },
        getFaceVelocities: { type: "accessor", value: (cell: GridCell) => cell.faceVelocities },
        getNeighborIndices: { type: "accessor", value: (cell: GridCell) => cell.neighborIndices },
    };

    declare state: {
        wireFrameEdges: LineDatum[];
        corners: Position[];
        neighborIndices: number[][];
        faceVelocityPolygons: Position[];
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    initializeState(_context: LayerContext): void {
        const { getCorners } = this.props;

        const wireFrameEdges: LineDatum[] = [];

        const corners: Position[] = [];

        for (const cell of this.props.data) {
            const cellCorners = applyAccessor(getCorners, cell);

            wireFrameEdges.push(...buildWireframeEdges(cellCorners));
            corners.push(...(cellCorners as unknown as Position[]));
        }

        this.setState({
            wireFrameEdges,
            corners,
        });
    }

    renderLayers() {
        return [
            // Wireframe boxes
            new LineLayer(
                this.getSubLayerProps({
                    id: "wireframe",
                    data: this.state.wireFrameEdges,
                    getColor: [40, 40, 40, 200],
                    widthMinPixels: 1,
                }),
            ),

            new TextLayer(
                this.getSubLayerProps({
                    id: "id-corner-index-label",
                    data: this.state.corners,
                    getText: (d, ctx) => String(ctx.index % 8),
                    getSize: 12,
                    getPosition: (d: Position, ctx) => {
                        const cellIndex = Math.floor(ctx.index / 8);
                        const cell = this.props.data[cellIndex];
                        const cellCenter = getCellCenter(cell);

                        if (cellCenter.length === 2) {
                            offsetPosition(d, [(cellCenter[0] - d[0]) * 0.1, (cellCenter[1] - d[1]) * 0.1]);
                        } else {
                            return offsetPosition(d, [
                                (cellCenter[0] - d[0]) * 0.1,
                                (cellCenter[1] - d[1]) * 0.1,
                                (cellCenter[2]! - d[2]!) * 0.1,
                            ]);
                        }
                    },
                } as TextLayerProps),
            ),

            new TextLayer(
                this.getSubLayerProps({
                    id: "id-label",
                    data: this.props.data,
                    pickable: true,
                    autoHighlight: true,
                    getText: (d: GridCell) => d.index.toString(),
                    getPosition: (d: GridCell) => getCellCenter(d),
                } as TextLayerProps),
            ),

            // Cell neighbors labels
            ...DIRECTIONS.map((dir, i) => {
                return new TextLayer(
                    this.getSubLayerProps({
                        id: `id-label-${dir}`,
                        data: this.props.data,
                        getSize: 12,
                        sizeMinPixels: 12,
                        background: true,
                        fontSettings: { sdf: true },

                        outlineColor: [...DEBUG_DIRECTION_COLORS[dir], 255],
                        outlineWidth: 3,

                        getBackgroundColor: [255, 255, 255, 200],
                        getText: (d: GridCell) => d.neighborIndices[i].toString(),
                        getPosition: (d: GridCell) =>
                            offsetPosition(getCellCenter(d), DEBUG_NEIGHBOR_INDEX_LABEL_OFFSET[dir]),
                    } as TextLayerProps),
                );
            }),

            // Face velocity arrows
            ...DIRECTIONS.map((dir) => {
                return new SolidPolygonLayer(
                    this.getSubLayerProps({
                        id: `face-velocity-arrow-${dir}`,
                        data: this.props.data,
                        getFillColor: [...DEBUG_DIRECTION_COLORS[dir], 255],
                        getPolygon: (d: GridCell) => {
                            const faceIndex = DIRECTIONS_TO_INDEX[dir];
                            const faceVelocity = d.faceVelocities[faceIndex];

                            const arrowPosition = offsetPosition(getCellCenter(d), DEBUG_VEL_ARROW_CENTER_OFFSET[dir]);

                            const arrowLength = 0.5; // TODO:

                            return makeArrowPolygon(arrowPosition, faceVelocity, arrowLength);
                        },
                    } as SolidPolygonLayerProps),
                );
            }),
        ];
    }
}

// Corner order: 0 SW-top, 1 SE-top, 2 NW-top, 3 NE-top, 4 SW-base, 5 SE-base, 6 NW-base, 7 NE-base
// (matches reconstructCellCorners / xtgeo.get_xyz_cell_corners).
const HEX_WIREFRAME_EDGES: readonly [number, number][] = [
    [0, 1],
    [1, 3],
    [3, 2],
    [2, 0], // top ring
    [4, 5],
    [5, 7],
    [7, 6],
    [6, 4], // base ring
    [0, 4],
    [1, 5],
    [2, 6],
    [3, 7], // verticals

    // [0, 3], // Top diagonal
    // [4, 7], // Base diagonal
    // [0, 5],
    // [0, 6],
    // [1, 7],
    // [2, 7],

    // TEST
    // [0, 2],
    // [0, 4],
    // [0, 6],
];

function buildWireframeEdges(corners: number[][]): LineDatum[] {
    // const { nx, ny, cellCornersFloat32Arr, activeUint8Arr } = data;
    // const lines: LineDatum[] = [];
    const lines: LineDatum[] = [];

    for (const [aIndex, bIndex] of HEX_WIREFRAME_EDGES) {
        if (corners[aIndex].length < 2) continue;
        if (corners[bIndex].length < 2) continue;

        lines.push({
            sourcePosition: corners[aIndex] as unknown as Position,
            targetPosition: corners[bIndex] as unknown as Position,
        });
    }

    return lines;
}

function getCellCenter(cell: GridCell): Position {
    const corners = cell.corners;
    const center: [number, number, number] = [0, 0, 0];

    for (const corner of corners) {
        center[0] += corner[0];
        center[1] += corner[1];
        center[2] += corner[2];
    }

    center[0] /= corners.length;
    center[1] /= corners.length;
    center[2] /= corners.length;

    return center as Position;
}

// TODO: Will use later
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getFaceCenter(cell: GridCell, face: "x" | "y" | "z" | "neg-x" | "neg-y" | "neg-z"): Position {
    const corners = cell.corners;
    const center: [number, number, number] = [0, 0, 0];

    const faceIndices: Record<string, number[]> = {
        x: [1, 3, 5, 7],
        y: [2, 3, 6, 7],
        z: [4, 5, 6, 7],
        "neg-x": [0, 2, 4, 6],
        "neg-y": [0, 1, 4, 5],
        "neg-z": [0, 1, 2, 3],
    };

    const indices = faceIndices[face];

    for (const index of indices) {
        const corner = corners[index];
        center[0] += corner[0];
        center[1] += corner[1];
        center[2] += corner[2];
    }

    center[0] /= indices.length;
    center[1] /= indices.length;
    center[2] /= indices.length;

    return center as Position;
}

function offsetPosition(position: Position, offset: Position): Position {
    if (position.length === 2 && offset.length === 2) {
        return [position[0] + offset[0], position[1] + offset[1]] as Position;
    }

    if (position.length === 3 && offset.length === 3) {
        return [position[0] + offset[0], position[1] + offset[1], position[2] + offset[2]] as Position;
    }

    throw new Error("Position and offset must both be 2D or 3D");
}

function makeArrowPolygon(basePosition: Position, direction: number[], length: number): Position[] {
    // console.log("make arrow for", basePosition, direction, length);

    const [dx, dy, dz] = direction;
    const dirLen = Math.hypot(dx, dy, dz) || 1;
    const ndx = dx / dirLen;
    const ndy = dy / dirLen;
    const ndz = dz / dirLen;

    // Perpendicular via cross product with a stable reference axis.
    const ref = Math.abs(ndz) < 0.9 ? [0, 0, 1] : [1, 0, 0];
    let rx = ndy * ref[2] - ndz * ref[1];
    let ry = ndz * ref[0] - ndx * ref[2];
    let rz = ndx * ref[1] - ndy * ref[0];
    const rLen = Math.hypot(rx, ry, rz) || 1;
    rx /= rLen;
    ry /= rLen;
    rz /= rLen;

    const [px, py, pz] = basePosition;
    const along = (s: number) => [px + ndx * s, py + ndy * s, pz + ndz * s];
    const point = (s: number, w: number) => {
        const [ax, ay, az] = along(s);
        return [ax + rx * w, ay + ry * w, az + rz * w];
    };

    const headLength = length * 0.4;
    const shaftLength = length - headLength;
    const shaftHalfWidth = length * 0.08;
    const headHalfWidth = length * 0.22;

    return [
        point(0, -shaftHalfWidth),
        point(shaftLength, -shaftHalfWidth),
        point(shaftLength, -headHalfWidth),
        along(length),
        point(shaftLength, headHalfWidth),
        point(shaftLength, shaftHalfWidth),
        point(0, shaftHalfWidth),
    ] as unknown as Position[];
}
