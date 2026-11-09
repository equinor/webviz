import type { Accessor, AccessorContext, LayerContext, Position } from "@deck.gl/core";
import { CompositeLayer } from "@deck.gl/core";
import type { SolidPolygonLayerProps, TextLayerProps } from "@deck.gl/layers";
import { LineLayer, SolidPolygonLayer, TextLayer } from "@deck.gl/layers";

import { applyAccessor } from "@framework/utils/deckgl";
import { length, fromArray } from "@lib/utils/vec3";
import { positionAtLengthAlong } from "@modules/_shared/utils/polylineHoverUtils";

import type { Faces, FaceData } from "./types";
import { FACE_CORNERS, FACES } from "./types";
import { getFaceCenter, makeFaceData } from "./utils";

export type GridCellLayerProps<TData = any> = {
    data: TData[];
    getCorners: Accessor<TData, Position[]>;
    getFaceVelocities: Accessor<TData, FaceData<number[]>>;
    getNeighborCells: Accessor<TData, FaceData<number>>;
    velocityScale: number;
    debug?: {
        index?: boolean;
        wireframe?: boolean;
        cornerIndex?: boolean;
        neighborIndex?: boolean;
        velocity?: boolean;
    };
};

const DEBUG_DIRECTION_COLORS: FaceData<Readonly<[number, number, number]>> = {
    I: [255, 0, 0],
    J: [0, 255, 0],
    K: [0, 0, 255],
    "-I": [255, 255, 0],
    "-J": [255, 0, 255],
    "-K": [0, 255, 255],
} as const;

const DEBUG_VEL_ARROW_CENTER_OFFSET: FaceData<Position> = {
    I: [1.5, 0, 0],
    J: [0, 1.5, 0],
    K: [0, 0, 1.5],
    "-I": [-1.5, 0, 0],
    "-J": [0, -1.5, 0],
    "-K": [0, 0, -1.5],
} as const;

type LineDatum = { sourcePosition: Position; targetPosition: Position };

export class GridCellLayer<TData> extends CompositeLayer<GridCellLayerProps<TData>> {
    static layerName = "TDataLayer";
    static defaultProps = {
        data: { value: [], compare: true },
        velocityScale: 50,
        getCorners: { type: "accessor", value: (cell: any) => cell.corners },
        getNeighborCells: {
            type: "accessor",
            value: (d: any) => d.neighborIndices ?? makeFaceData(-1),
        },
        getFaceVelocities: {
            type: "accessor",
            value: (d: any) => d.faceVelocities ?? makeFaceData([0, 0, 0]),
        },
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
                    visible: this.props.debug?.wireframe,
                }),
            ),

            new TextLayer(
                this.getSubLayerProps({
                    id: "id-corner-index-label",
                    data: this.state.corners,
                    visible: this.props.debug?.cornerIndex,
                    getText: (d, ctx) => String(ctx.index % 8),
                    getSize: 12,
                    getPosition: (d: Position, ctx) => {
                        const cellIndex = Math.floor(ctx.index / 8);
                        const cell = this.props.data[cellIndex];
                        const cellCenter = getCellCenter(applyAccessor(this.props.getCorners, cell));

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
                    getSize: 12,
                    sizeMinPixels: 12,
                    getText: (d: TData, { index }) => index.toString(),
                    getPosition: (d: TData) => getCellCenter(applyAccessor(this.props.getCorners, d)),
                    visible: this.props.debug?.index,
                } as TextLayerProps),
            ),

            // Cell neighbors labels
            ...FACES.map((face) => {
                return new TextLayer(
                    this.getSubLayerProps({
                        id: `id-label-${face}`,
                        data: this.props.data,
                        getSize: 12,
                        sizeMinPixels: 12,
                        background: true,
                        fontSettings: { sdf: true },
                        visible: this.props.debug?.neighborIndex && !["K", "-K"].includes(face),
                        outlineColor: [...DEBUG_DIRECTION_COLORS[face], 255],
                        outlineWidth: 3,

                        getBackgroundColor: [255, 255, 255, 200],
                        getText: (d: TData) => applyAccessor(this.props.getNeighborCells, d)[face].toString(),
                        getPosition: (d: TData) => {
                            const faceCenter = getFaceCenter(applyAccessor(this.props.getCorners, d), face);
                            const cellCenter = getCellCenter(applyAccessor(this.props.getCorners, d));

                            const dx = cellCenter[0] - faceCenter[0];
                            const dy = cellCenter[1] - faceCenter[1];
                            const dz = cellCenter[2]! - faceCenter[2]!;
                            return [faceCenter[0] + dx * 0.7, faceCenter[1] + dy * 0.7, faceCenter[2]! + dz * 0.7];
                        },
                    } as TextLayerProps),
                );
            }),

            // Face velocity arrows
            ...FACES.map((face) => {
                return new SolidPolygonLayer<TData>(
                    this.getSubLayerProps({
                        id: `face-velocity-arrow-${face}`,
                        data: this.props.data,
                        _full3d: true,
                        visible: this.props.debug?.velocity && !["K", "-K"].includes(face),
                        getFillColor: [...DEBUG_DIRECTION_COLORS[face], 255],

                        getPolygon: (d: TData, ctx: AccessorContext<TData>) => {
                            /*
                            const corners = applyAccessor(this.props.getCorners, d, ctx);
                            const faceVelocity = applyAccessor(this.props.getFaceVelocities, d, ctx)[face];

                            const faceCenter = getFaceCenter(corners, face);
                            const cellCenter = getCellCenter(corners);

                            const outwardDir = [faceCenter[0] - cellCenter[0], faceCenter[1] - cellCenter[1], 0];

                            const dx = cellCenter[0] - faceCenter[0];
                            const dy = cellCenter[1] - faceCenter[1];
                            const dz = cellCenter[2]! - faceCenter[2]!;

                            const arrowPosition = [
                                faceCenter[0] + dx * 0.5,
                                faceCenter[1] + dy * 0.5,
                                faceCenter[2]! + dz * 0.5,
                            ] as Position;

                            // console.log(position);

                            const arrowLength = length(fromArray(faceVelocity)) * this.props.velocityScale;
                            // const arrowLength = 100;
                            */

                            const cellCenter = getCellCenter(applyAccessor(this.props.getCorners, d));
                            const faceCenter = getFaceCenter(applyAccessor(this.props.getCorners, d), face);
                            const faceVelocities = applyAccessor(this.props.getFaceVelocities, d, ctx);

                            if (ctx.index === 1503) {
                                console.log(face, faceVelocities);
                            }

                            const velocityVector = faceVelocities[face];
                            const arrowPosition = offsetPosition(faceCenter, DEBUG_VEL_ARROW_CENTER_OFFSET[face]);
                            // const outwardDir =
                            const outwardDir = [faceCenter[0] - cellCenter[0], faceCenter[1] - cellCenter[1], 0];

                            const velocitySign = Math.sign(
                                velocityVector[0] || velocityVector[1] || velocityVector[2] || 1,
                            );
                            const arrowLength =
                                length(fromArray(velocityVector)) * this.props.velocityScale * velocitySign;

                            return makeArrowPolygon(arrowPosition, outwardDir, arrowLength);
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
];

function buildWireframeEdges(corners: Position[]): LineDatum[] {
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

function getCellCenter(corners: Position[]): Position {
    const center: [number, number, number] = [0, 0, 0];

    for (const corner of corners) {
        center[0] += corner[0];
        center[1] += corner[1];
        center[2] += corner[2] ?? 0;
    }

    center[0] /= corners.length;
    center[1] /= corners.length;
    center[2] /= corners.length;

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
