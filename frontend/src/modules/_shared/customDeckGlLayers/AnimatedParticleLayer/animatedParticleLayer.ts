/**
 * A layer that animates particles moving around a grid.
 */

import type { Color, DefaultProps, LayerContext, LayerProps, UpdateParameters } from "@deck.gl/core";
import { Layer, project32 } from "@deck.gl/core";
import type { RenderPass, TypedArray } from "@luma.gl/core";
import type { DynamicTextureProps, SwapBuffers } from "@luma.gl/engine";
import { DynamicTexture, Model, Swap, BufferTransform } from "@luma.gl/engine";
import { range } from "lodash-es";

import { randomInteger } from "@framework/utils/numberUtils";

import fragmentShader from "./_shaders/particle_frag.glsl?raw";
import transformVertexShader from "./_shaders/particle_transform_vert.glsl?raw";
import vertexShader from "./_shaders/particle_vert.glsl?raw";
import type { GridCell } from "./types";
import type { AnimatedCellParticleUniformProps } from "./uniforms";
import { animatedCellParticleUniforms } from "./uniforms";

export type AnimatedParticleLayerProps = LayerProps & {
    numParticles: number;
    grid: GridCell[];
    color: Color;
    fps: number;
    paused: boolean;
};

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
        particles: Float32Array[];
        stepRequested: boolean;
        gridTextureSize: number;

        // Shader resources
        // ! Remember to destroy these in finalizeState!
        model: Model;
        transform: BufferTransform;
        positionBuffers: SwapBuffers;
        cellIndexBuffers: SwapBuffers;
        gridCornerPosTexture: DynamicTexture;
        gridFaceVelocitiesTexture: DynamicTexture;
        gridNeighborIndexTexture: DynamicTexture;
    };

    getNumInstances(): number {
        return this.props.numParticles;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    initializeState(_context: LayerContext): void {
        this.createGridCellBuffers();
        this.setupTransformFeedback();

        // ! Expects other buffers, keep last
        this.setupParticles();
    }

    override getShaders(shaders?: any) {
        return super.getShaders({
            ...shaders,
            modules: [project32, animatedCellParticleUniforms],
        });
    }

    updateState({ props, oldProps }: UpdateParameters<AnimatedParticleLayer>): void {
        // TODO

        if (props.paused !== oldProps.paused) {
            this.setState({ isPaused: props.paused });
            if (!props.paused) this.requestStep();
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    finalizeState(_context: LayerContext): void {
        // TODO

        this.state.model?.destroy();
        this.state.transform?.destroy();
        this.state.positionBuffers?.destroy();
        this.state.cellIndexBuffers?.destroy();
        this.state.gridCornerPosTexture.destroy();
        this.state.gridFaceVelocitiesTexture.destroy();
        this.state.gridNeighborIndexTexture.destroy();
    }

    private getParticleModuleProps(): AnimatedCellParticleUniformProps {
        return {
            gridTextureSize: this.state.gridTextureSize,
            maxCellIndex: this.props.grid.length - 1,
            deltaTime: 0.016, // TODO: make this actually based on true delta time
            maxAge: 10,
        };
    }

    draw(opts: {
        renderPass: RenderPass;
        shaderModuleProps: any;
        uniforms: any;
        parameters: any;
        context: LayerContext;
    }): void {
        const { model, positionBuffers, cellIndexBuffers } = this.state;
        const { shaderModuleProps = {} } = opts;

        if (!model) return;

        model.setAttributes({
            instancePositions: positionBuffers.current,
            instanceCellIndex: cellIndexBuffers.current,
        });

        model.setBindings({
            uGridPositionsTexture: this.state.gridCornerPosTexture,
        });

        //

        model.shaderInputs.setProps({
            ...shaderModuleProps,
            animatedCellParticles: this.getParticleModuleProps(),
        });

        model.draw(opts.renderPass);

        if (!this.props.paused) {
            this.requestStep();
        }
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

    private runTransform() {
        const { transform, positionBuffers, cellIndexBuffers } = this.state;

        transform.model.setBindings({
            uGridPositionsTexture: this.state.gridCornerPosTexture,
            uGridVelocityTexture: this.state.gridFaceVelocitiesTexture,
            uGridNeighborIndexTexture: this.state.gridNeighborIndexTexture,
        });

        transform.model.shaderInputs.setProps({
            animatedCellParticles: this.getParticleModuleProps(),
        });

        transform.run({
            discard: true,
            inputBuffers: { oldPositions: positionBuffers.current, oldCellIndex: cellIndexBuffers.current },
            outputBuffers: { newPositions: positionBuffers.next, newCellIndex: cellIndexBuffers.next },
        });

        cellIndexBuffers.swap();
        positionBuffers.swap();
    }

    private createGridCellBuffers() {
        const { device } = this.context;
        const { grid } = this.props;

        // Each pixel stores three values: R=X,G=Y,B=Z,A=_
        const safeGridLength = Math.max(grid.length, 1);
        const gridTextureSize = Math.ceil(Math.sqrt(safeGridLength));

        const cellPositionTextureData: TypedArray[] = range(0, 8).map(() => {
            const slice = new Float32Array(gridTextureSize * gridTextureSize * 4);
            slice.fill(0);
            return slice;
        });

        const faceVelocityTextureData: TypedArray[] = range(0, 6).map(() => {
            const slice = new Float32Array(gridTextureSize * gridTextureSize * 4);
            slice.fill(0);
            return slice;
        });

        const cellNeighborIndexTextureData: TypedArray[] = range(0, 2).map(() => {
            const slice = new Int32Array(gridTextureSize * gridTextureSize * 4);
            slice.fill(-1);
            return slice;
        });

        for (let i = 0; i < this.props.grid.length; i++) {
            const cell = this.props.grid[i];
            const offset = i * 4;

            // Store position values for each corner
            for (let i = 0; i < 8; i++) {
                cellPositionTextureData[i][offset] = cell.corners[i][0];
                cellPositionTextureData[i][offset + 1] = cell.corners[i][1];
                cellPositionTextureData[i][offset + 2] = cell.corners[i][2];
                cellPositionTextureData[i][offset + 3] = 0; // padding
            }

            // Store velocities for face
            // TODO: It should arguably be fairly trivial to go to corner velocities instead
            for (let i = 0; i < 6; i++) {
                faceVelocityTextureData[i][offset] = cell.faceVelocities[i][0];
                faceVelocityTextureData[i][offset + 1] = cell.faceVelocities[i][1];
                faceVelocityTextureData[i][offset + 2] = cell.faceVelocities[i][2];
                faceVelocityTextureData[i][offset + 3] = 0; // padding
            }

            for (let i = 0; i < 2; i++) {
                cellNeighborIndexTextureData[i][offset] = cell.neighborIndices[i];
                cellNeighborIndexTextureData[i][offset + 1] = cell.neighborIndices[i + 1];
                cellNeighborIndexTextureData[i][offset + 2] = cell.neighborIndices[i + 2];
                cellNeighborIndexTextureData[i][offset + 3] = 0; // padding
            }
        }

        const sharedGridDataTextureProps: Partial<DynamicTextureProps> = {
            mipmaps: false,
            width: gridTextureSize,
            height: gridTextureSize,
            sampler: {
                minFilter: "nearest",
                magFilter: "nearest",
                type: "color-sampler",
            },
        };

        const cellCornerTexture = new DynamicTexture(device, {
            ...sharedGridDataTextureProps,
            dimension: "2d-array",
            depth: 8,
            data: cellPositionTextureData.map((s) => ({
                format: "rgba32float",
                width: gridTextureSize,
                height: gridTextureSize,
                data: s,
            })),
        });

        const cellVelocitiesTexture = new DynamicTexture(device, {
            ...sharedGridDataTextureProps,
            dimension: "2d-array",
            depth: 6,
            data: faceVelocityTextureData.map((s) => ({
                format: "rgba32float",
                width: gridTextureSize,
                height: gridTextureSize,
                data: s,
            })),
        });

        const cellNeighborIndexTexture = new DynamicTexture(device, {
            ...sharedGridDataTextureProps,
            dimension: "2d-array",
            depth: 2,
            format: "rgba32sint",
            data: cellNeighborIndexTextureData.map((s) => ({
                format: "rgba32sint",
                width: gridTextureSize,
                height: gridTextureSize,
                data: s,
            })),
        });

        this.setState({
            gridTextureSize: gridTextureSize,
            gridCornerPosTexture: cellCornerTexture,
            gridFaceVelocitiesTexture: cellVelocitiesTexture,
            gridNeighborIndexTexture: cellNeighborIndexTexture,
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

        const shaderModules = this.getShaders().modules;

        const cellIndex = new Int32Array(numParticles);
        const startPositions = new Float32Array(numParticles * 3);

        for (let i = 0; i < numParticles; i++) {
            cellIndex[i] = randomInteger(0, this.props.grid.length);

            startPositions[0 + i * 3] = Math.random(); // u
            startPositions[1 + i * 3] = Math.random(); // v
            startPositions[2 + i * 3] = Math.random(); // w
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
            ...this.getShaders(),

            vs: transformVertexShader,
            vertexCount: 1,
            instanceCount: this.props.numParticles,
            bufferLayout: [
                { name: "oldPositions", format: "float32x3", stepMode: "instance" },
                { name: "oldCellIndex", format: "sint32", stepMode: "instance" },
            ],
            outputs: ["newPositions", "newCellIndex"],
            modules: shaderModules,
        });

        this.setState({
            positionBuffers: positionBuffers,
            cellIndexBuffers: cellIndexBuffers,
            transform: transform,
        });
    }
}
