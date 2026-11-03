import type { OrbitViewState } from "@deck.gl/core";
import { OrbitView } from "@deck.gl/core";
import DeckGL from "@deck.gl/react";
import type { Meta, StoryObj } from "@storybook/react";
// import SubsurfaceViewer from "@webviz/subsurface-viewer";
import { AxesLayer } from "@webviz/subsurface-viewer/dist/layers";

import type { AnimatedParticleLayerProps } from "./animatedParticleLayer";
import { GridCellLayer } from "./GridCellLayer";
import type { GridCell } from "./types";

import { AnimatedParticleLayer } from "./";

const GRID_2x2x2: Omit<GridCell, "faceVelocities">[] = [
    {
        index: 0,
        corners: makeCellCorners([-5, -5, 5], 10),
        neighborIndices: [1, 2, -1, -1, -1, 4],
    },
    {
        index: 1,
        corners: makeCellCorners([5, -5, 5], 10),
        neighborIndices: [-1, 3, -1, 0, -1, 5],
    },
    {
        index: 2,
        corners: makeCellCorners([-5, 5, 5], 10),
        neighborIndices: [3, -1, -1, -1, 0, 6],
    },
    {
        index: 3,
        corners: makeCellCorners([5, 5, 5], 10),
        neighborIndices: [-1, -1, -1, 2, 1, 7],
    },
    {
        index: 4,
        corners: makeCellCorners([-5, -5, -5], 10),
        neighborIndices: [5, 6, 0, -1, -1, -1],
    },
    {
        index: 5,
        corners: makeCellCorners([5, -5, -5], 10),
        neighborIndices: [-1, 7, 1, 4, -1, -1],
    },
    {
        index: 6,
        corners: makeCellCorners([-5, 5, -5], 10),
        neighborIndices: [7, -1, 2, -1, -1, -1],
    },
    {
        index: 7,
        corners: makeCellCorners([5, 5, -5], 10),
        neighborIndices: [-1, -1, 3, 6, 5, -1],
    },
];

const GRID_2x2x1: Omit<GridCell, "faceVelocities">[] = [
    {
        index: 0,
        corners: makeCellCorners([-5, -5, 0], 10, 1),
        neighborIndices: [1, 2, -1, -1, -1, -1],
    },
    {
        index: 1,
        corners: makeCellCorners([5, -5, 0], 10, 1),
        neighborIndices: [-1, 3, -1, 0, -1, -1],
    },
    {
        index: 2,
        corners: makeCellCorners([-5, 5, 0], 10, 1),
        neighborIndices: [3, -1, -1, -1, 0, -1],
    },
    {
        index: 3,
        corners: makeCellCorners([5, 5, 0], 10, 1),
        neighborIndices: [-1, -1, -1, 2, 1, -1],
    },
];

