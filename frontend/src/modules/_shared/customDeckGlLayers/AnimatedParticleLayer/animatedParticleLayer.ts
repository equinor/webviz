/**
 * A layer that animates particles moving around a grid.
 */

import type { Color, DefaultProps, LayerContext, LayerProps, UpdateParameters } from "@deck.gl/core";
import { Layer, project32 } from "@deck.gl/core";
import type { RenderPass } from "@luma.gl/core";
import { Texture } from "@luma.gl/core";
import type { SwapBuffers, TextureImageData, DynamicTexture } from "@luma.gl/engine";
import { Model, Geometry, Swap, BufferTransform } from "@luma.gl/engine";
import { random } from "@luma.gl/shadertools";
import { max, min } from "lodash-es";

import { randomInteger } from "@framework/utils/numberUtils";

import type { GridCell } from "./types";
import { animatedCellParticleUniforms } from "./uniforms";

export type AnimatedParticleLayerProps = LayerProps & {
    numParticles: number;
    grid: GridCell[];
    color: Color;
    fps: number;

    // getVelocity: Accessor<TData, number[]>;
    paused: boolean;
};

const CELL_NEIGHBOR_INDEX_SIZE = 6;
const CELL_FACE_VELOCITY_SIZE = 6 * (3 + 1); // Buffer storage expects padding on vectors
const CELL_CORNER_SIZE = 8 * (3 + 1); // Buffer storage expects padding on vectors
const CELL_TOTAL_SIZE = CELL_NEIGHBOR_INDEX_SIZE + CELL_FACE_VELOCITY_SIZE + CELL_CORNER_SIZE;

export class AnimatedParticleLayer extends Layer<AnimatedParticleLayerProps> {
    static layerName = "AnimatedParticleLayer";
    static defaultProps: DefaultProps<AnimatedParticleLayerProps> = {
        numParticles: 1_000,
        grid: [],
        color: [255, 0, 0, 255],
        fps: 60,
        paused: false,
    };

    declare state: {
        // TODO: Clean up state objects
        particleCount: number;
        particles: Float32Array[];

        dataLoaded: boolean;

        //
        model: Model;
        positionBuffers: SwapBuffers;
        cellIndexBuffers: SwapBuffers;
        transform: BufferTransform;
        stepRequested: boolean;
        // gridBuffer: Buffer;
        gridCornerPosTexture: DynamicTexture;
        gridTextureSize: number;
    };

