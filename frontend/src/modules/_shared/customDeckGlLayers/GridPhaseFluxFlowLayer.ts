import type { CompositeLayerProps, DefaultProps, Layer, LayersList, UpdateParameters } from "@deck.gl/core";
import { CompositeLayer } from "@deck.gl/core";
import { range } from "lodash-es";

import { cross, fromArray, length, subtract, type Vec3 } from "@lib/utils/vec3";

import type { GridCellFluxData, GridCellFluxPhaseFlux } from "../DataProviderFramework/visualization/utils/types";
import type { Direction, Phase } from "../types/grid";

import { AnimatedParticleLayer } from "./AnimatedParticleLayer";
import type { GridCellLayerProps } from "./AnimatedParticleLayer/GridCellLayer";
import { GridCellLayer } from "./AnimatedParticleLayer/GridCellLayer";
import { FACE_VELOCITY_VECTOR, type FaceData, type GridCell } from "./AnimatedParticleLayer/types";
import { makeFaceData, mapFaceData } from "./AnimatedParticleLayer/utils";

export enum SubLayerId {
    CELL_CENTERS = "cellCenters",
    PARTICLES = "particles",

    WATER_VELOCITY = "waterVelocity",
    OIL_VELOCITY = "oilVelocity",
    GAS_VELOCITY = "gasVelocity",
}

export type GridPhaseFluxFlowLayerProps = CompositeLayerProps & {
    data: GridCellFluxData | null;
    // phasesShown: Partial<FluxPhasesShownSetting>;
    phase: Phase;
    // numParticles: 1000;
    velocityScale: number;

    debug?: GridCellLayerProps["debug"];
};

const DIRECTION_TO_FLUX_KEY_MAP: Record<Direction, keyof GridCellFluxPhaseFlux> = {
    i: "iFaceFlux",
    j: "jFaceFlux",
    k: "kFaceFlux",
};

const I_PLUS_FACE_CORNERS: readonly number[] = [1, 3, 5, 7];
const I_MINUS_FACE_CORNERS: readonly number[] = [0, 2, 4, 6];

const J_PLUS_FACE_CORNERS: readonly number[] = [2, 3, 6, 7];
const J_MINUS_FACE_CORNERS: readonly number[] = [0, 1, 4, 5];

const K_PLUS_FACE_CORNERS: readonly number[] = [0, 1, 2, 3]; // base ring -- "K+" = into the layer below
const K_MINUS_FACE_CORNERS: readonly number[] = [4, 5, 6, 7]; // base ring -- "K-" = into the layer above

type ParticleData = {
    cell: number | null;
    age: number;

    // Relative cell position
    u: number;
    v: number;
    w: number;
};

export class GridPhaseFluxFlowLayer extends CompositeLayer<GridPhaseFluxFlowLayerProps> {
    static defaultProps: DefaultProps<GridPhaseFluxFlowLayerProps> = {
        velocityScale: 1,
    };

    declare state: {
        // World pos
        cellCenters: Vec3[];
        // For 2D, z value is ignored
        // cellPhaseVelocities: Record<Phase, Vec3[]>;
        // cellPhaseVelocities: Record<Phase, Vec3>[];

        cellOilVelocities: Vec3[];
        cellGasVelocities: Vec3[];
        cellWaterVelocities: Vec3[];

        cellIndices: number[];

        // maxVelocity: number

        cellData: GridCell[];
        velocities: FaceData<number[]>[];

        particles: ParticleData[];

        // DEBUG_POLYGONS: { polygon: number[][]; color: number[] }[];
        DEBUG_POLYGONS: { polygon: number[][]; color: number[] }[];
        DEBUG_CENTERS: Vec3[];
    };

    updateState({
        props,
        changeFlags,
    }: UpdateParameters<Layer<GridPhaseFluxFlowLayerProps & Required<CompositeLayerProps>>>): void {
        if (!changeFlags.dataChanged) return;

        if (!props.data) {
            this.setState({
                cellVelocities: [],
                cellIndices: [],
            });
            return;
        }

        const { nx, ny, activeUint8Arr, cellCornersFloat32Arr, phaseFlux } = props.data;
        // const visiblePhase = phaseFlux[props.phase];

        // const centerPoints = computeCellCenters(props.data);

        // const cellCenterPoints: Vec3[] = [];
        // const particles: ParticleData[] = [];

        // TODO: Handle inactive cells...
        const cellData: Partial<GridCell>[] = [];
        const velocities: FaceData<number[]>[] = [];
        // const phaseVelocities: Record<Phase, Vec3>[] = [];

        // const oilVelocities = [];
        // const gasVelocities = [];
        // const waterVelocities = [];

        // const particles = range()
        // const DEBUG_POLYGONS: { polygon: number[][]; color: number[] }[] = [];
        // const DEBUG_CENTERS: Vec3[] = [];

        for (let cellIndex = 0; cellIndex < nx * ny; cellIndex++) {
            // TODO
            // Inactive cells have been excluded from the simulation, and can be ignored
            // if (!activeUint8Arr[cellIndex]) {
            //     continue;
            // }

            const cellNeighborIndices = getCellNeighborIndices(cellIndex, nx, ny, props.data.k, activeUint8Arr);
            // TODO: Check for faults / inactive neighbors
            //

            // const iFacePlus = getFace("i", cellIndex);
            // const jFacePlus = getFlux("j", cellIndex);
            // const iFaceMinus = getFlux("i", cellNeighborIndices.iMinus) * -1;
            // const jFaceMinus = getFlux("j", cellNeighborIndices.jMinus) * -1;

            // const cellCenter = getCellCenter(cellCornersFloat32Arr, cellIndex);

            const faceCorners = getCellFaces(cellCornersFloat32Arr, cellIndex);

            if (!activeUint8Arr[cellIndex]) {
                velocities.push(makeFaceData([0, 0, 0]));
            } else {
                const faceFluxes: FaceData<number> = {
                    I: getFlux(phaseFlux, props.phase, "i", cellIndex),
                    J: getFlux(phaseFlux, props.phase, "j", cellIndex),
                    K: 0,
                    // ! Positive values flows **inwards**, so we flip these
                    "-I": getFlux(phaseFlux, props.phase, "i", cellNeighborIndices["-I"]) * -1,
                    "-J": getFlux(phaseFlux, props.phase, "j", cellNeighborIndices["-J"]) * -1,
                    "-K": 0,
                };

                const faceVelocities = mapFaceData(faceFluxes, (flux, face) => {
                    const corners = faceCorners[face];
                    const faceArea = computeFaceArea(corners);

                    return FACE_VELOCITY_VECTOR[face].map((c) => (c * flux) / faceArea);
                });

                velocities.push(faceVelocities);
            }

            cellData.push({
                corners: getCellCorners(cellCornersFloat32Arr, cellIndex),
                neighborIndices: cellNeighborIndices,
            });
        }

        this.setState({
            cellData,
            velocities,
        });
    }

