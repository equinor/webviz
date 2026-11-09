import React from "react";

import { OrbitView } from "@deck.gl/core";
import type { Meta, StoryObj } from "@storybook/react";
import SubsurfaceViewer from "@webviz/subsurface-viewer";
import type { BoundingBox3D, ViewportType } from "@webviz/subsurface-viewer";
import { AxesLayer } from "@webviz/subsurface-viewer/dist/layers";
import { defaults } from "lodash-es";

import { Button } from "@lib/components/Button";

import type { AnimatedParticleLayerProps } from "./animatedParticleLayer";
import { GridCellLayer } from "./GridCellLayer";
import type { FaceData, GridCell } from "./types";
import { makeFaceData } from "./utils";

import { AnimatedParticleLayer } from "./";

const GRID_2x2x2: Omit<GridCell, "faceVelocities">[] = [
    {
        index: 0,
        corners: makeCellCorners([-5, -5, 5], 10),
        neighborIndices: { I: 1, J: 2, K: -1, "-I": -1, "-J": -1, "-K": 4 },
    },
    {
        index: 1,
        corners: makeCellCorners([5, -5, 5], 10),
        neighborIndices: { I: -1, J: 3, K: -1, "-I": 0, "-J": -1, "-K": 5 },
    },
    {
        index: 2,
        corners: makeCellCorners([-5, 5, 5], 10),
        neighborIndices: { I: 3, J: -1, K: -1, "-I": -1, "-J": 0, "-K": 6 },
    },
    {
        index: 3,
        corners: makeCellCorners([5, 5, 5], 10),
        neighborIndices: { I: -1, J: -1, K: -1, "-I": 2, "-J": 1, "-K": 7 },
    },
    {
        index: 4,
        corners: makeCellCorners([-5, -5, -5], 10),
        neighborIndices: { I: 5, J: 6, K: 0, "-I": -1, "-J": -1, "-K": -1 },
    },
    {
        index: 5,
        corners: makeCellCorners([5, -5, -5], 10),
        neighborIndices: { I: -1, J: 7, K: 1, "-I": 4, "-J": -1, "-K": -1 },
    },
    {
        index: 6,
        corners: makeCellCorners([-5, 5, -5], 10),
        neighborIndices: { I: 7, J: -1, K: 2, "-I": -1, "-J": -1, "-K": -1 },
    },
    {
        index: 7,
        corners: makeCellCorners([5, 5, -5], 10),
        neighborIndices: { I: -1, J: -1, K: 3, "-I": 6, "-J": 5, "-K": -1 },
    },
];

const GRID_FLAT_2x2: Omit<GridCell, "faceVelocities">[] = [
    {
        index: 0,
        corners: makeCellCorners([5, -5, 0], 10, 1),
        neighborIndices: { I: -1, J: 2, K: -1, "-I": 1, "-J": -1, "-K": -1 },
    },
    {
        index: 1,
        corners: makeCellCorners([-5, -5, 0], 10, 1),
        neighborIndices: { I: 0, J: 3, K: -1, "-I": -1, "-J": -1, "-K": -1 },
    },
    {
        index: 2,
        corners: makeCellCorners([5, 5, 0], 10, 1),
        neighborIndices: { I: -1, J: -1, K: -1, "-I": 3, "-J": 0, "-K": -1 },
    },
    {
        index: 3,
        corners: makeCellCorners([-5, 5, 0], 10, 1),
        neighborIndices: { I: -1, J: -1, K: -1, "-I": 2, "-J": 1, "-K": -1 },
    },
];

type AnimatedParticleLayerStoryProps = AnimatedParticleLayerProps<any> & {
    showAxes: boolean;
    showDebugGrid: boolean;
    velocities: FaceData<number[]>[];
    bounds: BoundingBox3D;
    viewState: Partial<ViewportType>;
};

