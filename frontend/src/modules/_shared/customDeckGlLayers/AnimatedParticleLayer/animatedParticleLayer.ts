/**
 * A layer that animates particles moving around a grid.
 */

import type {
    Accessor,
    AccessorContext,
    Color,
    DefaultProps,
    LayerContext,
    LayerProps,
    Position,
    UpdateParameters,
} from "@deck.gl/core";
import { Layer, project32 } from "@deck.gl/core";
import type { RenderPass, TypedArray, Buffer } from "@luma.gl/core";
import type { DynamicTextureProps, SwapBuffers } from "@luma.gl/engine";
import { DynamicTexture, Model, Swap, BufferTransform } from "@luma.gl/engine";
import { range } from "lodash-es";

import { applyAccessor } from "@framework/utils/deckgl";
import { randomInteger } from "@framework/utils/numberUtils";

import fragmentShader from "./_shaders/particle_frag.glsl?raw";
import transformVertexShader from "./_shaders/particle_transform_vert.glsl?raw";
import vertexShader from "./_shaders/particle_vert.glsl?raw";
import type { FaceData, GridCell } from "./types";
import type { AnimatedCellParticleUniformProps } from "./uniforms";
import { animatedCellParticleUniforms } from "./uniforms";
import { flattenFaceData, makeFaceData } from "./utils";

export type AnimatedParticleLayerProps<TData = GridCell> = LayerProps & {
    data: TData[];
    numParticles: number;
    color: Color;
    fps: number;
    paused: boolean;
    maxAge: number;
    size: number;
    velocityScale: number;
    flat: boolean;
    // Accessors
    getCorners: Accessor<TData, Position[]>;
    getFaceVelocities: Accessor<TData, FaceData<number[]>>;
    getNeighborCells: Accessor<TData, FaceData<number>>;
};

export class AnimatedParticleLayer<TData = GridCell> extends Layer<AnimatedParticleLayerProps<TData>> {
    static layerName = "AnimatedParticleLayer";
    static defaultProps: DefaultProps<AnimatedParticleLayerProps> = {
        numParticles: 1_000,
        data: [],
        color: [255, 0, 0, 255],
        fps: 60,
        maxAge: 10,
        paused: false,
        size: 12,
        velocityScale: 1,
        flat: false,
        getCorners: { type: "accessor", value: (d: any) => d.corners! },
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
        particles: Float32Array[];
        stepRequested: boolean;
        gridTextureSize: number;

        // Shader resources
        // ! Remember to destroy these in finalizeState!
        model: Model;
        transform: BufferTransform;
        positionBuffers: SwapBuffers;
        cellIndexBuffers: SwapBuffers;
        ageBuffers: SwapBuffers;
        gridCornerPosTexture: DynamicTexture;
        gridFaceVelocitiesTexture: DynamicTexture;
        gridNeighborIndexTexture: DynamicTexture;

        // TODO: Temp test without randomization
        initialStartPositionBuffer: Buffer;
        initialStartCellIndexBuffer: Buffer;

        //
        dataLoaded: boolean;
        lastTimeMs: number;
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

        this.setState({ dataLoaded: true });
    }

    override getShaders(shaders?: any) {
        return super.getShaders({
            ...shaders,
            modules: [project32, animatedCellParticleUniforms],
        });
    }