    renderLayers(): Layer | null | LayersList {
        return [
            new AnimatedParticleLayer({
                ...this.getSubLayerProps({ id: "particles" }),
                data: this.state.cellData,
                numParticles: 100_000,
                maxAge: 4,
                size: 3,
                flat: true,

                // expose as settings
                velocityScale: 5,

                getFaceVelocities: (d, { index }) => this.state.velocities[index],
            }),
            new GridCellLayer({
                ...this.getSubLayerProps({ id: "cell-visualizer" }),
                data: this.state.cellData,
                debug: this.props.debug,
                getFaceVelocities: (d, { index }) => this.state.velocities[index],
            }),
        ];
    }
}

function getCellFaces(cellCornersFloat32Arr: Float32Array, cellIndex: number): FaceData<number[][]> {
    return {
        I: I_PLUS_FACE_CORNERS.map((corner) => getCellCorner(cellCornersFloat32Arr, cellIndex, corner)),
        "-I": I_MINUS_FACE_CORNERS.map((corner) => getCellCorner(cellCornersFloat32Arr, cellIndex, corner)),
        J: J_PLUS_FACE_CORNERS.map((corner) => getCellCorner(cellCornersFloat32Arr, cellIndex, corner)),
        "-J": J_MINUS_FACE_CORNERS.map((corner) => getCellCorner(cellCornersFloat32Arr, cellIndex, corner)),
        K: K_PLUS_FACE_CORNERS.map((corner) => getCellCorner(cellCornersFloat32Arr, cellIndex, corner)),
        "-K": K_MINUS_FACE_CORNERS.map((corner) => getCellCorner(cellCornersFloat32Arr, cellIndex, corner)),
    };
}

function getFlux(fluxes: GridCellFluxData["phaseFlux"], phase: Phase, direction: Direction, cellIndex: number) {
    if (cellIndex === -1) return 0;
    if (!fluxes[phase]) return 0;

    const fluxKey = DIRECTION_TO_FLUX_KEY_MAP[direction];
    return fluxes[phase][fluxKey][cellIndex];
}

function getCellCorners(cellCornersFloat32Arr: Float32Array, cellIndex: number): number[][] {
    return range(0, 8).map((corner) => getCellCorner(cellCornersFloat32Arr, cellIndex, corner));
}

// Grid Z is depth (increasing downward, TVD-style); negate for a Z-up world, same
// convention makeGridCellFluxBoundingBox uses and that Grid3DLayer applies internally
// via its own ZIncreasingDownwards flag -- LineLayer/SolidPolygonLayer/TextLayer have
// no equivalent, so it has to happen here instead.
function getCellCorner(cellCornersFloat32Arr: Float32Array, cellIndex: number, corner: number): number[] {
    const offset = cellIndex * 24 + corner * 3;
    return [cellCornersFloat32Arr[offset], cellCornersFloat32Arr[offset + 1], -cellCornersFloat32Arr[offset + 2]];
}

function computeFaceArea(corners: number[][]) {
    /*
        0     1
           
        2     3
    */

    // The face is an irregular polygon. It's area is the sum of the two triangles it makes
    const triangle1 = [corners[0], corners[1], corners[2]];
    const triangle2 = [corners[1], corners[2], corners[3]];

    return computeTriangleArea(triangle1) + computeTriangleArea(triangle2);
    // return 20;
}
function computeTriangleArea(corners: number[][]) {
    /*
           0

        2     1
    */

    const [v0, v1, v2] = corners.map(fromArray);

    const ab = subtract(v1, v0);
    const ac = subtract(v2, v0);

    const crossP = cross(ab, ac);

    return length(crossP) * 0.5;
}

function getCellNeighborIndices(
    cellIndex: number,
    nx: number,
    ny: number,
    k: number,
    activeCells: Uint8Array<ArrayBufferLike>,
): FaceData<number> {
    function ifActive(idx: number) {
        if (activeCells[idx]) return idx;
        return -1;
    }

    // prettier-ignore
    return {
          I:  cellIndex + 1 < nx * ny  ? ifActive(cellIndex + 1) : -1,
        "-I": cellIndex - 1 >= 0       ? ifActive(cellIndex - 1) : -1,
          J:  cellIndex + nx < nx * ny ? ifActive(cellIndex + nx) : -1,
        "-J": cellIndex - nx >= 0      ? ifActive(cellIndex - nx) : -1,
          K:  k + 1 < k                ? ifActive(cellIndex + nx * ny) : -1,
        "-K": k - 1 >= 0               ? ifActive(cellIndex - nx * ny) : -1,
    };
}
