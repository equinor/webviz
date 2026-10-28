import { OrbitView } from "@deck.gl/core";
import type { Meta, StoryObj } from "@storybook/react";
import SubsurfaceViewer from "@webviz/subsurface-viewer";
import { AxesLayer } from "@webviz/subsurface-viewer/dist/layers";

import type { AnimatedParticleLayerProps } from "./animatedParticleLayer";
import { GridCellLayer } from "./GridCellLayer";
import type { GridCell } from "./types";

import { AnimatedParticleLayer } from "./";

const GRID_CELLS: Partial<GridCell>[] = [
    // Above
    {
        index: 0,
        neighborIndices: [1, 2, -1, -1, -1, 4],
        faceVelocities: [
            [1, 0, 0],
            [0, 0, 0],
            [0, 0, 0],
            [1, 0, 0],
            [0, 0, 0],
            [0, 0, 0],
        ],
        // prettier-ignore
        corners: [
            [-10, -10,   0],
            [  0, -10,   0],
            [-10,   0,   0],
            [  0,   0,   0],
            [-10, -10,  10],
            [  0, -10,  10],
            [-10,   0,  10],
            [  0,   0,  10],
        ],
    },
    {
        index: 1,
        // neighborIndices: [-1, 0, 3, -1, -1, 5],
        neighborIndices: [-1, 3, -1, 0, -1, 5],
        faceVelocities: [
            [1, 0, 0],
            [0, 0, 0],
            [0, 0, 0],
            [1, 0, 0],
            [0, 0, 0],
            [0, 0, 0],
        ],
        // prettier-ignore
        corners: [
            [  0, -10,   0],
            [ 10, -10,   0],
            [  1,   0,   1],
            [ 10,   0,   0],
            [  0, -10,  10],
            [ 10, -10,  10],
            [  0,   0,  10],
            [ 10,   0,  10],
        ],
    },
    {
        index: 2,
        neighborIndices: [3, -1, -1, -1, 0, 6],
        faceVelocities: [
            [1, 0, 0],
            [0, 0, 0],
            [0, 0, 0],
            [1, 0, 0],
            [0, 0, 0],
            [0, 0, 0],
        ],
        // prettier-ignore
        corners: [
            [-10,   0,   0],
            [  0,   0,   0],
            [-10,  10,   0],
            [  0,  10,   0],
            [-10,   0,  10],
            [  0,   0,  10],
            [-10,  10,  10],
            [  0,  10,  10],
        ],
    },
    {
        index: 3,
        neighborIndices: [-1, -1, -1, 2, 1, 7],
        faceVelocities: [
            [1, 0, 0],
            [0, 0, 0],
            [0, 0, 0],
            [1, 0, 0],
            [0, 0, 0],
            [0, 0, 0],
        ],
        // prettier-ignore
        corners: [
            [  0,   0,   0],
            [ 10,   0,   0],
            [  0,  10,   0],
            [ 10,  10,   0],
            [  0,   0,  10],
            [ 10,   0,  10],
            [  0,  10,  10],
            [ 10,  10,  10],
        ],
    },

    // // Below
    // {
    //     index: 4,
    //     neighborIndices: [5, 6, 0, -1, -1, -1],
    //     faceVelocities: [
    //         [1, 0, 0],
    //         [0, 0, 0],
    //         [0, 0, 0],
    //         [1, 0, 0],
    //         [0, 0, 0],
    //         [0, 0, 0],
    //     ],
    //     // prettier-ignore
    //     corners: [
    //         [-10, -10, -10],
    //         [  0, -10, -10],
    //         [-10,   0, -10],
    //         [  0,   0, -10],
    //         [-10, -10,   0],
    //         [  0, -10,   0],
    //         [-10,   0,   0],
    //         [  0,   0,   0],
    //     ],
    // },
    // {
    //     index: 5,
    //     neighborIndices: [-1, 7, 1, 4, -1, -1],
    //     faceVelocities: [
    //         [1, 0, 0],
    //         [0, 0, 0],
    //         [0, 0, 0],
    //         [1, 0, 0],
    //         [0, 0, 0],
    //         [0, 0, 0],
    //     ],
    //     // prettier-ignore
    //     corners: [
    //         [  0, -10, -10],
    //         [ 10, -10, -10],
    //         [  0,   0, -10],
    //         [ 10,   0, -10],
    //         [  0, -10,   0],
    //         [ 10, -10,   0],
    //         [  0,   0,   0],
    //         [ 10,   0,   0],
    //     ],
    // },
    // {
    //     index: 6,
    //     neighborIndices: [7, -1, 2, -1, -1, -1],
    //     faceVelocities: [
    //         [1, 0, 0],
    //         [0, 0, 0],
    //         [0, 0, 0],
    //         [1, 0, 0],
    //         [0, 0, 0],
    //         [0, 0, 0],
    //     ],
    //     // prettier-ignore
    //     corners: [
    //         [-10,   0, -10],
    //         [  0,   0, -10],
    //         [-10,  10, -10],
    //         [  0,  10, -10],
    //         [-10,   0,   0],
    //         [  0,   0,   0],
    //         [-10,  10,   0],
    //         [  0,  10,   0],
    //     ],
    // },
    // {
    //     index: 7,
    //     neighborIndices: [-1, -1, 3, 6, 5, -1],
    //     faceVelocities: [
    //         [1, 0, 0],
    //         [0, 0, 0],
    //         [0, 0, 0],
    //         [1, 0, 0],
    //         [0, 0, 0],
    //         [0, 0, 0],
    //     ],
    //     // prettier-ignore
    //     corners: [
    //         [  0,   0, -10],
    //         [ 10,   0, -10],
    //         [  0,  10, -10],
    //         [ 10,  10, -10],
    //         [  0,   0,   0],
    //         [ 10,   0,   0],
    //         [  0,  10,   0],
    //         [ 10,  10,   0],
    //     ],
    // },
];

type Story = StoryObj<AnimatedParticleLayerProps>;
const meta: Meta<AnimatedParticleLayerProps> = {
    // component: AnimatedParticleLayer,
    title: "CustomDeckGlLayers/AnimatedParticleLayer",
    render: (args) => {
        const layers = [
            new AxesLayer({
                id: "axes",
                bounds: [10, 10, 10, -10, -10, -10],
                ZIncreasingDownwards: false,
            }),

            new GridCellLayer({
                id: "grid-cells",
                data: GRID_CELLS as GridCell[],
            }),

            new AnimatedParticleLayer({
                ...args,
                id: "animated-particle-layer",
                grid: GRID_CELLS as GridCell[],
                numParticles: 10_000,
                // numParticles: 10,

                paused: true,
                // visible: false,
            }),
        ];

        return (
            <div className="relative" style={{ width: "100%", height: "1000px" }}>
                <SubsurfaceViewer
                    id={"test"}
                    layers={layers}
                    views={{
                        layout: [1, 1],
                        viewports: [
                            {
                                id: "v1",
                                name: "v1",
                                viewType: OrbitView,
                                // target: [0, 0, 0],
                                zoom: 4.5,
                                rotationX: 20,
                                rotationOrbit: -30,
                            },
                        ],
                    }}
                />
            </div>
        );
    },
};

export default meta;

export const Default: Story = {};
// export const Default = Template.bind({});

// Default.args = {
//     particleCount: 1000,
//     particleSpeed: 1,
//     particleSize: 5,
//     color: [255, 0, 0, 255], // Red color
// };