    updateState({ props, oldProps }: UpdateParameters<AnimatedParticleLayer<TData>>): void {
        // TODO

        if (props.paused !== oldProps.paused) {
            this.setState({ isPaused: props.paused });
            if (!props.paused) {
                this.setState({ lastTimeMs: this.context.timeline.getTime() });
                this.requestStep();
            }
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    finalizeState(_context: LayerContext): void {
        // TODO

        this.state.model?.destroy();
        this.state.transform?.destroy();
        this.state.positionBuffers?.destroy();
        this.state.cellIndexBuffers?.destroy();
        this.state.ageBuffers?.destroy();
        this.state.gridCornerPosTexture.destroy();
        this.state.gridFaceVelocitiesTexture.destroy();
        this.state.gridNeighborIndexTexture.destroy();

        this.setState({ dataLoaded: false });
    }

    private getParticleModuleProps(includeDeltaTime = false): AnimatedCellParticleUniformProps {
        let deltaTime = 0;
        if (includeDeltaTime) {
            // Compute delta-time
            const currentTimeMs = this.context.timeline.getTime();
            const previousTimeMs = this.state.lastTimeMs ?? 0;

            deltaTime = (currentTimeMs - previousTimeMs) / 1000;

            this.setState({ lastTimeMs: currentTimeMs });
        }

        return {
            gridTextureSize: this.state.gridTextureSize,
            maxCellIndex: this.props.data.length - 1,
            maxAge: this.props.maxAge,
            deltaTime: deltaTime,
            size: this.props.size,
            velocityScale: this.props.velocityScale,
        };
    }

    draw(opts: {
        renderPass: RenderPass;
        shaderModuleProps: any;
        uniforms: any;
        parameters: any;
        context: LayerContext;
    }): void {
        const { model, positionBuffers, cellIndexBuffers, ageBuffers } = this.state;
        const { shaderModuleProps = {} } = opts;

        if (!model || !this.state.dataLoaded) return;

        model.setAttributes({
            instancePositions: positionBuffers.current,
            instanceCellIndex: cellIndexBuffers.current,
            instanceAge: ageBuffers.current,
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
        if (!this.state.dataLoaded) return;

        const { transform, positionBuffers, cellIndexBuffers, ageBuffers } = this.state;

        transform.model.setAttributes({
            instanceStartPositions: this.state.initialStartPositionBuffer,
            instanceStartCellIndex: this.state.initialStartCellIndexBuffer,
        });

        transform.model.setBindings({
            uGridPositionsTexture: this.state.gridCornerPosTexture,
            uGridVelocityTexture: this.state.gridFaceVelocitiesTexture,
            uGridNeighborIndexTexture: this.state.gridNeighborIndexTexture,
        });

        transform.model.shaderInputs.setProps({
            animatedCellParticles: this.getParticleModuleProps(true),
        });

        transform.run({
            discard: true,
            inputBuffers: {
                oldPositions: positionBuffers.current,
                oldCellIndex: cellIndexBuffers.current,
                oldAge: ageBuffers.current,
            },
            outputBuffers: {
                newPositions: positionBuffers.next,
                newCellIndex: cellIndexBuffers.next,
                newAge: ageBuffers.next,
            },
        });

        cellIndexBuffers.swap();
        positionBuffers.swap();
        ageBuffers.swap();
    }

    private createGridCellBuffers() {
        const { device } = this.context;
        const { data: grid } = this.props;

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

        for (let i = 0; i < this.props.data.length; i++) {
            const cell = this.props.data[i];
            const accessorContext: AccessorContext<TData> = { index: i, data: this.props.data, target: [] };

            const offset = i * 4;

            const corners = applyAccessor(this.props.getCorners, cell, accessorContext);
            const velocities = applyAccessor(this.props.getFaceVelocities, cell, accessorContext);
            const neighbors = applyAccessor(this.props.getNeighborCells, cell, accessorContext);

            const velocitiesFlattened = flattenFaceData(velocities);
            const neighborsFlattened = flattenFaceData(neighbors);

            // Store position values for each corner
            for (let i = 0; i < 8; i++) {
                cellPositionTextureData[i][offset] = corners[i][0];
                cellPositionTextureData[i][offset + 1] = corners[i][1];
                cellPositionTextureData[i][offset + 2] = corners[i][2] ?? 0;
                cellPositionTextureData[i][offset + 3] = 0; // padding
            }

            // Store velocities for face
            // TODO: It should arguably be fairly trivial to go to corner velocities instead
            for (let i = 0; i < 6; i++) {
                faceVelocityTextureData[i][offset] = velocitiesFlattened[i][0];
                faceVelocityTextureData[i][offset + 1] = velocitiesFlattened[i][1];
                faceVelocityTextureData[i][offset + 2] = velocitiesFlattened[i][2];
                faceVelocityTextureData[i][offset + 3] = 0; // padding
            }

            for (let i = 0; i < 2; i++) {
                cellNeighborIndexTextureData[i][offset] = neighborsFlattened[i * 2];
                cellNeighborIndexTextureData[i][offset + 1] = neighborsFlattened[i * 2 + 1];
                cellNeighborIndexTextureData[i][offset + 2] = neighborsFlattened[i * 2 + 2];
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
                { name: "instanceAge", format: "float32", stepMode: "instance" },

                { name: "instanceStartPositions", format: "float32x3", stepMode: "instance" },
                { name: "instanceStartCellIndex", format: "sint32", stepMode: "instance" },
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
        const age = new Float32Array(numParticles);
        const startPositions = new Float32Array(numParticles * 3);

        for (let i = 0; i < numParticles; i++) {
            cellIndex[i] = randomInteger(0, this.props.data.length);

            // Randomize the starting age
            age[i] = Math.random() * this.props.maxAge;

            // Randomize starting positions
            startPositions[0 + i * 3] = Math.random(); // u
            startPositions[1 + i * 3] = Math.random(); // v
            if (this.props.flat) {
                startPositions[2 + i * 3] = 0; // w
            } else {
                startPositions[2 + i * 3] = Math.random(); // w
            }
        }

        /**
         * Potential TODO: Right now, we'll have dead particles return to their initial grid and position.
         * It seems that the more standard approach is to have particles respawn completely random. I *believe*
         * this is to avoid places with much movement becoming empty, and to avoid visible "lines" in the
         * movement. Resetting looks fine enough, but we should also see how it looks with proper randomness
         */
        const initPosition = device.createBuffer(startPositions);
        const initGridCell = device.createBuffer(cellIndex);
        this.setState({
            initialStartPositionBuffer: initPosition,
            initialStartCellIndexBuffer: initGridCell,
        });

        // Create transformation buffers
        const positionBuffers = new Swap({
            current: device.createBuffer(startPositions),
            next: device.createBuffer(new Float32Array(numParticles * 3)),
        });

        const cellIndexBuffers = new Swap({
            current: device.createBuffer(cellIndex),
            next: device.createBuffer(new Int32Array(numParticles)),
        });

        const ageBuffers = new Swap({
            current: device.createBuffer(age),
            next: device.createBuffer(new Float32Array(numParticles)),
        });

        const transform = new BufferTransform(device, {
            ...this.getShaders(),

            vs: transformVertexShader,
            vertexCount: 1,
            instanceCount: this.props.numParticles,
            bufferLayout: [
                { name: "oldPositions", format: "float32x3", stepMode: "instance" },
                { name: "oldCellIndex", format: "sint32", stepMode: "instance" },
                { name: "oldAge", format: "float32", stepMode: "instance" },

                { name: "instanceStartPositions", format: "float32x3", stepMode: "instance" },
                { name: "instanceStartCellIndex", format: "sint32", stepMode: "instance" },
            ],
            outputs: ["newPositions", "newCellIndex", "newAge"],
            modules: shaderModules,
        });

        this.setState({
            positionBuffers: positionBuffers,
            cellIndexBuffers: cellIndexBuffers,
            ageBuffers: ageBuffers,

            transform: transform,
        });
    }
}