const VELOCITIES_EXAMPLE_1 = [
    [
        [1, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
        [1, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
    ],
    [
        [1, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
        [1, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
    ],
    [
        [1, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
        [1, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
    ],
    [
        [1, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
        [1, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
    ],
    [
        [0, 0, 0],
        [0, 1, 0],
        [0, 0, 0],
        [0, 0, 0],
        [0, 1, 0],
        [0, 0, 0],
    ],
    [
        [0, 0, 0],
        [0, 1, 0],
        [0, 0, 0],
        [0, 0, 0],
        [0, 1, 0],
        [0, 0, 0],
    ],
    [
        [0, 0, 0],
        [0, 1, 0],
        [0, 0, 0],
        [0, 0, 0],
        [0, 1, 0],
        [0, 0, 0],
    ],
    [
        [0, 0, 0],
        [0, 1, 0],
        [0, 0, 0],
        [0, 0, 0],
        [0, 1, 0],
        [0, 0, 0],
    ],
];

const VELOCITIES_EXAMPLE_CIRCULAR = [
    [
        [1, 0, 0],
        [0, -1, 0],
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
    ],
    [
        [0, 0, 0],
        [0, 1, 0],
        [0, 0, 0],
        [1, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
    ],
    [
        [-1, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
        [0, -1, 0],
        [0, 0, 0],
    ],
    [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
        [-1, 0, 0],
        [0, 1, 0],
        [0, 0, 0],
    ],
];

type AnimatedParticleLayerStoryProps = AnimatedParticleLayerProps & {
    showAxes: boolean;
    showDebugGrid: boolean;
};

type Story = StoryObj<AnimatedParticleLayerStoryProps>;
const meta: Meta<AnimatedParticleLayerStoryProps> = {
    args: {
        numParticles: 10_000,
        paused: false,
        showAxes: true,
        showDebugGrid: true,
        grid: [],
    },
    // component: AnimatedParticleLayer,
    title: "CustomDeckGlLayers/AnimatedParticleLayer",
    render: (args) => {
        const { showAxes, showDebugGrid, ...particleLayerProps } = args;
        const layers = [
            new AxesLayer({
                id: "axes",
                bounds: [15, 15, 15, -15, -15, -15],
                ZIncreasingDownwards: false,
                visible: showAxes,
            }),

            new GridCellLayer({
                id: "grid-cells",
                data: args.grid,
                visible: showDebugGrid,
            }),

            new AnimatedParticleLayer({
                ...particleLayerProps,
                id: "animated-particle-layer",
            }),
        ];

        const viewState: OrbitViewState = {
            target: [0, 0, 0],
            zoom: 4.5,
            rotationX: 20,
            rotationOrbit: -30,
        };

        return (
            <div style={{ width: "100%", height: "1000px" }}>
                <DeckGL initialViewState={viewState} controller={true} layers={layers} views={new OrbitView()} />
            </div>
        );
    },
};

export default meta;

export const Default: Story = {
    args: {
        grid: getGridWithVelocities(GRID_2x2x2, VELOCITIES_EXAMPLE_1),
    },
};

export const InwardVelocity: Story = {
    args: {
        grid: [
            {
                index: 0,
                corners: makeCellCorners([0, 0, 0], 10),
                neighborIndices: [-1, -1, -1, -1, -1, -1],
                faceVelocities: [
                    [-1, 0, 0],
                    [0, -1, 0],
                    [0, 0, -1],
                    [1, 0, 0],
                    [0, 1, 0],
                    [0, 0, 1],
                ],
            },
        ],
    },
};

export const Circular: Story = {
    args: {
        grid: getGridWithVelocities(GRID_2x2x1, VELOCITIES_EXAMPLE_CIRCULAR),
    },
};

function makeCellCorners(center: number[], size: number, sizeZ?: number): number[][] {
    return [
        [center[0] - size / 2, center[1] - size / 2, center[2] - (sizeZ ?? size) / 2],
        [center[0] + size / 2, center[1] - size / 2, center[2] - (sizeZ ?? size) / 2],
        [center[0] - size / 2, center[1] + size / 2, center[2] - (sizeZ ?? size) / 2],
        [center[0] + size / 2, center[1] + size / 2, center[2] - (sizeZ ?? size) / 2],
        [center[0] - size / 2, center[1] - size / 2, center[2] + (sizeZ ?? size) / 2],
        [center[0] + size / 2, center[1] - size / 2, center[2] + (sizeZ ?? size) / 2],
        [center[0] - size / 2, center[1] + size / 2, center[2] + (sizeZ ?? size) / 2],
        [center[0] + size / 2, center[1] + size / 2, center[2] + (sizeZ ?? size) / 2],
    ];
}

function getGridWithVelocities(grid: Omit<GridCell, "faceVelocities">[], velocities: number[][][]): GridCell[] {
    return grid.map((cell, index) => {
        const cellVelocities = velocities[index];
        if (!cellVelocities) {
            throw new Error(`No velocities provided for cell at index ${index}`);
        }
        return {
            ...cell,
            faceVelocities: cellVelocities,
        };
    });
}