type Story = StoryObj<AnimatedParticleLayerStoryProps>;
const meta: Meta<AnimatedParticleLayerStoryProps> = {
    title: "CustomDeckGlLayers/AnimatedParticleLayer",
    decorators: [
        // ! Initial load for setting up the layer resources is a little heavy, so we only show
        // ! the default story initially, to avoid stuttering when navigating to the story
        function DocsPlayButton(StoryFn, context) {
            const [displayStory, setDisplayStory] = React.useState(
                () => context.viewMode === "story" || context.name === "Default",
            );

            if (!displayStory) {
                return (
                    <Button
                        size="large"
                        layoutClassName="absolute top-1/2 left-1/2 -translate-1/2"
                        onClick={() => setDisplayStory(true)}
                    >
                        Load story
                    </Button>
                );
            }
            return (
                <div className="relative h-full w-full">
                    <StoryFn />
                    {context.viewMode === "docs" && (
                        <Button
                            size="small"
                            variant="outlined"
                            layoutClassName="absolute top-0 right-0"
                            onClick={() => setDisplayStory(false)}
                        >
                            Unload
                        </Button>
                    )}
                </div>
            );
        },

        (StoryFn) => (
            <div style={{ width: "100%", height: "1000px" }} onContextMenu={(evt) => evt.preventDefault()}>
                <StoryFn />
            </div>
        ),
    ],

    args: {
        size: 1,
        numParticles: 10_000,
        velocityScale: 1,
        paused: false,
        showAxes: true,
        showDebugGrid: true,
        data: [],
        bounds: [15, 15, 15, -15, -15, -15],
        viewState: {
            id: "v1",
            target: [0, 0],
            zoom: 4.5,
            rotationX: 20,
            rotationOrbit: -30,
        },
    },
    render: (args) => {
        const { viewState: viewStateArgs, bounds, velocities, showAxes, showDebugGrid, ...particleLayerProps } = args;

        if (velocities) {
            particleLayerProps.getFaceVelocities = (d, { index }) => velocities[index] ?? makeFaceData([0, 0, 0]);
        }

        const viewState = defaults({ rotationX: 60, rotationOrbit: -30 }, viewStateArgs);

        const layers = [
            new AxesLayer({
                id: "axes",
                bounds: bounds,
                ZIncreasingDownwards: false,
                visible: showAxes,
            }),

            new GridCellLayer({
                ...particleLayerProps,
                id: "grid-cells",
                data: args.data,

                debug: {
                    wireframe: true,
                    neighborIndex: showDebugGrid,
                    // velocity: showDebugGrid,
                    cornerIndex: showDebugGrid,
                    index: showDebugGrid,
                },
            }),

            new AnimatedParticleLayer({
                ...particleLayerProps,
                id: "animated-particle-layer",
            }),
        ];

        return (
            <SubsurfaceViewer
                id={"TEST"}
                layers={layers}
                views={{
                    layout: [1, 1],
                    viewports: [
                        {
                            ...viewState,
                            id: "view-1",
                            viewType: OrbitView,
                        },
                    ],
                }}
            />
        );
    },
};

export default meta;

export const Default: Story = {
    args: {
        data: GRID_2x2x2,
        velocityScale: 0.1,

        velocities: [
            {
                I: [1, 0, 0],
                J: [0, 0, 0],
                K: [0, 0, 0],
                "-I": [1, 0, 0],
                "-J": [0, 0, 0],
                "-K": [0, 0, 0],
            },

            {
                I: [1, 0, 0],
                J: [0, 0, 0],
                K: [0, 0, 0],
                "-I": [1, 0, 0],
                "-J": [0, 0, 0],
                "-K": [0, 0, 0],
            },

            {
                I: [1, 0, 0],
                J: [0, 0, 0],
                K: [0, 0, 0],
                "-I": [1, 0, 0],
                "-J": [0, 0, 0],
                "-K": [0, 0, 0],
            },

            {
                I: [1, 0, 0],
                J: [0, 0, 0],
                K: [0, 0, 0],
                "-I": [1, 0, 0],
                "-J": [0, 0, 0],
                "-K": [0, 0, 0],
            },

            {
                I: [0, 0, 0],
                J: [0, 1, 0],
                K: [0, 0, 0],
                "-I": [0, 0, 0],
                "-J": [0, 1, 0],
                "-K": [0, 0, 0],
            },

            {
                I: [0, 0, 0],
                J: [0, 1, 0],
                K: [0, 0, 0],
                "-I": [0, 0, 0],
                "-J": [0, 1, 0],
                "-K": [0, 0, 0],
            },

            {
                I: [0, 0, 0],
                J: [0, 1, 0],
                K: [0, 0, 0],
                "-I": [0, 0, 0],
                "-J": [0, 1, 0],
                "-K": [0, 0, 0],
            },

            {
                I: [0, 0, 0],
                J: [0, 1, 0],
                K: [0, 0, 0],
                "-I": [0, 0, 0],
                "-J": [0, 1, 0],
                "-K": [0, 0, 0],
            },
        ],
    },
};