    getNumInstances(): number {
        return this.props.numParticles;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    initializeState(_context: LayerContext): void {
        this.setState({ dataLoaded: false });

        this.createGridCellBuffers();
        this.setupTransformFeedback();

        // ! Expects other buffers, keep last
        this.setupParticles();
    }

    override getShaders(shaders?: any) {
        return super.getShaders({
            ...shaders,
            modules: [project32, /*random,*/ animatedCellParticleUniforms],
        });
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    updateState(_params: UpdateParameters<AnimatedParticleLayer>): void {
        // TODO
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    finalizeState(_context: LayerContext): void {
        // TODO

        this.state.model?.destroy();
        this.state.transform?.destroy();
        this.state.positionBuffers?.destroy();
        this.state.cellIndexBuffers?.destroy();
        // this.state.gridBuffer?.
        this.state.gridCornerPosTexture.destroy();
    }

    draw(opts: {
        renderPass: RenderPass;
        shaderModuleProps: any;
        uniforms: any;
        parameters: any;
        context: LayerContext;
    }): void {
        // TODO
        const { device } = opts.context;
        const { model, transform, positionBuffers, cellIndexBuffers } = this.state;
        const { shaderModuleProps = {} } = opts;

        if (!model) return;

        model.setAttributes({
            instancePositions: positionBuffers.current,
            instanceCellIndex: cellIndexBuffers.current,
        });

        model.setBindings({
            uGridPositionsTexture: this.state.gridCornerPosTexture,
        });

        model.shaderInputs.setProps({
            ...shaderModuleProps,
            animatedCellParticles: {
                gridTextureSize: this.state.gridTextureSize,
                // gridTexture: this.state.gridCornerPosTexture,
            },
        });

        // model.setBindings()
        // model.setBindings({

        // })

        model.draw(opts.renderPass);

        this.requestStep();
    }

    private createGridCellBuffers() {
        const { device } = this.context;
        const { grid } = this.props;

        // const buffer = new Float32Array(this.props.grid.length * CELL_TOTAL_SIZE);

        // const cornerPositions = [
        //     new Float32Array(this.props.grid.length * 3),
        //     new Float32Array(this.props.grid.length * 3),
        //     new Float32Array(this.props.grid.length * 3),
        //     new Float32Array(this.props.grid.length * 3),
        //     new Float32Array(this.props.grid.length * 3),
        //     new Float32Array(this.props.grid.length * 3),
        //     new Float32Array(this.props.grid.length * 3),
        //     new Float32Array(this.props.grid.length * 3),
        // ];

        // TODO: Use 1 corner for now for testing
        const safeGridLength = Math.max(grid.length, 1);
        // Each pixel stores three values: R=X,G=Y,B=Z,A=_
        const gridTextureSize = Math.ceil(Math.sqrt(safeGridLength));

        const cellPositionTextureData = new Float32Array(gridTextureSize * gridTextureSize * 4);
        cellPositionTextureData.fill(0);

        for (let i = 0; i < this.props.grid.length; i++) {
            const cell = this.props.grid[i];
            const offset = i * 4;

            // TODO: only doing the first corner for experiment
            // prettier-ignore
            cellPositionTextureData[offset]     = cell.corners[0][0];
            cellPositionTextureData[offset + 1] = cell.corners[0][1];
            cellPositionTextureData[offset + 2] = cell.corners[0][2];
            cellPositionTextureData[offset + 3] = 0; // padding
        }

        console.log("supports?", device.isTextureFormatSupported("rgba32float"), gridTextureSize);

        // TODO: Deprecated approach, move to dynamic-texture
        const cellCornerTexture = device.createTexture({
            format: "rgba32float",
            width: gridTextureSize,
            height: gridTextureSize,
            data: cellPositionTextureData,
        });

        // console.log(cellPositionTextureData);

        // const gridCornerPosTexture = new DynamicTexture(device, {
        //     mipmaps: false,
        //     dimension: "2d",
        //     id: "grid-corner-pos-texture",
        //     format: "rgba32float",
        //     data: {
        //         data: cellPositionTextureData,
        //         width: gridTextureWidth,
        //         height: gridTextureHeight,
        //     },
        // });

        // Flatten cell data structure to
        // for (let i = 0; i < this.props.grid.length; i++) {
        //     const cell = this.props.grid[i];

        //     const offset = i * CELL_TOTAL_SIZE;
        //     let localPos = 0;

        //     // Cell corners
        //     for (const corner of cell.corners) {
        //         buffer[offset + localPos++] = corner[0];
        //         buffer[offset + localPos++] = corner[1];
        //         buffer[offset + localPos++] = corner[2];
        //         localPos++; // Padding
        //     }

        //     // Cell corners
        //     for (const velocity of cell.faceVelocities) {
        //         buffer[offset + localPos++] = velocity[0];
        //         buffer[offset + localPos++] = velocity[1];
        //         buffer[offset + localPos++] = velocity[2];
        //         localPos++; // Padding
        //     }

        //     for (const neighbor of cell.neighborIndices) {
        //         buffer[offset + localPos++] = neighbor;
        //     }
        // }

        // const cornerPosTex = new DynamicTexture(device, {
        //     dimension: "3d",
        //     depth: 8,
        //     // format: "rgba32float",
        //     data: cornerPositions.map<TextureImageData>((cornerData) => ({
        //         data: cornerData,
        //         width: Math.ceil(Math.sqrt(this.props.grid.length * 3)),
        //         height: Math.ceil(Math.sqrt(this.props.grid.length * 3)),
        //         // format: "rgba32float",
        //     })),
        // });

        // console.log(cornerPosTex.setTextureCubeArrayData);

        // this.setState({ gridBuffer: device.createBuffer(buffer) });
        this.setState({
            gridTextureSize: gridTextureSize,
            // gridCornerPosTexture: gridCornerPosTexture,
            gridCornerPosTexture: cellCornerTexture,
        });
    }

    private setupParticles() {
        const device = this.context.device;

        const model = new Model(device, {
            ...this.getShaders(),
            id: `${this.props.id}-render`,
            topology: "point-list",
            vs: vertexShader,
            fs: fragmentShader,
            vertexCount: 1,
            isInstanced: true,
            bufferLayout: [
                { name: "instancePositions", format: "float32x3", stepMode: "instance" },
                { name: "instanceCellIndex", format: "sint32", stepMode: "instance" },
            ],

            // bindings: {
            //     uGridPositionsTexture: this.state.gridCornerPosTexture,
            // },

            // shaderLayout: {
            //     bindings: [
            //         {
            //             // sampleType: "sint",
            //             viewDimension: "2d",
            //             type: "texture",
            //             name: "uGridPositionsTexture",

            //             group: 3,
            //             location: 1,
            //         },
            //     ],
            // uniforms: [
            //     { uGridTextureSize: this.state.gridCornerPosTexture },
            //     { uGridPositionsTexture: this.state.gridCornerPosTexture },
            // ],
            // bindings: [
            //     { type: ""}
            // ]
            // },

            // TODO: webGL only, should migrate to bindings
            // uniforms: {
            //     uGridTextureSize: this.state.gridCornerPosTexture,
            //     uGridPositionsTexture: this.state.gridCornerPosTexture,
            // },

            // bindings: {
            //     uGridBuffer: this.state.gridBuffer,
            // },
            // shaderLayout: [
            //     {bindings: }
            // ],

            // bindings

            // instanceCount: 10,
            // vertexCount:1

            // instanceCount: 1,
            // isInstanced: true,
            // TODO: clean up these
            // shaderInputs: new ShaderInputs({
            //     grid: {name: "grid", }
            //     // grid: gridBuffer,
            // }),

            // instanceCount: this.props.numParticles,
            // bindings: {
            //     grid: gridBuffer,
            // },
            // uniforms: { grid: gridBuffer },
            // bindings: { gridData: gridBuffer },
            // parameters: {
            //     depthWriteEnabled: false,
            //     depthCompare: "always",
            //     blend: true,
            //     blendColorOperation: "add",
            //     blendColorSrcFactor: "src-alpha",
            //     blendColorDstFactor: "one",
            //     blendAlphaOperation: "add",
            //     blendAlphaSrcFactor: "one",
            //     blendAlphaDstFactor: "one",
            // },
        });

        this.setState({
            model: model,
        });

        return {
            model,
        };
    }

    private setupTransformFeedback() {
        const { device } = this.context;
        const { numParticles } = this.props;

        // const cellIndex = new Float32Array(numParticles);
        const cellIndex = new Int32Array(numParticles);
        const startPositions = new Float32Array(numParticles * 3);

        for (let i = 0; i < numParticles; i++) {
            cellIndex[i] = randomInteger(0, this.props.grid.length);

            startPositions[0 + i * 3] = Math.random(); // u
            startPositions[1 + i * 3] = Math.random(); // v
            startPositions[2 + i * 3] = Math.random(); // w

            // startPositions[0 + i * 3] = Math.random() * 20 - 10; // x
            // startPositions[1 + i * 3] = Math.random() * 20 - 10; // y
            // startPositions[2 + i * 3] = Math.random() * 20 - 10; // z
        }

        const positionBuffers = new Swap({
            current: device.createBuffer(startPositions),
            next: device.createBuffer(new Float32Array(numParticles * 3)),
        });

        const cellIndexBuffers = new Swap({
            current: device.createBuffer(cellIndex),
            next: device.createBuffer(new Int32Array(numParticles)),
        });

        const transform = new BufferTransform(device, {
            vs: transformVertexShader,
            vertexCount: 1,
            instanceCount: this.props.numParticles,
            bufferLayout: [
                { name: "oldPositions", format: "float32x3", stepMode: "instance" },
                { name: "oldCellIndex", format: "sint32", stepMode: "instance" },
            ],
            outputs: ["newPositions", "newCellIndex"],
        });

        this.setState({
            positionBuffers: positionBuffers,
            cellIndexBuffers: cellIndexBuffers,
            transform: transform,
        });
    }

    private runTransform() {
        const { device } = this.context;
        const { model, transform, positionBuffers, cellIndexBuffers } = this.state;

        transform.run({
            discard: true,
            inputBuffers: { oldPositions: positionBuffers.current, oldCellIndex: cellIndexBuffers.current },
            outputBuffers: { newPositions: positionBuffers.next, newCellIndex: cellIndexBuffers.next },
        });

        positionBuffers.swap();
    }

    requestStep() {
        const { stepRequested } = this.state;
        if (stepRequested) {
            return;
        }

        this.state.stepRequested = true;
        setTimeout(() => {
            this.step();
            this.state.stepRequested = false;
        }, 1000 / this.props.fps);
    }

    step() {
        if (this.props.paused) return;

        this.runTransform();

        this.setNeedsRedraw();
    }
}

// const gridCellUniformBlock = /*glsl*/ `
// struct GridCell {
//     vec3 corners[8]
//     vec3 face_velocities[6]
//     int neighbor_indices[6]
// }
// `;

// Partially copied from src/modules/_shared/customDeckGlLayers/WellsLayer/_private/shaders/vertexShader.glsl
const vertexShader = /*glsl*/ `\
#version 300 es
#define SHADER_NAME animated-particle-vertex-shader

precision highp float;

in vec3 instancePositions;
in int instanceCellIndex;

flat out vec3 DEB_particle_color;

uniform sampler2D uGridPositionsTexture;

void main() {
    // vec3 instancePosition = vec3(0.0);
    vec3 posLow = vec3(0.0, 0.0, 0.0);
    // vec3 offset = vec3(0.0, 0.0, 0.0);

    geometry.worldPosition = instancePositions;

    float gridTexturePosU = float(mod(float(instanceCellIndex), float(animatedCellParticles.gridTextureSize + 1)));
    // float gridTexturePosV = float(animatedCellParticles.gridTextureSize / instanceCellIndex);

    // float gridTexturePosU = 1.0; 
    float gridTexturePosV = 0.0;

    // vec2 gridSampleUv = vec2(
    //     float(instanceCellIndex % int(animatedCellParticles.gridTextureWidth)) / animatedCellParticles.gridTextureWidth,
    //     float(instanceCellIndex / int(animatedCellParticles.gridTextureWidth)) / animatedCellParticles.gridTextureHeight
    // );

    vec3 activeGridCellCornerPos = texture(uGridPositionsTexture, vec2(gridTexturePosU, gridTexturePosV)).rgb;
    
    // Get position from texture
    // ivec2 textureSize = textureSize(uGridPositionsTexture, 0);
    // int cellIndex = instanceCellIndex;
    // int x = cellIndex % textureSize.x;
    // int y = cellIndex / textureSize.x;
    
    // vec4 cornerPos = texelFetch(uGridPositionsTexture, ivec2(x, y), 0);

    // vec4 cornerRGBA = texture(uGridPositionsTexture, vec2(0,0));
    // vec3 cornerXYZ = cornerRGBA.xyz;

    gl_Position = project_position_to_clipspace(activeGridCellCornerPos.xyz, posLow, instancePositions, geometry.position);

    // gl_Position = project_position_to_clipspace(instancePositions, posLow, offset, geometry.position);
    gl_PointSize = 8.0; // Adjust point size as needed


    DECKGL_FILTER_GL_POSITION(gl_Position, geometry);
    
    vec4 color = vec4(0.0f);

    
    DECKGL_FILTER_COLOR(color, geometry);

    if        (instanceCellIndex == 0) {
        DEB_particle_color = vec3(1.0, 0.0, 0.0); // Red
    } else if (instanceCellIndex == 1) {
        DEB_particle_color = vec3(0.0, 1.0, 0.0); // Green
    } else if (instanceCellIndex == 2) {
        DEB_particle_color = vec3(0.0, 0.0, 1.0); // Blue
    } else if (instanceCellIndex == 3) {
        DEB_particle_color = vec3(1.0, 1.0, 0.0); // Yellow
    } else if (instanceCellIndex == 4) {
        DEB_particle_color = vec3(1.0, 0.0, 1.0); // Magenta
    } else if (instanceCellIndex == 5) {
        DEB_particle_color = vec3(0.0, 1.0, 1.0); // Cyan
    } else if (instanceCellIndex == 6) {
        DEB_particle_color = vec3(1.0, 1.0, 1.0); // White
    } else if (instanceCellIndex == 7) {
        DEB_particle_color = vec3(0.5, 0.5, 0.5); // Gray
    }
}
`;

const fragmentShader = /*glsl*/ `\
#version 300 es
#define SHADER_NAME animated-particle-fragment-shader

precision highp float;

flat in vec3 DEB_particle_color;

out vec4 fragColor;

void main() {

    // Calculate distance from the center of the point
    vec2 center = gl_PointCoord - vec2(0.33);
    float distance = length(center);

    // Discard fragments outside the circle
    if (distance > 0.33) {
        discard;
    }

    // fragColor = vec4(1.0, 0.0, 0.0, 1.0); // Red color with full opacity

    // TODO: 
    fragColor = vec4(DEB_particle_color, 1.0);
}
`;

const transformVertexShader = /*glsl*/ `\
#version 300 es
#define SHADER_NAME animated-particle-transform-vertex-shader
#define POSITIONS_LOCATION 0

// layout(location = POSITIONS_LOCATION) in vec3 oldPositions;

in  vec3 oldPositions;
out vec3 newPositions;

in  int  oldCellIndex;
flat out int newCellIndex;

void main() {
    // newPositions = oldPositions;
    float xPos = oldPositions.x + 0.1;

    if (xPos > 10.0) {
        xPos = -10.0;
    }

    // TODO: actually compute values
    newPositions = vec3(xPos, oldPositions.y, oldPositions.z);
    newCellIndex = oldCellIndex;

    // newPositions = vec3(0., 0., 0.);
    // newPositions = vec3(10.0);
    // gl_Position = vec4(newPositions, 1.0);
}
`;