export const InwardVelocity: Story = {
    args: {
        data: [
            {
                index: 0,
                corners: makeCellCorners([0, 0, 0], 10),
            },
        ],
        velocityScale: 0.1,
        velocities: [
            {
                I: [-1, 0, 0],
                J: [0, -1, 0],
                K: [0, 0, -1],
                "-I": [1, 0, 0],
                "-J": [0, 1, 0],
                "-K": [0, 0, 1],
            },
        ],
    },
};

export const Circular: Story = {
    args: {
        data: GRID_FLAT_2x2,
        velocityScale: 0.1,
        velocities: [
            {
                I: [0, 0, 0],
                J: [0, 1, 0],
                K: [0, 0, 0],
                "-I": [1, 0, 0],
                "-J": [0, 0, 0],
                "-K": [0, 0, 0],
            },
            {
                I: [1, 0, 0],
                J: [0, -1, 0],
                K: [0, 0, 0],
                "-I": [0, 0, 0],
                "-J": [0, 0, 0],
                "-K": [0, 0, 0],
            },

            {
                I: [0, 0, 0],
                J: [0, 0, 0],
                K: [0, 0, 0],
                "-I": [-1, 0, 0],
                "-J": [0, 1, 0],
                "-K": [0, 0, 0],
            },
            {
                I: [-1, 0, 0],
                J: [0, 0, 0],
                K: [0, 0, 0],
                "-I": [0, 0, 0],
                "-J": [0, -1, 0],
                "-K": [0, 0, 0],
            },
        ],
    },
};

export const TimeToLive: Story = {
    args: {
        numParticles: 100,
        data: [
            {
                index: 0,
                corners: makeCellCorners([-4, 0, 0], 5),
            },
            {
                index: 1,
                corners: makeCellCorners([4, 0, 0], 5),
            },
        ],
    },
};

export const RealWorldCoordinate: Story = {
    parameters: {
        docs: {
            description: {
                story: "The `Dialog.Header` wraps the title area and draws a bottom border to separate it from the Body.",
                component: "The diakgapoa wapas",
            },
        },
    },
    args: {
        data: [
            {
                neighborIndices: { I: 1, "-I": -1, J: 2, "-J": -1, K: -1, "-K": -1 },
                corners: [
                    [462601.78125, 5934251.5, -1646.3985595703125],
                    [462744.59375, 5934337, -1660.2677001953125],
                    [462677.8125, 5934117.5, -1643.031494140625],
                    [462818.78125, 5934201.5, -1653.8624267578125],
                    [462600.78125, 5934251.5, -1649.465576171875],
                    [462745.1875, 5934338, -1663.465576171875],
                    [462676.875, 5934117, -1646.10400390625],
                    [462819.5, 5934202.5, -1657.1429443359375],
                ],
            },
            {
                neighborIndices: { I: -1, "-I": 0, J: 3, "-J": -1, K: -1, "-K": -1 },
                corners: [
                    [462744.59375, 5934337, -1660.2677001953125],
                    [462881.9375, 5934417, -1668.918212890625],
                    [462818.78125, 5934201.5, -1653.8624267578125],
                    [462954.6875, 5934282, -1663.928466796875],
                    [462745.1875, 5934338, -1663.465576171875],
                    [462883.65625, 5934419, -1672.1883544921875],
                    [462819.5, 5934202.5, -1657.1429443359375],
                    [462956.625, 5934284, -1667.326904296875],
                ],
            },
            {
                neighborIndices: { I: 3, "-I": -1, J: -1, "-J": 0, K: -1, "-K": -1 },
                corners: [
                    [462677.8125, 5934117.5, -1643.031494140625],
                    [462818.78125, 5934201.5, -1653.8624267578125],
                    [462753.25, 5933984, -1642.86279296875],
                    [462894, 5934069, -1652.740478515625],
                    [462676.875, 5934117, -1646.10400390625],
                    [462819.5, 5934202.5, -1657.1429443359375],
                    [462752.4375, 5933982.5, -1646.078125],
                    [462894.90625, 5934069.5, -1656.164306640625],
                ],
            },
            {
                neighborIndices: { I: -1, "-I": 2, J: -1, "-J": 1, K: -1, "-K": -1 },
                corners: [
                    [462818.78125, 5934201.5, -1653.8624267578125],
                    [462954.6875, 5934282, -1663.928466796875],
                    [462894, 5934069, -1652.740478515625],
                    [463030.5, 5934151, -1665.03564453125],
                    [462819.5, 5934202.5, -1657.1429443359375],
                    [462956.625, 5934284, -1667.326904296875],
                    [462894.90625, 5934069.5, -1656.164306640625],
                    [463032.75, 5934152.5, -1668.5826416015625],
                ],
            },
        ],

        velocities: [
            {
                I: [-0.04412866429065398, 0, 0],
                J: [0, 0.04467045208527849, 0],
                K: [0, 0, 0],
                "-I": [-0.09783887173841858, 0, 0],
                "-J": [0, 0.02695854759554906, 0],
                "-K": [0, 0, 0],
            },
            {
                I: [-0.00568849500549626, 0, 0],
                J: [0, 0.041935070558972505, 0],
                K: [0, 0, 0],
                "-I": [-0.04412866429065398, 0, 0],
                "-J": [0, 0.02717259310745657, 0],
                "-K": [0, 0, 0],
            },
            {
                I: [-0.03933215091712189, 0, 0],
                J: [0, 0.017939233214137148, 0],
                K: [0, 0, 0],
                "-I": [-0.08101599246301458, 0, 0],
                "-J": [0, 0.04467045208527849, 0],
                "-K": [0, 0, 0],
            },
            {
                I: [0.000020461480164869616, 0, 0],
                J: [0, 0.020367533955716107, 0],
                K: [0, 0, 0],
                "-I": [-0.03933215091712189, 0, 0],
                "-J": [0, 0.041935070558972505, 0],
                "-K": [0, 0, 0],
            },
        ],

        bounds: [462610, 5933984, -1672.1883544921875, 463032, 5934419, -1657.1429443359375],

        viewState: {
            id: "v1",
            target: [462800, 5934200],
            zoom: 1,
        },
    },
};

export const ShiftedRealWorldCoordinate: Story = {
    args: {
        // coordinateSystem: "meter-offsets",
        // coordinateOrigin: [0, 200, -1691],
        velocityScale: 1,
        data: [
            {
                corners: [
                    [63.6875, 135.5, -1691.504638671875],
                    [193.875, 211, -1694.681640625],
                    [138.5, 6, -1691.30126953125],
                    [268.84375, 81.5, -1695.8712158203125],
                    [63.6875, 135.5, -1692.9366455078125],
                    [193.84375, 211, -1696.12109375],
                    [138.5, 6, -1692.72509765625],
                    [268.8125, 81.5, -1697.298095703125],
                ],
            },
        ],

        velocities: [
            {
                // "-I": [-6.655531618299828, -3.95948073978119, 0.21726985515999367],
                "-I": [-6.655531618299828, 0, 0],
                "-J": [0, 0, 0],
                // "-J": [8.96323481829317, -15.468163149517872, -0.8397217193420029],
                "-K": [0, 0, -0],
                // I: [-14.669757305686364, -8.727270012424256, 0.47889428340706136],
                I: [-14.669757305686364, 0, 0],
                J: [0, 0, 0],
                // J: [7.016497103138533, -12.108610800641022, -0.6573413651041268],
                K: [0, 0, 0],
            },
        ],

        bounds: [63.6875, 6, -1697.298095703125, 268.84375, 211, -1691.30126953125],
        viewState: {
            target: [166.265625, 108.5],
            zoom: 2,
            rotationX: 60,
            rotationOrbit: -30,
        },
    },
};

function makeCellCorners(center: number[], size: number, sizeZ?: number): number[][] {
    return [
        [center[0] - size / 2, center[1] - size / 2, center[2] + (sizeZ ?? size) / 2],
        [center[0] + size / 2, center[1] - size / 2, center[2] + (sizeZ ?? size) / 2],
        [center[0] - size / 2, center[1] + size / 2, center[2] + (sizeZ ?? size) / 2],
        [center[0] + size / 2, center[1] + size / 2, center[2] + (sizeZ ?? size) / 2],
        [center[0] - size / 2, center[1] - size / 2, center[2] - (sizeZ ?? size) / 2],
        [center[0] + size / 2, center[1] - size / 2, center[2] - (sizeZ ?? size) / 2],
        [center[0] - size / 2, center[1] + size / 2, center[2] - (sizeZ ?? size) / 2],
        [center[0] + size / 2, center[1] + size / 2, center[2] - (sizeZ ?? size) / 2],
    ];
}
